import { roadNetwork } from './assets/geometry/road-kinds.ts'
import { createRoadGrading } from './road-grading.ts'
import { starterRoads, type StarterRoadLayout } from './worlds/starter/layout/roads.ts'
import { fireWatch, fireWatchFloor } from './fire-watch.ts'
import { harborDock, island, onDock } from './world.ts'
import type { Point } from './world.ts'
import { duneRelief, sampleBeach } from './worlds/starter/beach-landforms.ts'
import { createStarterCoast, starterCoastSeed } from './worlds/starter/coastline.ts'
import { authoredShare, joinShare } from './worlds/starter/generation/protection.ts'
import { bakedHeight, bakedReach, bakedShoreMetres, bakedSurface } from './worlds/starter/highwood-terrain.ts'
import { falls, fernfallChannel, fernfallProfile, landRelief, shellglassBasin, shoreProfile, shoreStations, tidePool, waterLevel } from './worlds/starter/layout/terrain.ts'

export { falls, fernfallProfile, grove, headland, meadowFoot, meadowHill, pool, shoreProfile, tidePool, waterLevel } from './worlds/starter/layout/terrain.ts'
export const maxWadeDepth = 0.84
export const offshoreLimitMetres = 75
export const coastSegments = 512

const halves = 2
const squareExponent = 2
const smoothstepQuadraticWeight = 3
const smoothstepCubicWeight = 2
const buoyCount = 24
const buoyAngleDivisor = 12
const firstSandStation = shoreProfile.indexOf(shoreStations.sandEdge)

const slopeSampleRadius = 0.08
const slopeSampleReachM = 0.4
const halfTurnDegrees = 180
const turnDegrees = 360
// The share of the join's fade over which the exact authored ground takes over from the bake.
const seamBlend = 0.1
// Generated shores read damp up to this height above the water.
const generatedWetReachM = 0.35

const shoreShape = createStarterCoast(starterCoastSeed)

// A point on the island's original, authored coast ring.
export function originalCoastPoint(angle: number, radius = 1): Point {
  const scale = radius * shoreShape(angle)
  return { x: Math.cos(angle) * island.width / halves * scale, z: Math.sin(angle) * island.length / halves * scale }
}

// A point along a coast angle at a radius measured against the shore. Where
// Highwood's generated land reaches farther than the original coast, radius 1 is
// the farthest generated shore on that ray and other radii keep their metres
// from it.
export function coastPoint(angle: number, radius = 1): Point {
  const original = originalCoastPoint(angle, radius)
  const share = joinShare(((angle * halfTurnDegrees / Math.PI) % turnDegrees + turnDegrees) % turnDegrees)
  if (share <= 0) return original
  const unit = originalRayLength(angle)
  const reach = bakedReach(angle) + (radius - 1) * unit
  const distance = Math.hypot(original.x, original.z)
  const scale = 1 + share * Math.max(0, reach - distance) / Math.max(distance, 1)
  return { x: original.x * scale, z: original.z * scale }
}

export function coastBounds(radius = 1) {
  const coast = Array.from({ length: coastSegments }, (_, i) => coastPoint(i * halves * Math.PI / coastSegments, radius))
  return {
    west: Math.min(...coast.map(({ x }) => x)),
    east: Math.max(...coast.map(({ x }) => x)),
    south: Math.min(...coast.map(({ z }) => z)),
    north: Math.max(...coast.map(({ z }) => z)),
  }
}

export function buoyBoundaryPoint(angle: number): Point {
  const point = coastPoint(angle)
  const distance = Math.hypot(point.x, point.z)
  const scale = 1 + offshoreLimitMetres / distance
  return { x: point.x * scale, z: point.z * scale }
}

export const boundaryBuoys = Array.from({ length: buoyCount }, (_, i) => buoyBoundaryPoint(i * Math.PI / buoyAngleDivisor))

export function withinSkiffBoundary(point: Point) {
  const angle = coastBearing(point)
  const edge = buoyBoundaryPoint(angle)
  return Math.hypot(point.x, point.z) <= Math.hypot(edge.x, edge.z)
}

export function streamX(z: number) {
  const { x, amplitude, originZ, frequency } = fernfallChannel.centreline
  return x + amplitude * Math.sin((z - originZ) * frequency)
}

export function fernfallSection(z: number) {
  const i = fernfallProfile.findIndex((station) => station.z >= z)
  if (i < 0) return fernfallProfile[fernfallProfile.length - 1]
  if (i === 0) return fernfallProfile[0]
  const a = fernfallProfile[i - 1], b = fernfallProfile[i]
  const t = (z - a.z) / (b.z - a.z)
  const ease = t * t * (smoothstepQuadraticWeight - smoothstepCubicWeight * t)
  return { z, y: a.y + (b.y - a.y) * ease, halfWidth: a.halfWidth + (b.halfWidth - a.halfWidth) * ease }
}

function coastBearing(point: Point) {
  return Math.atan2(point.z / (island.length / halves), point.x / (island.width / halves))
}

function coastRadiusAt(point: Point, bearing: number) {
  return Math.hypot(point.x / (island.width / halves), point.z / (island.length / halves)) / shoreShape(bearing)
}

