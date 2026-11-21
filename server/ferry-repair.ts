import { donationAmount, emptyLedger, ferryStages, stageNeeds } from '../src/ferry-repair.ts'
import type { FerryAction } from '../src/ferry-repair.ts'
import type { Item, Snapshot } from '../src/protocol.ts'
import type { createCargoPhysics } from '../src/simulation/cargo.ts'
import { crateStarts } from '../src/world.ts'
import { timberPickups } from '../src/worlds/starter/ferry-terminal.ts'
import type { CrewMember, CrewNotice } from './crew.ts'

// Host transitions for the ferry terminal repair. The interaction layer has already checked that the chosen
// action is still offered to this player, so each effect is recomputed from the current state and never overshoots.
export function createFerryRepair(
  state: Snapshot, physics: Pick<ReturnType<typeof createCargoPhysics>, 'remove' | 'release'>,
  notifyCrew: (message: CrewNotice) => void, creditCrate: (id: number) => void,
) {
  const repair = () => state.ferryRepair

  // A stage finishes the moment its last coin or crate arrives, once, and the next stage opens with a fresh ledger.
  function advanceIfComplete() {
    const needs = stageNeeds(state)
    if (!needs || needs.coinsLeft > 0 || needs.cratesLeft > 0) return
    const current = repair()
    current.stage++
    if (current.stage < ferryStages.length) current.ledger.push(emptyLedger())
    else current.restoredAt = state.islandTime
    notifyCrew({ type: 'ferry-stage', stage: current.stage })
  }

  function donate(member: CrewMember) {
    const coins = donationAmount(state)
    if (!coins) return
    state.crewCoins -= coins
    repair().ledger[repair().stage].coins[member.player.id] += coins
    notifyCrew({ type: 'ferry-progress', kind: 'coins', player: member.player.id, amount: coins })
    advanceIfComplete()
  }

  // The order puts the idle depot crates on the Seabrook timber stack, ready for the flatbed.
  function orderTimber() {
    const needs = stageNeeds(state)
    if (!needs) return
    const crates = Math.min(needs.cratesLeft, timberPickups.length, crateStarts.length)
    for (const [i, point] of timberPickups.slice(0, crates).entries()) {
      const crate = state.items[i]
      physics.remove(crate)
      Object.assign(crate, { holder: null, heading: 0, delivered: false, onBed: false })
      physics.release(crate, point)
    }
    repair().haul = crates
    notifyCrew({ type: 'ferry-order', crates })
  }

  function act(member: CrewMember, action: FerryAction) {
    if (action === 'ferry-donate') donate(member)
    else if (action === 'ferry-order') orderTimber()
    else member.notify?.({ type: 'ferry-tally' })
  }

  // The crewmate who sets a timber crate down on the yard stack is credited with it, once.
  function deliverCrate(item: Item, playerId: number) {
    const current = repair()
    if (item.delivered || current.haul <= 0) return
    creditCrate(item.id)
    item.delivered = true
    current.haul--
    current.ledger[current.stage].crates[playerId]++
    notifyCrew({ type: 'ferry-progress', kind: 'timber', player: playerId, amount: 1 })
    advanceIfComplete()
  }

  return { act, deliverCrate }
}
