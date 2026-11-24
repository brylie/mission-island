import type { MeshFactory } from '../island-meshes'
import type { Culvert } from '../road-culverts'
import { seededRandom } from '../seeded-random'
import type { Point } from '../world'
import { culvertModel as model } from './geometry/culverts'
import { facetBatch, type Corner } from './stone-facets'

// The roads' culverts, drawn where `findCulverts` put them: a headwall at each end, and apron
// stones below the outlet. One batch for them all.

const fullTurn = Math.PI + Math.PI
const half = 0.5

type Ground = (point: Point) => number
type Batch = ReturnType<typeof facetBatch>

// A box's six faces from its eight corners: four at the base, four at the top, counter-clockwise.
function box(batch: Batch, base: Corner[], top: Corner[], tone: readonly [number, number, number]) {
  for (let k = 0; k < base.length; k++) {
    const j = (k + 1) % base.length
    batch.face([base[k], base[j], top[j], top[k]], tone)
  }
  batch.face([...top], tone)
}

// A headwall across the pipe's line at `at`, its open face toward `facing` (a unit vector).
function headwall(batch: Batch, at: Point, facing: Point, ground: Ground) {
  const { widthM, heightM, thicknessM, embedM, tone } = model.headwall
  const across = { x: -facing.z, z: facing.x }
  const corner = (w: number, t: number) => ({ x: at.x + across.x * w * widthM * half + facing.x * t * thicknessM * half, z: at.z + across.z * w * widthM * half + facing.z * t * thicknessM * half })
  const plan = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)]
  const foot = Math.min(...plan.map(ground)) - embedM
  const crest = ground(at) + heightM
  box(batch, plan.map((p): Corner => [p.x, foot, p.z]), plan.map((p): Corner => [p.x, crest, p.z]), tone)
  // The pipe's mouth, a dark disc just proud of the open face.
  const { radiusM, sides, centreM, proudM, shade } = model.pipe
  const out = thicknessM * half + proudM
  const face = { x: at.x + facing.x * out, z: at.z + facing.z * out }
  const centre = ground(at) + centreM
  const ring = Array.from({ length: sides }, (_, k): Corner => {
    const angle = k * fullTurn / sides
    return [face.x + across.x * Math.cos(angle) * radiusM, centre + Math.sin(angle) * radiusM, face.z + across.z * Math.cos(angle) * radiusM]
  })
  batch.face(ring, shade)
}

// A packed riprap apron below an outlet: rows of rounded, uneven cobbles half sunk in the ground,
// widening downstream from the headwall.
function apron(batch: Batch, at: Point, facing: Point, ground: Ground, random: () => number) {
  const { lengthDiameters, widthM, rowM, stoneM, jitter, heightShare, sides, shoulder, tone } = model.apron
  const length = lengthDiameters * model.pipe.radiusM * (1 + 1)
  for (let along = model.headwall.thicknessM * half + rowM * half; along < length; along += rowM) {
    const width = widthM[0] + (widthM[1] - widthM[0]) * along / length
    const count = Math.max(1, Math.round(width / rowM))
    for (let k = 0; k < count; k++) {
      const sideways = (k + half) / count * width - width * half + (random() - half) * rowM * jitter
      const ahead = along + (random() - half) * rowM * jitter
      const centre = { x: at.x + facing.x * ahead - facing.z * sideways, z: at.z + facing.z * ahead + facing.x * sideways }
      cobble(batch, centre, stoneM[0] + random() * (stoneM[1] - stoneM[0]), ground, random, { jitter, heightShare, sides, shoulder, tone })
    }
  }
}

// One rounded, uneven cobble: a jittered outline rising to a smaller, tilted top.
function cobble(batch: Batch, centre: Point, size: number, ground: Ground, random: () => number, shape: { jitter: number, heightShare: number, sides: readonly number[], shoulder: number, tone: readonly [number, number, number] }) {
  const { jitter, heightShare, sides, shoulder, tone } = shape
  const turn = random() * fullTurn
  const count = sides[0] + Math.floor(random() * (sides[1] - sides[0] + 1))
  const radii = Array.from({ length: count }, () => size * half * (1 - jitter + random() * (jitter + jitter)))
  const ring = (scale: number) => radii.map((r, i) => ({ x: centre.x + Math.cos(turn + i * fullTurn / count) * r * scale, z: centre.z + Math.sin(turn + i * fullTurn / count) * r * scale }))
  const base = ground(centre) - size * heightShare * half
  const tilt = { x: (random() - half) * size * heightShare, z: (random() - half) * size * heightShare }
  const top = (p: Point): Corner => [p.x, base + size * heightShare + ((p.x - centre.x) * tilt.x + (p.z - centre.z) * tilt.z) / size, p.z]
  box(batch, ring(1).map((p): Corner => [p.x, base, p.z]), ring(shoulder).map(top), tone)
}

