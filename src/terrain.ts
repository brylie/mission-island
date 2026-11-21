import { harborDock, island, onDock } from './world.ts'
import type { Point } from './world.ts'
import { createStarterCoast, starterCoastSeed } from './worlds/starter/coastline.ts'

export const waterLevel = -0.115
export const maxWadeDepth = 0.84
export const offshoreLimitMetres = 75
export const coastSegments = 512

export const shoreProfile = [
  { radius: 0, y: 0 }, { radius: 0.865, y: 0 }, { radius: 0.905, y: -0.015 },
  { radius: 0.978, y: -0.065 }, { radius: 1, y: waterLevel }, { radius: 1.048, y: -0.98 },
  { radius: 1.10, y: -2.15 }, { radius: 1.19, y: -4.3 },
]

export const tidePool = { x: 46, z: -33 }
export const meadowHill = { x: -25, z: 23 }
export const meadowFoot = { x: -26, z: 12 }
export const falls = { x: 11, z: 86 }
export const pool = { x: 23, z: 112 }
export const grove = { x: -50, z: 72 }
export const headland = { x: 39, z: 136 }

const shoreShape = createStarterCoast(starterCoastSeed)

export function coastPoint(angle: number, radius = 1): Point {
  const scale = radius * shoreShape(angle)
  return { x: Math.cos(angle) * island.width / 2 * scale, z: Math.sin(angle) * island.length / 2 * scale }
}

export function coastBounds(radius = 1) {
  const coast = Array.from({ length: coastSegments }, (_, i) => coastPoint(i * 2 * Math.PI / coastSegments, radius))
  return {
    west: Math.min(...coast.map(({ x }) => x)), east: Math.max(...coast.map(({ x }) => x)),
    south: Math.min(...coast.map(({ z }) => z)), north: Math.max(...coast.map(({ z }) => z)),
  }
}

export function buoyBoundaryPoint(angle: number): Point {
  const point = coastPoint(angle)
  const distance = Math.hypot(point.x, point.z)
  const scale = 1 + offshoreLimitMetres / distance
  return { x: point.x * scale, z: point.z * scale }
}

export const boundaryBuoys = Array.from({ length: 24 }, (_, i) => buoyBoundaryPoint(i * Math.PI / 12))

export function withinSkiffBoundary(point: Point) {
  const angle = Math.atan2(point.z / (island.length / 2), point.x / (island.width / 2))
  const edge = buoyBoundaryPoint(angle)
  return Math.hypot(point.x, point.z) <= Math.hypot(edge.x, edge.z)
}

export function streamX(z: number) {
  return 15 + 7 * Math.sin((z - 90) * 0.09)
}

// Surveyed along the course, from the spring shelf to the creek below Fernfall.
// Each pair of ledges has a shallow run followed by a steeper spill.
export const fernfallProfile = [
  { z: 81, y: 4.85, halfWidth: .18 }, { z: 82, y: 4.82, halfWidth: 1.07 },
  { z: 83.6, y: 4.66, halfWidth: .86 }, { z: 85.1, y: 3.42, halfWidth: 1.22 },
  { z: 86.0, y: 3.23, halfWidth: 1.01 }, { z: 88.5, y: .18, halfWidth: 1.55 },
  { z: 89.9, y: waterLevel + .018, halfWidth: 1.86 }, { z: 91.4, y: waterLevel - .04, halfWidth: 2.12 },
]

export function fernfallSection(z: number) {
  const i = fernfallProfile.findIndex((station) => station.z >= z)
  if (i < 0) return fernfallProfile[fernfallProfile.length - 1]
  if (i === 0) return fernfallProfile[0]
  const a = fernfallProfile[i - 1], b = fernfallProfile[i]
  const t = (z - a.z) / (b.z - a.z)
  const ease = t * t * (3 - 2 * t)
  return { z, y: a.y + (b.y - a.y) * ease, halfWidth: a.halfWidth + (b.halfWidth - a.halfWidth) * ease }
}

export function coastRadius(point: Point) {
  const x = point.x / (island.width / 2)
  const z = point.z / (island.length / 2)
  return Math.hypot(x, z) / shoreShape(Math.atan2(z, x))
}

function rise(point: Point, x: number, z: number, width: number, length: number, height: number) {
  const taper = Math.max(0, 1 - ((point.x - x) / width) ** 2 - ((point.z - z) / length) ** 2)
  return height * taper * taper
}

export function groundHeight(point: Point) {
  const radius = coastRadius(point)
  if (radius <= shoreProfile[1].radius) {
    const upland = rise(point, falls.x, falls.z - 4, 18, 10, 5.2)
    const channel = Math.max(0, 1 - ((point.x - streamX(point.z)) / 7.4) ** 2)
    const reach = Math.min(1, Math.max(0, (point.z - falls.z) / 4), Math.max(0, (135 - point.z) / 10))
    const basin = rise(point, pool.x, pool.z, 19, 15, 1.8)
    const edge = Math.min(1, (shoreProfile[1].radius - radius) / 0.055)
    let relief = rise(point, meadowHill.x, meadowHill.z, 16, 14, 2.45) + rise(point, -9, 32, 10, 7.5, 1.55)
      + rise(point, grove.x, grove.z, 33, 34, 9) + rise(point, headland.x, headland.z, 32, 30, 15)
      + upland - Math.max(basin, channel * reach * 1.4)
    if (point.z > 80 && point.z < 93 && Math.abs(point.x - streamX(point.z)) < 4.5) {
      const section = fernfallSection(point.z)
      const bank = Math.abs(point.x - streamX(point.z)) - section.halfWidth
      const weight = Math.min(1, point.z - 80, (93 - point.z) / 1.6, Math.max(0, 1 - Math.max(0, bank) / 1.7))
      const streambed = section.y + Math.max(-.46, Math.min(.42, bank * .74))
      relief += (streambed - relief) * weight
    }
    return relief * edge * edge * (3 - 2 * edge)
  }
  for (let i = 2; i < shoreProfile.length; i++) {
    const a = shoreProfile[i - 1]
    const b = shoreProfile[i]
    if (radius <= b.radius) {
      const shore = a.y + (b.y - a.y) * (radius - a.radius) / (b.radius - a.radius)
      const dx = point.x - tidePool.x, dz = point.z - tidePool.z
      if (Math.abs(dx) > 5 || Math.abs(dz) > 4) return shore
      // A tilted basin with a low seaward sill. The ocean plane fills the hollow.
      const along = dx * .89 - dz * .45, across = dx * .45 + dz * .89
      const bearing = Math.atan2(across / 1.82, along / 2.65)
      const r = Math.hypot(along / 2.65, across / 1.82) * (1 + .085 * Math.sin(3 * bearing + .7) + .045 * Math.cos(5 * bearing))
      const basin = Math.max(0, 1 - r * r)
      const rim = Math.max(0, 1 - Math.abs(r - 1) / .48)
      return shore - .63 * basin * basin + .61 * rim * rim
    }
  }
  return shoreProfile[shoreProfile.length - 1].y
}

export function waterDepth(point: Point) {
  return Math.max(0, waterLevel - groundHeight(point))
}

export function walkingHeight(point: Point) {
  return onDock(point) ? harborDock.top : groundHeight(point)
}
