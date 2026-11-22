import { corridorOverlay, habitatOverlay, protectedOverlay, slopeOverlay, solidsOverlay } from '../assets/recipes/debug-overlays.ts'
import { roadSurface } from '../assets/geometry/route-profiles.ts'
import { barrierSolids, deckSolids } from '../ferry-repair.ts'
import { juniperCenter, juniperLayout } from '../juniper-habitat.ts'
import { footpaths, roads } from '../routes.ts'
import { coastBounds, coastRadius, groundHeight } from '../terrain.ts'
import type { Point } from '../world.ts'
import { starterSolids } from '../worlds/starter/colliders.ts'
import { ridgeCourseLayout } from '../worlds/starter/layout/sites.ts'
import { fieldLayer, type OverlayLayer, type OverlayPrimitive } from './registry.ts'

const half = 0.5
const halfTurnDegrees = 180
const radiansToDegrees = halfTurnDegrees / Math.PI
const ringSegments = 32
const fullTurn = Math.PI + Math.PI

export function ring(center: Point, radius: number, segments = ringSegments): Point[] {
  return Array.from({ length: segments }, (_, i) => ({ x: center.x + radius * Math.cos(i * fullTurn / segments), z: center.z + radius * Math.sin(i * fullTurn / segments) }))
}

// Offsets a polyline sideways, for the edges of a road or path corridor.
function sideline(points: readonly Point[], offsetM: number): Point[] {
  return points.map((point, i) => {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)]
    const length = Math.hypot(b.x - a.x, b.z - a.z) || 1
    return { x: point.x - (b.z - a.z) / length * offsetM, z: point.z + (b.x - a.x) / length * offsetM }
  })
}

interface Box extends Point { halfWidth: number, halfDepth: number, cos: number, sin: number }

function boxOutline(box: Box, color: string): OverlayPrimitive {
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => {
    const lx = u * box.halfWidth, lz = v * box.halfDepth
    return { x: box.x + lx * box.cos + lz * box.sin, z: box.z - lx * box.sin + lz * box.cos }
  })
  return { kind: 'line', points: corners, color, closed: true }
}

function slopeDegrees(point: Point) {
  const step = slopeOverlay.sampleStepM
  const dx = groundHeight({ x: point.x + step, z: point.z }) - groundHeight({ x: point.x - step, z: point.z })
  const dz = groundHeight({ x: point.x, z: point.z + step }) - groundHeight({ x: point.x, z: point.z - step })
  return Math.atan(Math.hypot(dx, dz) / (step + step)) * radiansToDegrees
}

export const slopeLayer = fieldLayer({
  id: 'slope',
  label: 'Terrain slope',
  description: 'Ground slope in degrees: green is flat, red is steep.',
  bounds: coastBounds(),
  cellM: slopeOverlay.cellM,
  sample: (point) => coastRadius(point) <= 1 ? slopeDegrees(point) : undefined,
  ramp: slopeOverlay.ramp,
})

export const habitatLayer: OverlayLayer = {
  id: 'habitat',
  label: 'Habitat patches',
  description: 'Juniper Hollow cover and forage patches, coloured by kind, inside the habitat boundary.',
  live: false,
  create: () => () => [
    { kind: 'line', points: ring(juniperCenter, habitatOverlay.boundaryRadiusM), color: habitatOverlay.boundaryColor, closed: true },
    ...juniperLayout.patches.map((patch): OverlayPrimitive => ({
      kind: 'ring',
      x: juniperCenter.x + patch.x,
      z: juniperCenter.z + patch.z,
      radius: habitatOverlay.patchRadiusM,
      color: (habitatOverlay.colors as Record<string, string>)[patch.kind] ?? habitatOverlay.fallback,
    })),
  ],
}

export const solidsLayer: OverlayLayer = {
  id: 'solids',
  label: 'Walking solids and colliders',
  description: 'Blue: solids the crew walks against and cargo collides with. Pink: ferry deck and barrier colliders used by cargo physics.',
  live: false,
  create: () => () => [
    ...starterSolids.map((solid) => boxOutline(solid, solidsOverlay.walking)),
    ...[...barrierSolids, ...deckSolids].map((solid) => boxOutline(solid, solidsOverlay.cargo)),
  ],
}

export const corridorLayer: OverlayLayer = {
  id: 'corridors',
  label: 'Road and footpath corridors',
  description: 'Road shoulders in grey and footpath edges in tan, with white centrelines.',
  live: false,
  create: () => () => [
    ...roads.flatMap((path): OverlayPrimitive[] => {
      const reach = (roadSurface.width + roadSurface.shoulderWidth) * half
      return [{ kind: 'line', points: sideline(path, reach), color: corridorOverlay.road }, { kind: 'line', points: sideline(path, -reach), color: corridorOverlay.road }, { kind: 'line', points: path, color: corridorOverlay.centre }]
    }),
    ...footpaths.flatMap(({ points, width }): OverlayPrimitive[] => [
      { kind: 'line', points: sideline(points, width * half), color: corridorOverlay.footpath },
      { kind: 'line', points: sideline(points, -width * half), color: corridorOverlay.footpath },
      { kind: 'line', points, color: corridorOverlay.centre },
    ]),
  ],
}

// The Windstone reserve from the biome brief: launch clearance, the approach lane, the landing circle and the walk back.
function approachLane(): Point[] {
  const { launch, meadow, approach } = ridgeCourseLayout
  const length = Math.hypot(meadow.x - launch.x, meadow.z - launch.z)
  const along = { x: (meadow.x - launch.x) / length, z: (meadow.z - launch.z) / length }
  const side = { x: -along.z * approach.halfWidth, z: along.x * approach.halfWidth }
  const start = { x: meadow.x + along.x * approach.start, z: meadow.z + along.z * approach.start }
  return [{ x: start.x + side.x, z: start.z + side.z }, { x: meadow.x + side.x, z: meadow.z + side.z }, { x: meadow.x - side.x, z: meadow.z - side.z }, { x: start.x - side.x, z: start.z - side.z }]
}

export const protectedLayer: OverlayLayer = {
  id: 'protected',
  label: 'Protected areas',
  description: 'Windstone launch clearance, landing approach and meadow circle, and the walk back to the launch.',
  live: false,
  create: () => () => {
    const { launch, meadow, returnTrail, landingRadius } = ridgeCourseLayout
    return [
      { kind: 'line', points: ring(launch, protectedOverlay.launchClearanceM), color: protectedOverlay.launch, closed: true },
      { kind: 'line', points: approachLane(), color: protectedOverlay.approach, closed: true },
      { kind: 'line', points: ring(meadow, landingRadius), color: protectedOverlay.meadow, closed: true },
      { kind: 'line', points: [meadow, returnTrail, launch], color: protectedOverlay.returnTrail },
    ]
  },
}
