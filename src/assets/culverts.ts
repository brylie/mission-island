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

// Stones spilled below an outlet: rounded, uneven cobbles half sunk in the ground, each a
// jittered outline rising to a smaller, tilted top.
function apron(batch: Batch, at: Point, facing: Point, ground: Ground, random: () => number) {
  const { stones, sizeM, reachM, spreadM, heightShare, sides, jitter, shoulder, tone } = model.apron
  for (let k = 0; k < stones; k++) {
    const reach = model.headwall.thicknessM + random() * reachM, sideways = (random() - half) * spreadM * (1 + reach)
    const centre = { x: at.x + facing.x * reach - facing.z * sideways, z: at.z + facing.z * reach + facing.x * sideways }
    const size = sizeM[0] + random() * (sizeM[1] - sizeM[0]), turn = random() * fullTurn
    const count = sides[0] + Math.floor(random() * (sides[1] - sides[0] + 1))
    const radii = Array.from({ length: count }, () => size * half * (1 - jitter + random() * (jitter + jitter)))
    const ring = (scale: number) => radii.map((r, i) => ({ x: centre.x + Math.cos(turn + i * fullTurn / count) * r * scale, z: centre.z + Math.sin(turn + i * fullTurn / count) * r * scale }))
    const base = ground(centre) - size * heightShare * half
    const tilt = { x: (random() - half) * size * heightShare, z: (random() - half) * size * heightShare }
    const top = (p: Point): Corner => [p.x, base + size * heightShare + ((p.x - centre.x) * tilt.x + (p.z - centre.z) * tilt.z) / size, p.z]
    box(batch, ring(1).map((p): Corner => [p.x, base, p.z]), ring(shoulder).map(top), tone)
  }
}

// From a culvert's end, back along its pipe's line until clear of the road's formation.
function clearSpot(from: Point, back: Point, clearance: (point: Point) => number) {
  for (let d = 0; d <= model.searchM; d += model.searchStepM) {
    const at = { x: from.x + back.x * d, z: from.z + back.z * d }
    if (clearance(at) > model.clearOfRoadM) return at
  }
  return undefined
}

export function createCulverts(meshes: MeshFactory, culverts: readonly Culvert[], ground: Ground, clearance: (point: Point) => number) {
  const batch = facetBatch(model.repeatsPerMetre)
  const random = seededRandom(model.seed)
  // Culvert ends sharing a spot share one headwall.
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
    const top = clearSpot(inlet, up, clearance)
    if (top && fresh(top)) headwall(batch, top, up, ground)
    const bottom = clearSpot(outlet, along, clearance)
    if (!bottom || !fresh(bottom)) continue
    headwall(batch, bottom, along, ground)
    apron(batch, bottom, along, ground, random)
  }
  return batch.mesh(meshes, 'Road culverts', meshes.paintRecipe('granite'))
}
