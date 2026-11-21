import type { Item, Snapshot } from '../src/protocol.ts'
import type { FavorDefinition, ResidentDefinition } from '../src/residents/definition.ts'
import { activeFavor, isCustom, openOffer, pendingReport, recordFor, stagingFavor, wantsCargo } from '../src/residents/favors.ts'
import type { ResidentAction } from '../src/residents/interactions.ts'
import { breakPromise, keepFavor } from '../src/residents/trust.ts'
import type { createCargoPhysics } from '../src/simulation/cargo.ts'
import { crateStarts, type Point } from '../src/world.ts'
import type { CrewMember, CrewNotice } from './crew.ts'
import type { InteractionHandlers } from './interactions.ts'

// Resident-specific behavior: talking to a resident by id, and a favor's own world changes by favor id.
interface Hooks {
  talk?: Partial<Record<string, (member: CrewMember) => void>>
  accepted?: Partial<Record<string, () => void>>
  kept?: Partial<Record<string, () => void>>
}

// Host side of every resident. The interaction layer has already checked the resident is in reach and the
// choice is still open, so a stale or simultaneous request never reaches here. Favors are crew-wide.
export function createResidents(state: Snapshot, registry: readonly ResidentDefinition[], physics: Pick<ReturnType<typeof createCargoPhysics>, 'relocate'>, notifyCrew: (message: CrewNotice) => void, hooks: Hooks = {}, checkpoint?: () => void) {
  function keep(resident: ResidentDefinition, favor: FavorDefinition) {
    const receipt = keepFavor(state, resident, favor)
    if (!receipt) return false
    hooks.kept?.[favor.id]?.()
    checkpoint?.()
    notifyCrew({ type: 'favor-pay', ...receipt })
    return true
  }

  // The crew's word on checked work. An honest "it still catches" changes nothing and costs nothing. Saying it
  // is sound keeps the favor when the last check was sound, and breaks the promise when the crew saw a fault.
  function report(member: CrewMember, subject: number, claim: 'sound' | 'fault') {
    const resident = registry[subject]
    const pending = pendingReport(resident, state)
    if (!pending) return
    const base = { type: 'favor-report' as const, resident: resident.id, favor: pending.favor.id, playerId: member.player.id }
    if (claim === 'fault') return notifyCrew({ ...base, result: 'honest', trust: 0 })
    if (pending.checked === 'sound') return keep(resident, pending.favor)
    const lost = breakPromise(state, resident, pending.favor)
    if (lost === null) return
    checkpoint?.()
    notifyCrew({ ...base, result: 'broken', trust: -lost })
  }

  function talk(member: CrewMember, subject: number) {
    const resident = registry[subject]
    hooks.talk?.[resident.id]?.(member)
    member.notify?.({ type: 'resident-chat', resident: resident.id })
  }

  function accept(member: CrewMember, subject: number) {
    const resident = registry[subject]
    const offer = openOffer(resident, state)
    if (!offer || isCustom(offer)) return
    state.residents[resident.id] = { ...recordFor(state, resident), active: offer.id, checked: null }
    hooks.accepted?.[offer.id]?.()
    checkpoint?.()
    notifyCrew({ type: 'favor-accepted', resident: resident.id, favor: offer.id, playerId: member.player.id })
  }

  function handOver(member: CrewMember, subject: number) {
    const resident = registry[subject]
    const favor = activeFavor(resident, state)
    if (!favor || !('goods' in favor.kind)) return
    const { goods, quantity } = favor.kind
    if (member.player.goods[goods] < quantity) return
    member.player.goods[goods] -= quantity
    keep(resident, favor)
  }

  // A crate set down in a resident's bay completes their cargo favor and leaves the yard like a delivery.
  function stageCrate(item: Item, at: Point) {
    const staging = item.kind === 'crate' && stagingFavor(registry, state, at)
    if (!staging) return false
    item.delivered = true
    keep(staging.resident, staging.favor)
    return true
  }

  // A cargo favor needs a crate in the yard. Orders may have used them all, so one comes back when none is left.
  function tick() {
    if (!wantsCargo(registry, state)) return
    const crates = state.items.filter((item) => item.kind === 'crate')
    if (crates.some((crate) => !crate.delivered)) return
    const crate = crates[0]
    Object.assign(crate, { delivered: false, holder: null, heading: 0 })
    physics.relocate(crate, crateStarts[crate.id])
  }

  const interactions = {
    talk,
    'accept-favor': accept,
    'hand-over': handOver,
    'report-sound': (member, subject) => report(member, subject, 'sound'),
    'report-fault': (member, subject) => report(member, subject, 'fault'),
  } satisfies InteractionHandlers<ResidentAction>
  return { interactions, stageCrate, tick, keep }
}
