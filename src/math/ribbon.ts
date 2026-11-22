import { distance, type Point } from '../world.ts'

const coordinatesPerVertex = 3
const verticesPerSection = 2

export function ribbonGeometry(strips: ReadonlyArray<readonly Point[]>, width: number, y: number) {
  const positions: number[] = []
  const indices: number[] = []
  for (const points of strips) {
    const base = positions.length / coordinatesPerVertex
    for (const [i, point] of points.entries()) {
      const before = points[Math.max(0, i - 1)]
      const after = points[Math.min(i + 1, points.length - 1)]
      const span = distance(before, after)
      const halfWidth = width / (span + span)
      const x = (before.z - after.z) * halfWidth
      const z = (after.x - before.x) * halfWidth
      positions.push(point.x + x, y, point.z + z, point.x - x, y, point.z - z)
      if (i > 0) {
        const left = base + (i - 1) * verticesPerSection
        const right = left + 1
        const nextLeft = left + verticesPerSection
        const nextRight = nextLeft + 1
        indices.push(left, right, nextLeft, right, nextRight, nextLeft)
      }
    }
  }
  return { positions, indices }
}
