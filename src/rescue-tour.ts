import { harborRoad } from './paved-roads.ts'
import { samplePolyline, sampleRoad, turnRadii, type RoadSample } from './road-shape.ts'
import { roadCulverts } from './roads.ts'
import { distance, extinguisherStations, type Point } from './world.ts'
import { highwoodSightlines } from './worlds/starter/layout/highwood-planting.ts'
import { harborJobSites, learnerVehicleLayout } from './worlds/starter/layout/places.ts'
import { starterRoads } from './worlds/starter/layout/roads.ts'

// The Fire and Rescue pickup's practice tour: a circuit from the pickup's parking spot
// through the village, up the Highwood fire road, round the loop the Pine Draw road,
// the Cairn ridge road and the summit spur make, and back home. Each stop is visited
// once, in order, and teaches one thing about the places a rescue crew needs to know.
//
// Every stop is read from the island's own layout or road data, never a coordinate of
// its own, so a road moved in the road designer moves its stops with it and can't leave
// one in the trees. A stop whose road or place is gone is left out rather than guessed;
// the tour test checks that every stop is there today. The stops are worked out on
// first use, because the culvert stop needs the graded roads.
// docs/mechanics/learner-driving.md describes the tour.

export interface PracticeStop extends Point {
  name: string
  lesson?: string
}

export const rescueTourIntro = 'village to Highwood and back'

const at = ({ x, z }: Point): Point => ({ x, z })

// The nearest of some points to a place.
function nearest(points: readonly Point[], place: Point | undefined) {
  if (!place || points.length === 0) return undefined
  return at(points.reduce((best, point) => (distance(point, place) < distance(best, place) ? point : best)))
}

const station = (id: string) => extinguisherStations.find((entry) => entry.id === id)
const sightline = (id: string) => highwoodSightlines.find((entry) => entry.id === id)
const layout = (id: string) => starterRoads.find((entry) => entry.id === id)
const samples = (id: string) => {
  const road = layout(id)
  return road ? sampleRoad(road) : []
}

// The sample at a distance along a road.
function sampleAlong(road: readonly RoadSample[], along: number | undefined) {
  if (along === undefined || road.length === 0) return undefined
  return at(road.reduce((best, sample) => (Math.abs(sample.along - along) < Math.abs(best.along - along) ? sample : best)))
}

// A road's tightest bend: where it switches back.
function tightestBend(road: readonly RoadSample[]) {
  const radii = turnRadii(road)
  const index = radii.reduce((best, radius, i) => (radius < radii[best] ? i : best), 0)
  return road.length ? { ...at(road[index]), radius: radii[index] } : undefined
}

const half = 0.5

function middle(road: readonly RoadSample[]) {
  const sample = road.at(Math.floor(road.length * half))
  return sample && at(sample)
}
const metres = (value: number) => Math.round(value)

type Draft = Partial<Point> & Omit<PracticeStop, keyof Point>

function draftStops(): Draft[] {
  const harborRoadSamples = samplePolyline(harborRoad)
  const fireRoad = samples('fire-road')
  const pineDraw = samples('pine-draw-road')
  const ridge = samples('cairn-ridge-road')
  const spur = layout('summit-spur')?.points ?? []
  const ridgeEnd = layout('cairn-ridge-road')?.points.at(-1)
  // The first culvert up the fire road that carries water right under it, to an outlet.
  const culvert = roadCulverts().filter((entry) => entry.road === 'fire-road' && entry.outlet).sort((a, b) => a.along - b.along)[0]
  const hairpin = tightestBend(pineDraw)
  return [
    {
      name: 'Fire Watch',
      ...nearest(harborRoadSamples, station('fire-watch')),
      lesson: 'The Fire Watch tower stands behind Fire Supplies. From its cab, the fire finder gives a smoke’s bearing and distance, and a red fire station waits at the foot of its stairs.',
    },
    {
      name: 'Island Farm',
      ...at(harborJobSites.farmDrop),
      lesson: 'Dry fields and the Long Acre hedgerow are where grass fires start. The farm’s fire station stands beside the fields.',
    },
    {
      name: 'Harbor Depot',
      ...nearest(harborRoadSamples, station('harbor')),
      lesson: 'The depot’s fire station stands west of the road, by the crate stack. Press E at any red station to refill an extinguisher.',
    },
    {
      name: 'Fire road trailhead',
      ...layout('fire-road')?.points[0],
      lesson: 'The paving ends and the Highwood fire road begins: packed earth, one lane, 4 m wide. Drive slowly and watch for a vehicle coming the other way.',
    },
    {
      name: 'Fire road culvert',
      ...sampleAlong(fireRoad, culvert?.along),
      lesson: 'A culvert carries water under the road here. Its inlet beside the road has a stone headwall, and packed stone below the outlet stops the water washing the bank away.',
    },
    {
      name: 'Cairn turnoff',
      ...spur[0],
      lesson: 'The summit spur leaves the fire road here; the tour comes back down it later. Keep on the fire road, which climbs the valley at up to 12%.',
    },
    {
      name: 'Alder Creek',
      ...nearest(fireRoad, sightline('highwood-creek-ford')?.eye),
      lesson: 'On the way, the fire road dips across Alder Creek’s bed; a stone ford is still to be built. If water is running over a road after heavy rain, don’t drive through it.',
    },
    {
      name: 'Pine Draw hairpin',
      ...hairpin,
      lesson: `A switchback: to climb a slope steeper than a road may be, the road crosses it and turns back on itself. This bend is about ${metres(hairpin?.radius ?? 0)} m in radius. Turn round here and take the Cairn ridge road, which leaves just before it.`,
    },
    {
      name: 'Cairn ridge',
      ...middle(ridge),
      lesson: 'The ridge road climbs onto Cairn’s ridge at up to 15%. Fire runs faster uphill, as the flames lean over and heat the slope above them, so the slopes below a ridge are where a fire would run.',
    },
    {
      name: 'Ridge junction',
      ...ridgeEnd,
      lesson: 'The ridge road joins the summit spur here and closes a loop, so a crew can drive round instead of turning back, and has a second way out.',
    },
    {
      name: 'Summit pad',
      ...spur.at(-1),
      lesson: 'The spur ends in a turning pad on Cairn’s ridge, so a crew vehicle can turn round on a dead-end road. Turn here in three moves, then head down the spur and the fire road for home. The last climb to the summit is on foot.',
    },
    {
      name: 'Fire Supplies',
      ...at(learnerVehicleLayout.pickup.park),
      lesson: 'Back at Fire Supplies, where the pickup parks for the next crew. Its stock refills an extinguisher like any red station.',
    },
  ]
}

let built: readonly PracticeStop[] | undefined

export function rescueTourStops(): readonly PracticeStop[] {
  built ??= draftStops().flatMap(({ x, z, ...stop }) => (x === undefined || z === undefined ? [] : [{ ...stop, x, z }]))
  return built
}
