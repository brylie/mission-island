import { groundHeight } from './terrain.ts'
import { waypointsAlongPath, type Waypoint } from './wayfinding.ts'
import { ridgeLaunch, ridgeLaunchClearance, ridgeMeadow } from './worlds/starter/ridge-scout.ts'
import { mirrorPoolWillow } from './worlds/starter/sites.ts'

const launch: Waypoint = { ...ridgeLaunch, y: groundHeight(ridgeLaunch) + ridgeLaunchClearance }
const willow: Waypoint = { ...mirrorPoolWillow, y: groundHeight(mirrorPoolWillow) + 3.5 }
const meadow: Waypoint = { ...ridgeMeadow, y: groundHeight(ridgeMeadow) + .6 }

export function ridgeFlightWaypoints(toWillow: boolean, pilot: Waypoint = launch) {
  const origin = { x: pilot.x, y: pilot.y + .8, z: pilot.z }
  return waypointsAlongPath([origin, toWillow ? willow : meadow], 3.8)
}
