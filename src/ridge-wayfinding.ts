import { groundHeight } from './terrain.ts'
import { waypointsAlongPath, type Waypoint } from './wayfinding.ts'
import { ridgeLaunch, ridgeLaunchClearance, ridgeMeadow } from './worlds/starter/ridge-scout.ts'
import { mirrorPoolWillow } from './worlds/starter/sites.ts'

const willowWaypointHeight = 3.5
const meadowWaypointHeight = 0.6
const pilotWaypointHeight = 0.8
const flightWaypointSpacing = 3.8

const launch: Waypoint = { ...ridgeLaunch, y: groundHeight(ridgeLaunch) + ridgeLaunchClearance }
const willow: Waypoint = { ...mirrorPoolWillow, y: groundHeight(mirrorPoolWillow) + willowWaypointHeight }
const meadow: Waypoint = { ...ridgeMeadow, y: groundHeight(ridgeMeadow) + meadowWaypointHeight }

export function ridgeFlightWaypoints(toWillow: boolean, pilot: Waypoint = launch) {
  const origin = { x: pilot.x, y: pilot.y + pilotWaypointHeight, z: pilot.z }
  return waypointsAlongPath([origin, toWillow ? willow : meadow], flightWaypointSpacing)
}
