import { highwoodHeightmap } from './assets/geometry/highwood-heightmap.ts'
import { roadDrainage, roadKinds, roadNetwork } from './assets/geometry/road-kinds.ts'
import { roadLayer } from './assets/geometry/road-layer.ts'
import { decodeRoadLayer } from './baked-roads.ts'
import { fingerprint } from './fingerprint.ts'
import { naturalGroundHeight } from './natural-ground.ts'
import { depotLane, harborRoad } from './paved-roads.ts'
import { createRoadGrading, rasterTileKey } from './road-grading.ts'
import type { Point } from './world.ts'
import { starterRoads, type StarterRoadLayout } from './worlds/starter/layout/roads.ts'

// The island's graded roads (src/worlds/starter/layout/roads.ts), cut and filled into the
// natural ground, and every question the game asks about them. src/terrain.ts adds
// `roadDelta` to the natural ground to give the ground players stand on.
//
// The source tree's roads are baked (scripts/bake-roads.mjs, `npm run island:roads`): their
// grading raster, culverts and formation distance load from src/assets/geometry/road-layer.ts
// instead of being worked out on every load. The grading itself is still built, lazily, for the
// questions the bake doesn't answer (clearance, the road surface's fields, footsteps). A draft the
// Workbench road designer previews is graded live, and so is a bake that has fallen behind roads.ts.

type RoadGrading = ReturnType<typeof createRoadGrading>
type BakedRoadLayer = ReturnType<typeof decodeRoadLayer>

// Signed metres to any road's formation edge, negative under a road: the terrain is cut to it.
// Far from every road it answers Infinity without asking the grading.
const halfWidth = 0.5
const pavedReach = roadKinds.paved.width * halfWidth + roadKinds.paved.shoulderWidth
// Past the paved formation by this much, so the terrain's cells crossing its edge are asked too.
const pavedMarginM = 5
const pavedLines = [harborRoad, depotLane]
// A box round the paved roads, so most points skip their segments.
const pavedBox = (() => {
  const all = pavedLines.flat(), reach = pavedReach + pavedMarginM
  return { west: Math.min(...all.map((p) => p.x)) - reach, east: Math.max(...all.map((p) => p.x)) + reach, south: Math.min(...all.map((p) => p.z)) - reach, north: Math.max(...all.map((p) => p.z)) + reach }
})()
function nearPavedRoad({ x, z }: Point) {
  if (x < pavedBox.west || x > pavedBox.east || z < pavedBox.south || z > pavedBox.north) return false
  return pavedLines.some((line) => line.some((a, i) => {
    const b = line[i + 1]
    if (!b) return false
    const dx = b.x - a.x, dz = b.z - a.z
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)))
    return Math.hypot(x - a.x - dx * t, z - a.z - dz * t) < pavedReach + pavedMarginM
  }))
}

// The formation distance worked out from the grading. `near` says which ground the grading
// covers: the bake's tiles, where there is a bake, so asking never builds the live raster.
const gradedFormation = (grading: RoadGrading, near = grading.near) => (point: Point) => (near(point) || nearPavedRoad(point) ? grading.fieldsAt(point).formation : Infinity)

// The roads' answers from a grading, and from its bake where there is one: the same questions,
// asked of whichever holds them.
function roadQueries(grading: RoadGrading, baked?: BakedRoadLayer) {
  if (!baked) return { baked: false, delta: grading.delta, near: grading.near, culverts: grading.culverts, formation: gradedFormation(grading) }
  const formation = gradedFormation(grading, baked.raster.near)
  return {
    baked: true,
    delta: baked.raster.at,
    near: baked.raster.near,
    culverts: () => baked.culverts,
    // The bake holds the 1 m grid the generated terrain tiles stand on; anywhere else is graded.
    formation: (point: Point) => baked.formationAt(point) ?? formation(point),
  }
}

// What the bake was made from: the roads, the rules they are graded by, and the ground they are
// graded into. A bake made from anything else has fallen behind and is not used.
export const roadLayoutKey = (layouts: readonly StarterRoadLayout[]) => fingerprint(JSON.stringify([layouts, pavedLines, roadKinds, roadNetwork, roadDrainage, highwoodHeightmap.sourceHash]))

let shipped: BakedRoadLayer | undefined
function shippedLayer() {
  if (roadLayer.layoutKey !== roadLayoutKey(starterRoads)) {
    console.warn('The road bake is out of date, so the roads are graded on load. Run npm run island:roads.')
    return undefined
  }
  shipped ??= decodeRoadLayer(roadLayer)
  return shipped
}