// Metres from the island's centre to the original coast along a coast angle.
function originalRayLength(bearing: number) {
  return Math.hypot(Math.cos(bearing) * island.width / halves, Math.sin(bearing) * island.length / halves) * shoreShape(bearing)
}

// The radius against the island's original coast, before Highwood.
export function originalCoastRadius(point: Point) {
  return coastRadiusAt(point, coastBearing(point))
}

// 1 at the shore, below 1 inland and above it at sea. On Highwood's generated
// land the radius keeps the original coast's metres per unit, measured from the
// generated shore.
export function coastRadius(point: Point) {
  const bearing = coastBearing(point)
  const original = coastRadiusAt(point, bearing)
  const keep = authoredShare(point, original)
  if (keep >= 1) return original
  const generated = 1 - bakedShoreMetres(point) / originalRayLength(bearing)
  return generated + (original - generated) * keep
}

interface Landform { centre: Point, width: number, length: number, height: number }

function rise(point: Point, { centre, width, length, height }: Landform) {
  const taper = Math.max(0, 1 - ((point.x - centre.x) / width) ** squareExponent - ((point.z - centre.z) / length) ** squareExponent)
  return height * taper * taper
}

function uplandHeight(point: Point, radius: number) {
  const { springShelf, mirrorBasin, mirrorChannel, meadow, northMeadow, grove, headland, coastBlend } = landRelief
  const upland = rise(point, springShelf)
  const channel = Math.max(0, 1 - ((point.x - streamX(point.z)) / mirrorChannel.halfWidth) ** squareExponent)
  const reach = Math.min(1, Math.max(0, (point.z - falls.z) / mirrorChannel.riseLength), Math.max(0, (mirrorChannel.endZ - point.z) / mirrorChannel.endBlend))
  const basin = rise(point, mirrorBasin)
  const edge = Math.min(1, (shoreStations.meadowEdge.radius - radius) / coastBlend)
  let relief = rise(point, meadow) + rise(point, northMeadow) + rise(point, grove) + rise(point, headland)
    + upland - Math.max(basin, channel * reach * mirrorChannel.depth)
  const bed = fernfallChannel.streambed
  if (point.z > bed.minZ && point.z < bed.maxZ && Math.abs(point.x - streamX(point.z)) < bed.bankReach) {
    const section = fernfallSection(point.z)
    const bank = Math.abs(point.x - streamX(point.z)) - section.halfWidth
    const weight = Math.min(1, point.z - bed.minZ, (bed.maxZ - point.z) / bed.outletBlend, Math.max(0, 1 - Math.max(0, bank) / bed.bankBlend))
    const streambed = section.y + Math.max(bed.minOffset, Math.min(bed.maxOffset, bank * bed.bankSlope))
    relief += (streambed - relief) * weight
  }
  return relief * edge * edge * (smoothstepQuadraticWeight - smoothstepCubicWeight * edge)
}

function shellglassHeight(point: Point, shore: number) {
  const { halfWidth, halfLength, bearing, alongRadius, acrossRadius, rimSwell, rimRipple, rimWidth, depth, rimHeight } = shellglassBasin
  const dx = point.x - tidePool.x, dz = point.z - tidePool.z
  if (Math.abs(dx) > halfWidth || Math.abs(dz) > halfLength) return shore
  // A tilted basin with a low seaward sill. The ocean plane fills the hollow.
  const along = dx * bearing.forward - dz * bearing.lateral, across = dx * bearing.lateral + dz * bearing.forward
  const angle = Math.atan2(across / acrossRadius, along / alongRadius)
  const r = Math.hypot(along / alongRadius, across / acrossRadius)
    * (1 + rimSwell.amplitude * Math.sin(rimSwell.frequency * angle + rimSwell.phase) + rimRipple.amplitude * Math.cos(rimRipple.frequency * angle))
  const basin = Math.max(0, 1 - r * r)
  const rim = Math.max(0, 1 - Math.abs(r - 1) / rimWidth)
  return shore - depth * basin * basin + rimHeight * rim * rim
}

function baseGroundHeight(point: Point, radius: number) {
  if (radius <= shoreStations.meadowEdge.radius) return uplandHeight(point, radius)
  for (let i = firstSandStation; i < shoreProfile.length; i++) {
    const a = shoreProfile[i - 1]
    const b = shoreProfile[i]
    if (radius <= b.radius) {
      const shore = a.y + (b.y - a.y) * (radius - a.radius) / (b.radius - a.radius)
      return shellglassHeight(point, shore)
    }
  }
  return shoreProfile[shoreProfile.length - 1].y
}

// The island as it was authored before Highwood. The generator blends into it.
export function authoredGroundHeight(point: Point) {
  return baseGroundHeight(point, originalCoastRadius(point)) + duneRelief(point)
}

