import { beachTrail, ribbonGeometry, road, roadSurface, sidewalkLift, trailLift, walkways } from './routes.ts'
import { groundHeight, walkingHeight } from './terrain.ts'
import type { Point } from './world.ts'

type Vertex = Point & { y: number }

function surfaceRibbon(points: readonly Point[], width: number, height: number, followsTerrain = false) {
  const { positions, indices } = ribbonGeometry([points], width, height)
  const vertices: Vertex[] = []
  for (let i = 0; i < positions.length; i += 3) {
    const point = { x: positions[i], z: positions[i + 2] }
    vertices.push({ ...point, y: positions[i + 1] + (followsTerrain ? groundHeight(point) : 0) })
  }
  return Array.from({ length: indices.length / 3 }, (_, i) => {
    const [a, b, c] = indices.slice(i * 3, i * 3 + 3).map(index => vertices[index])
    return {
      a, b, c,
      minX: Math.min(a.x, b.x, c.x), maxX: Math.max(a.x, b.x, c.x),
      minZ: Math.min(a.z, b.z, c.z), maxZ: Math.max(a.z, b.z, c.z),
      area: (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z),
    }
  })
}

// Match the visible paving triangles, including squared ends and the overlaps at the village junction.
const paving = [
  ...surfaceRibbon(road, roadSurface.width, roadSurface.asphalt),
  ...surfaceRibbon(road, roadSurface.width + roadSurface.shoulderWidth, roadSurface.shoulder),
  ...walkways.flatMap(({ points, width }) => surfaceRibbon(points, width, sidewalkLift)),
  ...surfaceRibbon(beachTrail.points, beachTrail.width, trailLift, true),
]

export function routeContactHeight(point: Point) {
  const { x, z } = point
  let height = walkingHeight(point)
  for (const { a, b, c, minX, maxX, minZ, maxZ, area } of paving) {
    if (x < minX || x > maxX || z < minZ || z > maxZ || !area) continue
    const u = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / area
    const v = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / area
    if (u >= 0 && v >= 0 && u + v <= 1) height = Math.max(height, a.y * u + b.y * v + c.y * (1 - u - v))
  }
  return height
}
