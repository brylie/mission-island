import { createWrenGateModel } from './assets/wren-gate'
import { gateMendedStage, leafAngle, sagAngle } from './gate-repair'
import type { MeshFactory } from './island-meshes'
import type { Snapshot } from './protocol'
import { offset } from './world'

const wornLeafTilt = -0.055
const pinHandLateral = 0.42
const pinHandForward = 0.18
const pinHandHeight = 0.82

export function createGardenGate(meshes: MeshFactory) {
  const { hinge, leaf, wornPin, newPin, groove, benchPin, carried } = createWrenGateModel(meshes, sagAngle)

  return {
    update(state: Snapshot, factor: number) {
      const stage = state.gateRepair.stage
      const fixed = stage === 'fitted' || stage === 'mended'
      hinge.rotation.y += (-leafAngle(state) - hinge.rotation.y) * factor
      // The worn pin lets the free end drop and scrape until a new one is fitted.
      leaf.rotation.z += ((fixed ? 0 : wornLeafTilt) - leaf.rotation.z) * factor
      wornPin.setEnabled(!fixed)
      newPin.setEnabled(fixed)
      groove.setEnabled(gateMendedStage(state) !== 'settled')
      benchPin.setEnabled(state.gateRepair.pinHolder === null && stage !== 'fitted' && stage !== 'mended')
      const holder = state.players.find((player) => player.id === state.gateRepair.pinHolder)
      carried.setEnabled(Boolean(holder))
      if (holder) {
        const hand = offset(holder, pinHandLateral, pinHandForward)
        carried.position.set(hand.x, holder.y + pinHandHeight, hand.z)
      }
    },
  }
}