// The bake already joins Highwood to the old island (the higher ground wins
// across the join), so beyond protected ground the baked height is the ground.
// In the last `seamBlend` of the join's fade the exact authored ground takes over,
// so the 2 m bake meets the authored surface without a step.
// The island's ground before roads are cut and filled into it: the authored south,
// the baked Highwood terrain and the seam between them.
export function naturalGroundHeight(point: Point) {
  const original = originalCoastRadius(point)
  const keep = authoredShare(point, original)
  if (keep >= 1) return baseGroundHeight(point, original) + duneRelief(point)
  const baked = Math.max(bakedHeight(point), shoreStations.seabed.y)
  if (keep <= 1 - seamBlend) return baked
  const authored = baseGroundHeight(point, original) + duneRelief(point)
  return baked + (authored - baked) * (keep - 1 + seamBlend) / seamBlend
}

// Graded roads (src/worlds/starter/layout/roads.ts) cut and fill the natural ground.
let roadGrading = createRoadGrading(starterRoads, naturalGroundHeight)

// The Workbench road designer previews a draft by grading its roads instead; the
// meshes built afterwards show them. The game always uses the roads in the source tree.
export function previewRoadLayouts(layouts: readonly StarterRoadLayout[]) {
  roadGrading = createRoadGrading(layouts, naturalGroundHeight)
}

// The ground players, wheels and physics stand on: the natural ground with its roads graded in.
export function groundHeight(point: Point) {
  return naturalGroundHeight(point) + roadGrading.delta(point)
}

export const gradedRoads = () => roadGrading.roads()
// What the road surface is built from: the graded roads, the network and its carriageway shape.
export const roadSurfaceSource = {
  roads: () => roadGrading.roads(),
  network: () => roadGrading.network(),
  carriagewayAt: (point: Point) => roadGrading.carriagewayAt(point),
}
// Where the graded roads need culverts, so their hollows drain.
export const roadCulverts = () => roadGrading.culverts()
// Metres from a point to the nearest graded road's edge: scenery and plants keep clear of the formation.
export const roadClearance = (point: Point) => roadGrading.clearance(point)
// How far, in metres, the graded roads moved the ground at a point: their cuts, fills and banks.
export const roadEarthworks = (point: Point) => (roadGrading.near(point) ? Math.abs(roadGrading.delta(point)) : 0)
// What a graded road's surface is at a point: its asphalt apron where it meets a paved road,
// its earth carriageway (junction mouths included), its verge over the shoulders, or none.
export function roadSurfaceAt(point: Point): 'asphalt' | 'earth' | 'verge' | undefined {
  if (!roadGrading.near(point)) return undefined
  const { distance, formation, paved } = roadGrading.carriagewayAt(point)
  if (distance <= 0) return paved < roadNetwork.apronM ? 'asphalt' : 'earth'
  return formation <= 0 ? 'verge' : undefined
}
// Whether a point is under a graded road's ribbon, answered quickly far from any road.
export const underGradedRoad = (point: Point) => roadGrading.near(point) && roadGrading.underRibbon(point)

function crossShoreSlope(point: Point, radius: number, rayLengthM: number) {
  if (Math.abs(radius - shoreStations.sandEdge.radius) > slopeSampleRadius) return 0
  const radialStep = slopeSampleReachM / rayLengthM
  const inland = radius - radialStep, seaward = radius + radialStep
  const near = inland / radius, far = seaward / radius
  const above = baseGroundHeight({ x: point.x * near, z: point.z * near }, inland)
  const below = baseGroundHeight({ x: point.x * far, z: point.z * far }, seaward)
  return Math.abs(above - below) / (slopeSampleReachM + slopeSampleReachM)
}

export function coastalSurface(point: Point, height?: number) {
  const bearing = coastBearing(point)
  const radius = coastRadiusAt(point, bearing)
  const keep = authoredShare(point, radius)
  const ground = height ?? groundHeight(point)
  const rayLengthM = radius > 0 ? Math.hypot(point.x, point.z) / radius : 0
  const authored = keep > 0 ? sampleBeach(point, { bearing, radius, rayLengthM }, ground, crossShoreSlope(point, radius, rayLengthM)) : undefined
  if (keep >= 1 && authored) return authored
  const baked = bakedSurface(point)
  const generated = {
    sand: baked.sand,
    rock: baked.rock,
    wet: 1 - Math.max(0, Math.min(1, (ground - waterLevel) / generatedWetReachM)),
    duneGrass: 0,
  }
  if (!authored) return generated
  return {
    sand: generated.sand + (authored.sand - generated.sand) * keep,
    rock: generated.rock + (authored.rock - generated.rock) * keep,
    wet: generated.wet + (authored.wet - generated.wet) * keep,
    duneGrass: authored.duneGrass * keep,
  }
}

export function waterDepth(point: Point) {
  return Math.max(0, waterLevel - groundHeight(point))
}

let fireWatchBase: number | undefined

// The ground under the tower, which its stairs and deck rise from.
export function fireWatchBaseHeight() {
  fireWatchBase ??= groundHeight(fireWatch)
  return fireWatchBase
}

export function walkingHeight(point: Point) {
  if (onDock(point)) return harborDock.top
  const tower = fireWatchFloor(point)
  return tower === undefined ? groundHeight(point) : Math.max(groundHeight(point), fireWatchBaseHeight() + tower)
}
