import { swellFavor, type SwellAction } from '../src/gate-swell.ts'
import type { Snapshot } from '../src/protocol.ts'
import type { CrewNotice } from './crew.ts'

// Host side of Wren's swollen gate. Each check swing records what the crew saw for both players, so
// whoever reports back to Wren knows whether the gate caught. Planing clears the finding until the next swing.
export function createGateSwell(state: Snapshot, notifyCrew: (message: CrewNotice) => void) {
  function act(action: SwellAction) {
    const repair = state.gateRepair
    const wren = state.residents.wren
    if (action === 'plane') {
      repair.swelling = 'planed'
      wren.checked = null
      notifyCrew({ type: 'gate-step', step: 'planed' })
      return
    }
    const caught = repair.swelling === 'swollen'
    state.gate = { open: true, closePending: false }
    wren.checked = caught ? 'fault' : 'sound'
    notifyCrew({ type: 'gate-step', step: caught ? 'caught' : 'clear' })
  }

  // Agreeing to the job is when the swelling shows; keeping it leaves a gate that swings clear.
  const accepted = () => { state.gateRepair.swelling = 'swollen' }
  const kept = () => { delete state.gateRepair.swelling }
  return { act, hooks: { accepted: { [swellFavor]: accepted }, kept: { [swellFavor]: kept } } }
}