// A drop inlet: a stone catch basin flush with the ground, capped with a dark grate.
function dropInlet(batch: Batch, at: Point, facing: Point, ground: Ground) {
  const { sizeM, depthM, riseM, grateInset, grateShade } = model.dropInlet
  const across = { x: -facing.z, z: facing.x }
  const corner = (u: number, v: number, scale = 1) => ({ x: at.x + (across.x * u + facing.x * v) * sizeM * half * scale, z: at.z + (across.z * u + facing.z * v) * sizeM * half * scale })
  const plan = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)]
  const rim = ground(at) + riseM
  box(batch, plan.map((p): Corner => [p.x, rim - depthM, p.z]), plan.map((p): Corner => [p.x, rim, p.z]), model.headwall.tone)
  const grate = [corner(-1, -1, 1 - grateInset), corner(1, -1, 1 - grateInset), corner(1, 1, 1 - grateInset), corner(-1, 1, 1 - grateInset)]
  batch.face(grate.map((p): Corner => [p.x, rim + model.pipe.proudM, p.z]), grateShade)
}

interface RoadQueries {
  // Metres to the nearest graded road's formation edge, and to any road's carriageway edge
  // (negative inside); and how far the grading moved the ground.
  clearance: (point: Point) => number
  carriageway: (point: Point) => number
  earthworks: (point: Point) => number
}

// The nearest spot to `from`, within reach, that is off the carriageway.
function offCarriageway(from: Point, roads: RoadQueries) {
  if (roads.carriageway(from) > model.dropClearM) return from
  for (let r = model.searchStepM; r <= model.dropSearchM; r += model.searchStepM) {
    for (let k = 0; k < model.dropDirections; k++) {
      const at = { x: from.x + Math.cos(k * fullTurn / model.dropDirections) * r, z: from.z + Math.sin(k * fullTurn / model.dropDirections) * r }
      if (roads.carriageway(at) > model.dropClearM) return at
    }
  }
  return undefined
}

// Where the pipe leaves the fill: along its line from the inlet, the first spot clear of the
// formation where the ground is as nature left it.
function fillToe(inlet: Point, along: Point, reach: number, roads: RoadQueries) {
  for (let d = 0; d <= reach; d += model.searchStepM) {
    const at = { x: inlet.x + along.x * d, z: inlet.z + along.z * d }
    if (roads.clearance(at) > model.clearOfRoadM && roads.earthworks(at) < model.toeM) return at
  }
  return undefined
}

export function createCulverts(meshes: MeshFactory, culverts: readonly Culvert[], ground: Ground, roads: RoadQueries) {
  const batch = facetBatch(model.repeatsPerMetre)
  const random = seededRandom(model.seed)
  // Culvert ends sharing a spot share one structure.
  const built: Point[] = []
  const fresh = (at: Point) => {
    if (built.some((p) => Math.hypot(p.x - at.x, p.z - at.z) < model.shareM)) return false
    built.push(at)
    return true
  }
  for (const { inlet, outlet } of culverts) {
    if (!outlet) continue
    const length = Math.hypot(outlet.x - inlet.x, outlet.z - inlet.z)
    if (length < Number.EPSILON) continue
    // The pipe runs from inlet to outlet; water meets the inlet's face and leaves the outlet's.
    const along = { x: (outlet.x - inlet.x) / length, z: (outlet.z - inlet.z) / length }
    const up = { x: -along.x, z: -along.z }
    // An inlet beside the road takes a headwall; one in a cut or on the road, a drop inlet.
    if (roads.clearance(inlet) > model.clearOfRoadM) {
      if (fresh(inlet)) headwall(batch, inlet, up, ground)
    }
    else {
      const basin = offCarriageway(inlet, roads)
      if (basin && fresh(basin)) dropInlet(batch, basin, along, ground)
    }
    const toe = fillToe(inlet, along, length + model.searchM, roads) ?? outlet
    if (!fresh(toe)) continue
    headwall(batch, toe, along, ground)
    apron(batch, toe, along, ground, random)
  }
  return batch.mesh(meshes, 'Road culverts', meshes.paintRecipe('granite'))
}
