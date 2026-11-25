import { fireWatch, fireWatchFloor } from './fire-watch.ts'
import { baseGroundHeight, coastBearing, coastRadiusAt, naturalGroundHeight } from './natural-ground.ts'
import { roadDelta } from './roads.ts'
import { harborDock, onDock } from './world.ts'
import type { Point } from './world.ts'
import { sampleBeach } from './worlds/starter/beach-landforms.ts'
import { authoredShare } from './worlds/starter/generation/protection.ts'
import { bakedSurface } from './worlds/starter/highwood-terrain.ts'
import { shoreStations, waterLevel } from './worlds/starter/layout/terrain.ts'

// The ground players, wheels and physics stand on, and the water and shore over it. The natural
// ground lives in src/natural-ground.ts and the graded roads in src/roads.ts; this joins them.
export { authoredGroundHeight, boundaryBuoys, buoyBoundaryPoint, coastBounds, coastPoint, coastRadius, coastSegments, falls, fernfallProfile, fernfallSection, grove, headland, maxWadeDepth, meadowFoot, meadowHill, naturalGroundHeight, offshoreLimitMetres, originalCoastPoint, originalCoastRadius, pool, shoreProfile, streamX, tidePool, waterLevel, withinSkiffBoundary } from './natural-ground.ts'

const slopeSampleRadius = 0.08
const slopeSampleReachM = 0.4
// Generated shores read damp up to this height above the water.
const generatedWetReachM = 0.35

// The ground players, wheels and physics stand on: the natural ground with its roads graded in.
export function groundHeight(point: Point) {
  return naturalGroundHeight(point) + roadDelta(point)
}

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
