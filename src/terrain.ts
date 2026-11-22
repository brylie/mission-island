import { harborDock, island, onDock } from './world.ts'
import type { Point } from './world.ts'
import { duneRelief, sampleBeach } from './worlds/starter/beach-landforms.ts'
import { createStarterCoast, starterCoastSeed } from './worlds/starter/coastline.ts'
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

const shoreShape = createStarterCoast(starterCoastSeed)

export function coastPoint(angle: number, radius = 1): Point {
  const scale = radius * shoreShape(angle)
  return { x: Math.cos(angle) * island.width / halves * scale, z: Math.sin(angle) * island.length / halves * scale }
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
  const angle = Math.atan2(point.z / (island.length / halves), point.x / (island.width / halves))
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

export function coastRadius(point: Point) {
  const x = point.x / (island.width / halves)
  const z = point.z / (island.length / halves)
  return Math.hypot(x, z) / shoreShape(Math.atan2(z, x))
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

export function groundHeight(point: Point) {
  return baseGroundHeight(point, coastRadius(point)) + duneRelief(point)
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
  const radius = coastRadius(point)
  const rayLengthM = radius > 0 ? Math.hypot(point.x, point.z) / radius : 0
  const ground = height ?? baseGroundHeight(point, radius) + duneRelief(point)
  return sampleBeach(point, radius, rayLengthM, ground, crossShoreSlope(point, radius, rayLengthM))
}

export function waterDepth(point: Point) {
  return Math.max(0, waterLevel - groundHeight(point))
}

export function walkingHeight(point: Point) {
  return onDock(point) ? harborDock.top : groundHeight(point)
}
