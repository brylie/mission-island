import { buildingLocal, islandBuildings } from './lots.ts'
import { routes } from './routes.ts'
import { saltwindFeatures } from './site-features.ts'
import { sites } from './sites.ts'
import type { MapPoint } from './sites.ts'

const halfWidthDivisor = 2
const buildingClearance = 0.78
const stopClearance = 2.1
const featureClearance = 1.6
const roadSearchDistance = 65
const minimumForwardAlignment = 0.45
const minimumRoadIncidence = 0.5
const minimumFrontWalk = 0.6
const frontWalkStep = 0.7
const doorwayOffset = 1.31
const cemeteryGateX = 20
const cemeteryGateZ = 176.7
const cemeterySteps = 33
const cemeteryStep = 0.7

const roads = routes.flatMap((route) => route.samples.map((p) => ({ ...p, halfWidth: route.width / halfWidthDivisor })))
const civic = new Set(['market', 'apartments', 'shop', 'police', 'school', 'church', 'cottage'])

function clearWalk(point: MapPoint) {
  for (const b of islandBuildings) {
    const local = buildingLocal(point, b)
    if (Math.abs(local.x) < b.width / halfWidthDivisor + buildingClearance && Math.abs(local.z) < b.depth / halfWidthDivisor + buildingClearance) return false
  }
  return sites.every(({ stop }) => Math.hypot(point.x - stop.x, point.z - stop.z) > stopClearance)
    && saltwindFeatures.every((f) => Math.hypot(f.x - point.x, f.z - point.z) > featureClearance)
}

function frontWalk(start: MapPoint, facing: number) {
  const candidates = roads.map((p) => {
    const dx = p.x - start.x, dz = p.z - start.z
    return { p, dx, dz, distance: Math.hypot(dx, dz) }
  }).filter(({ dx, dz, distance }) => distance < roadSearchDistance && dx * Math.sin(facing) + dz * Math.cos(facing) > distance * minimumForwardAlignment)
    .sort((a, b) => a.distance - b.distance)
  for (const { p, dx, dz, distance } of candidates) {
    const incidence = Math.abs((dx * Math.cos(p.yaw) - dz * Math.sin(p.yaw)) / distance)
    if (incidence < minimumRoadIncidence) continue
    const length = distance - p.halfWidth / incidence
    if (length < minimumFrontWalk) continue
    const segments = Math.ceil(length / frontWalkStep)
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
  points: frontWalk({ x: b.x + Math.sin(b.facing) * (b.depth / halfWidthDivisor + doorwayOffset), z: b.z + Math.cos(b.facing) * (b.depth / halfWidthDivisor + doorwayOffset) }, b.facing),
}))
const gate = { x: cemeteryGateX, z: cemeteryGateZ }
const centralAisle = Array.from({ length: cemeterySteps }, (_, i) => ({ x: gate.x, z: gate.z + (cemeterySteps - i) * cemeteryStep }))
villageWalks.push({ name: 'cemetery', points: [...centralAisle, ...frontWalk(gate, Math.PI)] })
