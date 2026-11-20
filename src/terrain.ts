import { harborDock, island, onDock } from './world.ts'
import type { Point } from './world.ts'

export const waterLevel = -0.115
export const maxWadeDepth = 0.84
export const offshoreLimitMetres = 75

export const shoreProfile = [
  { radius: 0, y: 0 }, { radius: 0.865, y: 0 }, { radius: 0.905, y: -0.015 },
  { radius: 0.978, y: -0.065 }, { radius: 1, y: waterLevel }, { radius: 1.048, y: -0.98 },
  { radius: 1.10, y: -2.15 }, { radius: 1.19, y: -4.3 },
]

export const falls = { x: 11, z: 86 }
export const pool = { x: 23, z: 112 }
export const grove = { x: -50, z: 72 }
export const headland = { x: 39, z: 136 }

function shoreShape(angle: number) {
  const northern = Math.max(0, Math.sin(angle))
  return (1 + 2.85 * northern ** 2) * (1 + Math.sin(angle * 5 + 0.2) * 0.018 + Math.cos(angle * 9) * 0.013)
}

export function coastPoint(angle: number, radius = 1): Point {
  const scale = radius * shoreShape(angle)
  return { x: Math.cos(angle) * island.width / 2 * scale, z: Math.sin(angle) * island.length / 2 * scale }
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
    const relief = rise(point, -25, 23, 16, 14, 2.45) + rise(point, -9, 32, 10, 7.5, 1.55)
      + rise(point, grove.x, grove.z, 33, 34, 9) + rise(point, headland.x, headland.z, 32, 30, 15)
      + upland - Math.max(basin, channel * reach * 1.4)
    return relief * edge * edge * (3 - 2 * edge)
  }
  for (let i = 2; i < shoreProfile.length; i++) {
    const a = shoreProfile[i - 1]
    const b = shoreProfile[i]
    if (radius <= b.radius) return a.y + (b.y - a.y) * (radius - a.radius) / (b.radius - a.radius)
  }
  return shoreProfile[shoreProfile.length - 1].y
}

export function waterDepth(point: Point) {
  return Math.max(0, waterLevel - groundHeight(point))
}

export function walkingHeight(point: Point) {
  return onDock(point) ? harborDock.top : groundHeight(point)
}
