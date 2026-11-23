import { roadKinds } from './assets/geometry/route-profiles.ts'
import { solveRoadProfile, type RoadProfileSample } from './road-profile.ts'
import { sampleRoad } from './road-shape.ts'
import type { Point } from './world.ts'
import type { StarterRoadLayout } from './worlds/starter/layout/roads.ts'

// Cuts and fills the island for its graded roads. Each road's profile comes from
// the natural ground; the road surface lies flat across at that height, with a
// slight crown, and the ground eases back to natural on batter slopes: a cut bank
// where the road runs below the ground, an embankment where it runs above. The
// result is a grid of height changes over each road's corridor, added to the
// natural ground, so physics, wheels, walking and the map all see the road.

type GroundFunction = (point: Point) => number

export interface GradedRoad {
  layout: StarterRoadLayout
  profile: RoadProfileSample[]
  halfWidth: number
  // Half the width plus the shoulder: the flat part of the cross-section.
  halfFormation: number
}

interface RoadRaster { west: number, south: number, columns: number, rows: number, delta: Float32Array }

const cellM = 1
const half = 0.5
const square = 2
// The corridor reaches this far beyond the formation for the deepest cut or fill a batter meets.
const batterReachM = 12

function roadKind(layout: Pick<StarterRoadLayout, 'kind'>) {
  return roadKinds[layout.kind]
}

// A road's profile through the ground: grade-limited, held to the ground at both ends.
export function gradeRoad(layout: StarterRoadLayout, natural: GroundFunction): GradedRoad {
  const kind = roadKind(layout)
  const samples = sampleRoad(layout)
  const halfWidth = kind.width * half
  const profile = solveRoadProfile(samples, {
    groundAt: natural,
    halfWidth,
    maxGrade: (sample) => layout.maxGrade?.[sample.stretch] ?? kind.maxGrade,
    start: samples.length ? natural(samples[0]) : undefined,
    end: samples.length ? natural(samples[samples.length - 1]) : undefined,
  })
  return { layout, profile, halfWidth, halfFormation: halfWidth + kind.shoulderWidth }
}

// The nearest profile sample to a point, by a scan of nearby samples on a coarse grid.
function sampleIndex(profile: readonly RoadProfileSample[], bucketM: number) {
  const buckets = new Map<string, number[]>()
  profile.forEach((sample, i) => {
    const key = `${Math.floor(sample.x / bucketM)},${Math.floor(sample.z / bucketM)}`
    buckets.set(key, [...(buckets.get(key) ?? []), i])
  })
  return (point: Point) => {
    let best = -1, bestDistance = Infinity
    const i = Math.floor(point.x / bucketM), j = Math.floor(point.z / bucketM)
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        for (const k of buckets.get(`${i + di},${j + dj}`) ?? []) {
          const d = (profile[k].x - point.x) ** square + (profile[k].z - point.z) ** square
          if (d < bestDistance) [best, bestDistance] = [k, d]
        }
      }
    }
    return best
  }
}

// The graded height of one road at a point, or undefined beyond its batters.
function roadSurfaceHeight(road: GradedRoad, nearest: (point: Point) => number, point: Point, ground: number) {
  const k = nearest(point)
  if (k < 0) return
  const sample = road.profile[k]
  // Sideways distance from the centreline, and the road's height level with the point.
  const offset = (point.x - sample.x) * sample.dx + (point.z - sample.z) * sample.dz
  const across = Math.abs((point.x - sample.x) * sample.dz - (point.z - sample.z) * sample.dx)
  // Past either end the road fades into the ground it meets over its formation's half
  // width, so a branch blends into the road it joins and a dead end ramps to the ground.
  const pastEnd = (k === 0 && offset < 0) || (k === road.profile.length - 1 && offset > 0)
  const fade = pastEnd ? Math.min(1, Math.abs(offset) / road.halfFormation) : 0
  if (fade >= 1) return
  const y = pastEnd ? sample.y : sample.y + sample.grade * offset
  const kind = roadKind(road.layout)
  let height: number
  if (across <= road.halfFormation) height = y - kind.crown * Math.min(1, (across / road.halfWidth) ** square)
  else {
    const beyond = across - road.halfFormation
    // A cut bank rises toward the ground at the cut slope; an embankment falls toward it at the fill slope.
    height = ground > y ? Math.min(ground, y + beyond / kind.cutSlope) : Math.max(ground, y - beyond / kind.fillSlope)
    if (height === ground) return
  }
  return height + (ground - height) * fade
}

function rasterise(road: GradedRoad, natural: GroundFunction): RoadRaster {
  const reach = road.halfFormation + batterReachM
  const xs = road.profile.map((sample) => sample.x), zs = road.profile.map((sample) => sample.z)
  const west = Math.floor(Math.min(...xs) - reach), south = Math.floor(Math.min(...zs) - reach)
  const columns = Math.ceil(Math.max(...xs) + reach - west) + 1, rows = Math.ceil(Math.max(...zs) + reach - south) + 1
  const delta = new Float32Array(columns * rows)
  const nearest = sampleIndex(road.profile, reach)
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const point = { x: west + i * cellM, z: south + j * cellM }
      const ground = natural(point)
      const height = roadSurfaceHeight(road, nearest, point, ground)
      if (height !== undefined) delta[j * columns + i] = height - ground
    }
  }
  return { west, south, columns, rows, delta }
}

function sampleRaster({ west, south, columns, rows, delta }: RoadRaster, { x, z }: Point) {
  const gx = (x - west) / cellM, gz = (z - south) / cellM
  if (gx < 0 || gz < 0 || gx >= columns - 1 || gz >= rows - 1) return 0
  const i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j
  const at = j * columns + i
  return (delta[at] * (1 - fx) + delta[at + 1] * fx) * (1 - fz) + (delta[at + columns] * (1 - fx) + delta[at + columns + 1] * fx) * fz
}

// The island's graded roads, worked out once from the natural ground the first time they are needed.
// A road joining another should come after it in the layout.
export function createRoadGrading(layouts: readonly StarterRoadLayout[], natural: GroundFunction) {
  let built: { roads: GradedRoad[], rasters: RoadRaster[], nearest: ((point: Point) => number)[] } | undefined
  const build = () => {
    if (built) return built
    // Roads are graded in order, each over the ground the earlier ones shaped, so a branch
    // starts level with the road it leaves and overlapping corridors are cut only once.
    const roads: GradedRoad[] = [], rasters: RoadRaster[] = []
    const shaped = (point: Point) => rasters.reduce((height, raster) => height + sampleRaster(raster, point), natural(point))
    for (const layout of layouts.filter((road) => road.points.length > 1)) {
      const road = gradeRoad(layout, shaped)
      const raster = rasterise(road, shaped)
      roads.push(road)
      rasters.push(raster)
    }
    built = { roads, rasters, nearest: roads.map((road) => sampleIndex(road.profile, road.halfFormation + batterReachM)) }
    return built
  }
  return {
    // How far the roads raise (+) or lower (−) the natural ground at a point.
    delta: (point: Point) => {
      let change = 0
      for (const raster of build().rasters) change += sampleRaster(raster, point)
      return change
    },
    roads: () => build().roads,
    // Metres from a point to the nearest road's formation edge (negative on the road), or Infinity far from any road.
    clearance: (point: Point) => {
      const { roads, nearest } = build()
      let clear = Infinity
      roads.forEach((road, r) => {
        const k = nearest[r](point)
        if (k >= 0) clear = Math.min(clear, Math.hypot(road.profile[k].x - point.x, road.profile[k].z - point.z) - road.halfFormation)
      })
      return clear
    },
  }
}
