import { southSidewalkZ } from './routes.ts'

export const walkingCheckpoint = 'seabrook-walking'
export const commuteCheckpoint = 'mara-commute'
export const walkingLane = {
  start: { x: 34.5, z: southSidewalkZ },
  length: 12,
  observer: { x: 40.5, z: 17.9 },
  crate: { x: 34.5, z: southSidewalkZ + 1.25 },
  heading: Math.PI / 2,
}
