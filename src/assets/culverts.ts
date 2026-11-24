import type { MeshFactory } from '../island-meshes'
import type { Culvert } from '../road-culverts'
import { seededRandom } from '../seeded-random'
import type { Point } from '../world'
import { culvertModel as model } from './geometry/culverts'
import { facetBatch, type Corner } from './stone-facets'
import { planCulverts, type RoadQueries } from './culvert-plan'

// The roads' culverts, drawn where `planCulverts` puts their ends: headwalls, drop inlets, and a
// riprap apron below each outlet. One batch for them all.

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
  // A coping slab along the top, a little wider than the wall, so it reads as laid stone.
  const { copingM, copingOverhangM, copingTone } = model.headwall
  const cap = (w: number, t: number) => ({ x: at.x + across.x * w * (widthM * half + copingOverhangM) + facing.x * t * (thicknessM * half + copingOverhangM), z: at.z + across.z * w * (widthM * half + copingOverhangM) + facing.z * t * (thicknessM * half + copingOverhangM) })
  const capPlan = [cap(-1, -1), cap(1, -1), cap(1, 1), cap(-1, 1)]
  box(batch, capPlan.map((p): Corner => [p.x, crest, p.z]), capPlan.map((p): Corner => [p.x, crest + copingM, p.z]), copingTone)
  // The pipe: a short barrel standing out of the open face, its rim lighter, its bore dark.
  const { radiusM, sides, centreM, proudM, barrelM, wallM, shade, rimTone } = model.pipe
  const centre = ground(at) + centreM
  const ring = (out: number, radius: number) => Array.from({ length: sides }, (_, k): Corner => {
    const angle = k * fullTurn / sides
    const x = at.x + facing.x * out + across.x * Math.cos(angle) * radius, z = at.z + facing.z * out + across.z * Math.cos(angle) * radius
    return [x, centre + Math.sin(angle) * radius, z]
  })
  const face = thicknessM * half, end = face + barrelM
  const base = ring(face, radiusM + wallM), lip = ring(end, radiusM + wallM), bore = ring(end + proudM, radiusM)
  for (let k = 0; k < sides; k++) {
    const j = (k + 1) % sides
    batch.face([base[k], base[j], lip[j], lip[k]], rimTone)
  }
  batch.face(lip, rimTone)
  batch.face(bore, shade)
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

export function createCulverts(meshes: MeshFactory, culverts: readonly Culvert[], ground: Ground, roads: RoadQueries) {
  const batch = facetBatch(model.repeatsPerMetre)
  const random = seededRandom(model.seed)
  for (const { kind, at, facing } of planCulverts(culverts, roads)) {
    if (kind === 'drop-inlet') dropInlet(batch, at, facing, ground)
    else headwall(batch, at, facing, ground)
    if (kind === 'outlet') apron(batch, at, facing, ground, random)
  }
  return batch.mesh(meshes, 'Road culverts', meshes.paintRecipe('granite'))
}
