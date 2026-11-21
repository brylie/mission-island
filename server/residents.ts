import type { Item, Snapshot } from '../src/protocol.ts'
import type { FavorDefinition, ResidentDefinition } from '../src/residents/definition.ts'
import { activeFavor, isCustom, openOffer, recordFor, stagingFavor, wantsCargo } from '../src/residents/favors.ts'
import { keepFavor } from '../src/residents/trust.ts'
import type { createCargoPhysics } from '../src/simulation/cargo.ts'
import { crateStarts, type Point } from '../src/world.ts'
import type { CrewMember, CrewNotice } from './crew.ts'

type Hooks = Partial<Record<string, (member: CrewMember) => void>>

// Host side of every resident. The interaction layer has already checked the resident is in reach and the
// choice is still open, so a stale or simultaneous request never reaches here. Favors are crew-wide.
export function createResidents(state: Snapshot, registry: readonly ResidentDefinition[],
  physics: Pick<ReturnType<typeof createCargoPhysics>, 'release'>, notifyCrew: (message: CrewNotice) => void,
  talkHooks: Hooks = {}, checkpoint?: () => void) {

  function keep(resident: ResidentDefinition, favor: FavorDefinition) {
    const receipt = keepFavor(state, resident, favor)
    if (!receipt) return false
    checkpoint?.()
    notifyCrew({ type: 'favor-pay', ...receipt, trust: favor.trust })
    return true
  }

  function talk(member: CrewMember, subject: number) {
    const resident = registry[subject]
    talkHooks[resident.id]?.(member)
    member.notify?.({ type: 'resident-chat', resident: resident.id })
  }

  function accept(member: CrewMember, subject: number) {
    const resident = registry[subject]
    const offer = openOffer(resident, state)
    if (!offer || isCustom(offer)) return
    state.residents[resident.id] = { ...recordFor(state, resident), active: offer.id }
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
    physics.release(crate, crateStarts[crate.id])
  }

  return { talk, accept, handOver, stageCrate, tick, keep }
}
