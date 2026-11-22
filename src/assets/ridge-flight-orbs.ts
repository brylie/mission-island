import type { MeshFactory } from '../island-meshes'
import { ridgeFlightWaypoints } from '../ridge-wayfinding'
import type { Waypoint } from '../wayfinding'
import { createWayfindingOrbs } from './wayfinding-orbs'

const destinationOrbSize = 0.48

export function createRidgeFlightOrbs(meshes: MeshFactory) {
  const orbs = createWayfindingOrbs(meshes, 'Windstone destination', '#7bdaff', destinationOrbSize)
  let lastTarget: boolean | null | undefined
  let lastPilot: Waypoint | undefined
  // `null` hides the orbs: free flights steer by the rising air and the survey bearings instead.
  return (toWillow: boolean | null, pilot?: Waypoint) => {
    const sameOrigin = lastPilot === pilot || (lastPilot && pilot
      && lastPilot.x === pilot.x && lastPilot.y === pilot.y && lastPilot.z === pilot.z)
    if (lastTarget === toWillow && sameOrigin) return
    lastTarget = toWillow
    lastPilot = pilot && { x: pilot.x, y: pilot.y, z: pilot.z }
    orbs.setPath(toWillow === null ? [] : ridgeFlightWaypoints(toWillow, pilot))
  }
}
