import type { MeshFactory } from '../island-meshes'
import { ridgeFlightWaypoints } from '../ridge-wayfinding'
import type { Waypoint } from '../wayfinding'
import { createWayfindingOrbs } from './wayfinding-orbs'

export function createRidgeFlightOrbs(meshes: MeshFactory) {
  const orbs = createWayfindingOrbs(meshes, 'Windstone destination', '#7bdaff', .48)
  let lastTarget: boolean | undefined
  let lastPilot: Waypoint | undefined
  return (toWillow: boolean, pilot?: Waypoint) => {
    const sameOrigin = lastPilot === pilot || (lastPilot && pilot &&
      lastPilot.x === pilot.x && lastPilot.y === pilot.y && lastPilot.z === pilot.z)
    if (lastTarget === toWillow && sameOrigin) return
    lastTarget = toWillow
    lastPilot = pilot && { x: pilot.x, y: pilot.y, z: pilot.z }
    orbs.setPath(ridgeFlightWaypoints(toWillow, pilot))
  }
}
