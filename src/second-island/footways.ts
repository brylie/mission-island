import { buildingLocal, islandBuildings } from './lots.ts'
import { routes } from './routes.ts'
import { saltwindFeatures } from './site-features.ts'
import { sites } from './sites.ts'
import type { MapPoint } from './sites.ts'

const roads = routes.flatMap((route) => route.samples.map((p) => ({ ...p, halfWidth: route.width / 2 })))
const civic = new Set(['market', 'apartments', 'shop', 'police', 'school', 'church', 'cottage'])

function clearWalk(point: MapPoint) {
  for (const b of islandBuildings) {
    const local = buildingLocal(point, b)
    if (Math.abs(local.x) < b.width / 2 + 0.78 && Math.abs(local.z) < b.depth / 2 + 0.78) return false
  }
  return sites.every(({ stop }) => Math.hypot(point.x - stop.x, point.z - stop.z) > 2.1)
    && saltwindFeatures.every((f) => Math.hypot(f.x - point.x, f.z - point.z) > 1.6)
}

function frontWalk(start: MapPoint, facing: number) {
  const candidates = roads.map((p) => {
    const dx = p.x - start.x, dz = p.z - start.z
    return { p, dx, dz, distance: Math.hypot(dx, dz) }
  }).filter(({ dx, dz, distance }) => distance < 65 && dx * Math.sin(facing) + dz * Math.cos(facing) > distance * 0.45)
    .sort((a, b) => a.distance - b.distance)
  for (const { p, dx, dz, distance } of candidates) {
    const incidence = Math.abs((dx * Math.cos(p.yaw) - dz * Math.sin(p.yaw)) / distance)
    if (incidence < 0.5) continue
    const length = distance - p.halfWidth / incidence
    if (length < 0.6) continue
    const segments = Math.ceil(length / 0.7)
    const points = Array.from({ length: segments + 1 }, (_, i) => ({
      x: start.x + dx / distance * length * i / segments,
      z: start.z + dz / distance * length * i / segments,
    }))
    if (points.every(clearWalk)) return points
  }
  return []
}

export const villageWalks = islandBuildings.filter((b) => civic.has(b.kind)).map((b) => ({
  name: b.site,
  points: frontWalk({ x: b.x + Math.sin(b.facing) * (b.depth / 2 + 1.31), z: b.z + Math.cos(b.facing) * (b.depth / 2 + 1.31) }, b.facing),
}))
const gate = { x: 20, z: 176.7 }
const centralAisle = Array.from({ length: 33 }, (_, i) => ({ x: gate.x, z: gate.z + (33 - i) * 0.7 }))
villageWalks.push({ name: 'cemetery', points: [...centralAisle, ...frontWalk(gate, Math.PI)] })