let layouts: readonly StarterRoadLayout[] = starterRoads
let roadGrading = createRoadGrading(layouts, naturalGroundHeight)
// Decoded on first use, so a script that only grades roads never reads the bake.
let queries: ReturnType<typeof roadQueries> | undefined
const ask = () => queries ??= roadQueries(roadGrading, shippedLayer())
// Whatever was worked out from the roads and kept: rocks, trees and solids placed clear of them.
const resets = new Set<() => void>()

// Registers a memo to forget whenever the roads change, so it is worked out again from the new ones.
export function onRoadsChange(reset: () => void) {
  resets.add(reset)
}

// The Workbench road designer previews a draft by grading its roads instead; the
// meshes built afterwards show them. Previewing the source tree's roads goes back to the bake.
export function previewRoadLayouts(next: readonly StarterRoadLayout[]) {
  layouts = next
  roadGrading = createRoadGrading(next, naturalGroundHeight)
  queries = roadQueries(roadGrading, next === starterRoads ? shippedLayer() : undefined)
  for (const reset of resets) reset()
}

// The road layouts the island is graded with now: the source tree's, or a draft being previewed.
export const currentRoadLayouts = () => layouts
// Whether the roads are read from the bake: the source tree's roads, with a bake made from them.
// Otherwise (a previewed draft, or roads saved since the last bake) they are graded live, and
// whatever the bakes placed clear of the roads must be checked against them again.
export const roadsBaked = () => ask().baked

// How far the roads raise (+) or lower (−) the natural ground at a point.
export const roadDelta = (point: Point) => ask().delta(point)
// Whether a point is near enough a graded road for its grading to cover it: a quick test before
// asking anything dearer.
export const nearGradedRoad = (point: Point) => ask().near(point)

export const gradedRoads = () => roadGrading.roads()
// What the road surface is built from: the road network, and every point's distances to its edges.
export const roadSurfaceSource = {
  network: () => roadGrading.network(),
  fieldsAt: (point: Point) => roadGrading.fieldsAt(point),
}
// Signed metres to the roads' carriageway and formation edges, and to the nearest paved carriageway.
export const roadCarriageways = (point: Point) => roadGrading.carriagewayAt(point)
// Where the graded roads need culverts, so their hollows drain.
export const roadCulverts = () => ask().culverts()
// Metres from a point to the nearest graded road's edge: scenery and plants keep clear of the formation.
export const roadClearance = (point: Point) => roadGrading.clearance(point)
// How far, in metres, the graded roads moved the ground at a point: their cuts, fills and banks.
export const roadEarthworks = (point: Point) => (nearGradedRoad(point) ? Math.abs(roadDelta(point)) : 0)
// Whether a point is under a graded road's drawn surface, mouths included. Answered quickly far
// from any road.
export const underGradedRoad = (point: Point) => nearGradedRoad(point) && roadClearance(point) < 0
export const roadFormation = (point: Point) => ask().formation(point)

const { tileCells, cellM } = roadNetwork
const tileM = tileCells * cellM

// What the road bake holds, worked out from a grading of the given roads: the raster's tiles, the
// culverts, and the formation distance at every node of the 1 m grid where a road is near enough
// to have one, in tiles like the raster's. scripts/bake-roads.mjs writes it; the tests check the
// bake against it.
export function gradeRoadLayer(next: readonly StarterRoadLayout[] = starterRoads) {
  const grading = createRoadGrading(next, naturalGroundHeight)
  const formation = gradedFormation(grading)
  const tiles = grading.tiles()
  const candidates = new Map<number, { tx: number, tz: number }>()
  for (const key of tiles.keys()) {
    const tx = Math.round(key / roadNetwork.tileKeyStride)
    candidates.set(key, { tx, tz: key - tx * roadNetwork.tileKeyStride })
  }
  for (let tz = Math.floor(pavedBox.south / tileM); tz <= Math.floor(pavedBox.north / tileM); tz++) {
    for (let tx = Math.floor(pavedBox.west / tileM); tx <= Math.floor(pavedBox.east / tileM); tx++) candidates.set(rasterTileKey(tx, tz), { tx, tz })
  }
  const formationTiles = new Map<number, Float64Array>()
  for (const [key, { tx, tz }] of candidates) {
    const nodes = tileCells + 1, values = new Float64Array(nodes * nodes)
    for (let j = 0; j < nodes; j++) for (let i = 0; i < nodes; i++) values[j * nodes + i] = formation({ x: tx * tileM + i * cellM, z: tz * tileM + j * cellM })
    if (values.some(Number.isFinite)) formationTiles.set(key, values)
  }
  return { key: roadLayoutKey(next), grading, tiles, culverts: grading.culverts(), formationTiles, formation }
}
