import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createCompactTractor } from './assets/compact-tractor'
import { createResponsePickup } from './assets/response-pickup'
import type { MeshFactory } from './island-meshes'
import { truckSnapDistance } from './island-render-settings'
import { moveTo } from './island-render-pose'
import { learnerVehicleIds, learnerVehicles, practiceStop, practiceStopRadiusM, type LearnerVehicleId } from './learner-vehicles'
import { createObjectiveMarker } from './objective-marker'
import type { Player, Snapshot } from './protocol'
import { groundHeight } from './terrain'
import { objectiveMarkerLook, practiceCones } from './assets/geometry/starter-cues'
import { starterMapLook } from './assets/geometry/starter-map'

const diameterPerRadius = 2
const half = 0.5
const fullTurn = Math.PI + Math.PI

type LearnerModel = ReturnType<typeof createResponsePickup>
const builders: Record<LearnerVehicleId, (meshes: MeshFactory) => LearnerModel> = {
  pickup: createResponsePickup,
  tractor: createCompactTractor,
}

// The Starter Island learner vehicles and the practice stop the local driver
// is heading for.
export function createLearnerFleetView(meshes: MeshFactory) {
  const fleet = learnerVehicleIds.map((id) => {
    const model = builders[id](meshes)
    model.root.setEnabled(false)
    return { id, model, wheelRotation: 0 }
  })
  const marker = createObjectiveMarker(meshes, { x: 0, z: 0 }, practiceStopRadiusM * diameterPerRadius, starterMapLook.practiceStop.color)
  // Traffic cones around the ring set it apart from the job and delivery pads.
  const { count, radius, base, top, height, segments, color } = practiceCones
  for (let i = 0; i < count; i++) {
    const angle = i * fullTurn / count
    const cone = meshes.cylinder(radius * Math.cos(angle), height * half, radius * Math.sin(angle), top, base, height, segments, color, marker)
    cone.parent = marker
  }
  marker.setEnabled(false)
  const nodes = Object.fromEntries(fleet.map(({ id, model }) => [id, model.root])) as Record<LearnerVehicleId, TransformNode>

  return {
    node: (id: LearnerVehicleId) => nodes[id],
    labelHeight: (id: LearnerVehicleId) => learnerVehicles[id].labelHeight,
    update(state: Snapshot, local: Player | undefined, factor: number, delta: number) {
      for (const entry of fleet) {
        const pose = state.vehicles[entry.id]
        const { root } = entry.model
        const snap = !root.isEnabled() || Math.hypot(root.position.x - pose.x, root.position.z - pose.z) > truckSnapDistance
        const blend = snap ? 1 : factor
        moveTo(root, pose, pose.y, factor)
        root.setEnabled(true)
        root.rotation.x += (pose.pitch - root.rotation.x) * blend
        root.rotation.z += (pose.roll - root.rotation.z) * blend
        if (!snap) entry.wheelRotation += pose.speed * delta / learnerVehicles[entry.id].spec.wheelRadius
        entry.model.pose(entry.wheelRotation, pose.steering, pose.suspension, blend)
      }
      // Driver and passenger both see where the run ends.
      const riding = local?.seat ? local.vehicle : undefined
      const stop = riding && practiceStop(riding, state.practice[riding])
      marker.setEnabled(Boolean(stop))
      if (stop) {
        marker.position.set(stop.x, groundHeight(stop) + objectiveMarkerLook.groundOffset, stop.z)
      }
    },
    setLights(strength: number, state: Snapshot | undefined) {
      for (const { id, model } of fleet) model.setLights(model.root.isEnabled() ? strength : 0, state?.vehicles[id].braking)
    },
  }
}
