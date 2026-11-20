import { ferryTrack, islandLoop, quayRoad } from './routes.ts'
import type { Route } from './routes.ts'
import { arrival, villages } from './sites.ts'
import type { MapPoint } from './sites.ts'

function distanceAt(route: Route, point: MapPoint) {
  return route.samples.reduce((best, s) => Math.hypot(s.x - point.x, s.z - point.z) < Math.hypot(best.x - point.x, best.z - point.z) ? s : best).distance
}

const end = (route: Route) => route.samples[route.samples.length - 1].distance
const barley = distanceAt(islandLoop, villages[1]), alder = distanceAt(islandLoop, villages[2])
interface Leg { route: Route; from: number; to: number }
interface Stop extends MapPoint { name: string; short: string; detail: string; legs: Leg[] }
export const tour: Stop[] = [
  { ...arrival, name: 'Brinewick Ferry', short: 'Ferry', detail: 'Cross the ramp to the quay or follow the tour through all three villages.', legs: [] },
  { ...villages[0], short: 'Brinewick', legs: [{ route: ferryTrack, from: 0, to: end(ferryTrack) }, { route: quayRoad, from: 0, to: end(quayRoad) }] },
  { ...villages[1], short: 'Barleycross', legs: [{ route: islandLoop, from: 0, to: barley }] },
  { ...villages[2], short: 'Alderwatch', detail: 'Look west for Tarnstep Falls. Follow Mill Road for the log yard or the loop east for Slatecliff Mine.',
    legs: [{ route: islandLoop, from: barley, to: alder }] },
  { ...arrival, name: 'Return to Brinewick', short: 'Return', detail: 'The river valley and Reedwater Bridge complete the loop back to the ferry.', legs: [
    { route: islandLoop, from: alder, to: end(islandLoop) }, { route: quayRoad, from: end(quayRoad), to: 0 }, { route: ferryTrack, from: end(ferryTrack), to: 0 },
  ] },
]
