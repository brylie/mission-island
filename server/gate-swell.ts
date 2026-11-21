import { swellFavor, type SwellAction } from '../src/gate-swell.ts'
import type { Snapshot } from '../src/protocol.ts'
import type { CrewNotice } from './crew.ts'
import type { InteractionHandlers } from './interactions.ts'

// Host side of Wren's swollen gate. Each check swing records what the crew saw for both players, so
// whoever reports back to Wren knows whether the gate caught. Planing clears the finding until the next swing.
export function createGateSwell(state: Snapshot, notifyCrew: (message: CrewNotice) => void) {
  const interactions = {
    'check-swing'() {
      const caught = state.gateRepair.swelling === 'swollen'
      state.gate = { open: true, closePending: false }
      state.residents.wren.checked = caught ? 'fault' : 'sound'
      notifyCrew({ type: 'gate-step', step: caught ? 'caught' : 'clear' })
    },
    plane() {
      state.gateRepair.swelling = 'planed'
      state.residents.wren.checked = null
      notifyCrew({ type: 'gate-step', step: 'planed' })
    },
  } satisfies InteractionHandlers<SwellAction>

  // Agreeing to the job is when the swelling shows; keeping it leaves a gate that swings clear.
  const accepted = () => { state.gateRepair.swelling = 'swollen' }
  const kept = () => { delete state.gateRepair.swelling }
  return { interactions, hooks: { accepted: { [swellFavor]: accepted }, kept: { [swellFavor]: kept } } }
}
