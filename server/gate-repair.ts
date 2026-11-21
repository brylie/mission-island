import { atGate, gateFavor, gateMendedStage, gateway, gatewayClear, onBench, toolboxItem, wrenAt } from '../src/gate-repair.ts'
import type { GateAction, GateStep } from '../src/gate-repair.ts'
import type { Snapshot } from '../src/protocol.ts'
import { distance, toolboxHome } from '../src/world.ts'
import type { CrewMember, CrewNotice } from './crew.ts'
import type { InteractionHandlers } from './interactions.ts'
import { restingY } from './items.ts'

// Host transitions for Wren's gate. The interaction layer has already checked the step is still
// open to this player, so a stale or simultaneous request never reaches here.
// Keeping the favor goes through the shared resident ledger, so Wren's trust rises once for the crew.
export function createGateRepair(state: Snapshot, notifyCrew: (message: CrewNotice) => void, keepFavor: () => void) {
  const repair = () => state.gateRepair

  function shelveToolbox() {
    const toolbox = toolboxItem(state)
    if (!toolbox) return
    Object.assign(toolbox, { ...toolboxHome, holder: null, heading: 0, y: restingY(toolbox.id), rotation: null })
  }

  // Wren takes the toolbox back from wherever it was left, including from a crewmate who dropped out.
  function recallToolbox() {
    const toolbox = toolboxItem(state)
    if (!toolbox || repair().stage === 'sagging' || onBench(toolbox)) return false
    // While the swollen gate is being planed, a toolbox set down at the gate is in use, not left behind.
    if (repair().swelling && toolbox.holder === null && atGate(toolbox)) return false
    const holder = state.players.find((player) => player.id === toolbox.holder)
    if (holder?.connected) return false
    shelveToolbox()
    return true
  }

  function step(member: CrewMember, value: GateStep) {
    member.notify?.({ type: 'gate-step', step: value })
  }

  // Talking to Wren accepts the favor, or has Wren fetch back a toolbox left lying about.
  function talk(member: CrewMember) {
    const current = repair()
    if (current.stage === 'sagging') {
      Object.assign(current, { stage: 'accepted', acceptedAt: state.islandTime })
      state.residents.wren = { ...state.residents.wren, active: gateFavor }
    }
    else if (recallToolbox()) step(member, 'recalled')
  }

  const interactions = {
    'return-toolbox'(member) {
      shelveToolbox()
      step(member, 'returned')
    },
    inspect(member) {
      repair().stage = 'inspected'
      step(member, 'inspected')
    },
    'take-pin'(member) {
      repair().pinHolder = member.player.id
      step(member, 'pin')
    },
    fit() {
      Object.assign(repair(), { stage: 'fitted', pinHolder: null })
      notifyCrew({ type: 'gate-step', step: 'fitted' })
    },
    test() {
      Object.assign(repair(), { stage: 'mended', mendedAt: state.islandTime })
      state.gate = { open: true, closePending: false }
      keepFavor()
    },
    open(member) {
      state.gate = { open: true, closePending: false }
      if (repair().stage !== 'mended' || repair().swelling === 'swollen') step(member, 'stuck')
    },
    close() {
      state.gate.closePending = true
    },
  } satisfies InteractionHandlers<GateAction>

  // Wren opens a mended gate on the shortcut and closes it behind, once nobody stands in the opening.
  function tick() {
    const wren = wrenAt(state)
    const passing = gateMendedStage(state) === 'settled' && !wren.indoors && distance(wren, gateway) < 1.5
    if (passing && !state.gate.open) state.gate = { open: true, closePending: true }
    if (state.gate.open && state.gate.closePending && gatewayClear(state)) state.gate = { open: false, closePending: false }
  }

  function releasePin(playerId: number) {
    if (repair().pinHolder === playerId) repair().pinHolder = null
  }

  return { interactions, talk, tick, releasePin }
}
