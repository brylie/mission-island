import { favorCoins, gateAction, gateMendedStage, gateway, gatewayClear, onBench, toolboxItem, wrenAt } from '../src/gate-repair.ts'
import type { GateAction, GateStep } from '../src/gate-repair.ts'
import type { Snapshot } from '../src/protocol.ts'
import { distance, toolboxHome } from '../src/world.ts'
import type { CrewMember, CrewNotice } from './crew.ts'
import { restingY } from './items.ts'

// Host transitions for Wren's gate. Every step re-checks the action the player saw,
// so a stale or simultaneous request changes nothing.
export function createGateRepair(state: Snapshot, notifyCrew: (message: CrewNotice) => void) {
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
    const holder = state.players.find((player) => player.id === toolbox.holder)
    if (holder?.connected) return false
    shelveToolbox()
    return true
  }

  function step(member: CrewMember, value: GateStep) {
    member.notify?.({ type: 'gate-step', step: value })
  }

  function act(member: CrewMember, intent: GateAction) {
    const { player } = member
    if (gateAction(state, player) !== intent) return
    const current = repair()
    switch (intent) {
      case 'talk':
        if (current.stage === 'sagging') Object.assign(current, { stage: 'accepted', acceptedAt: state.islandTime })
        else if (recallToolbox()) step(member, 'recalled')
        member.notify?.({ type: 'wren-chat' })
        break
      case 'return-toolbox':
        shelveToolbox()
        step(member, 'returned')
        break
      case 'inspect':
        current.stage = 'inspected'
        step(member, 'inspected')
        break
      case 'take-pin':
        current.pinHolder = player.id
        step(member, 'pin')
        break
      case 'fit':
        Object.assign(current, { stage: 'fitted', pinHolder: null })
        notifyCrew({ type: 'gate-step', step: 'fitted' })
        break
      case 'test':
        Object.assign(current, { stage: 'mended', mendedAt: state.islandTime })
        state.gate = { open: true, closePending: false }
        state.crewCoins += favorCoins
        state.residentTrust.wren += 1
        state.lastFavorPay = { resident: 'wren', coins: favorCoins }
        notifyCrew({ type: 'favor-pay', resident: 'wren', coins: favorCoins, trust: 1 })
        break
      case 'open':
        state.gate = { open: true, closePending: false }
        if (current.stage !== 'mended') step(member, 'stuck')
        break
      case 'close':
        state.gate.closePending = true
        break
    }
  }

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

  return { act, tick, releasePin }
}
