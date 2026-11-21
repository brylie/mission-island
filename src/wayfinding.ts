import type { Point } from './world.ts'

export type Waypoint = Point & { y: number }

export function waypointsAlongPath(path: readonly Waypoint[], spacing: number) {
  const points: Waypoint[] = []
  if (!Number.isFinite(spacing) || spacing <= 0) return points
  let next = spacing
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i]
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z
    const length = Math.hypot(dx, dy, dz)
    for (; next < length; next += spacing) {
      const t = next / length
      points.push({ x: a.x + dx * t, y: a.y + dy * t, z: a.z + dz * t })
    }
    next -= length
  }
  return points
}
