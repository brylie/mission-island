import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clipOutsideRoads } from '../src/clip-under-roads.ts'

test('a mesh is cut to the ground outside the roads, sharing the vertices it adds', () => {
  // Two triangles over a unit square; the field is negative (under a road) on the left.
  const positions = [0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1]
  const field = [-1, 1, 1, -1]
  const { layers: [cut], indices } = clipOutsideRoads([{ values: positions, size: 3 }], [0, 1, 2, 0, 2, 3], field)
  // Every kept corner is outside the road or on its edge, at x = 0.5.
  for (const v of indices) assert.ok(cut[v * 3] >= 0.5 - 1e-9, `vertex at x ${cut[v * 3]}`)
  // The diagonal's crossing is one shared vertex, not two.
  const added = cut.length / 3 - positions.length / 3
  assert.equal(added, 3)
  // Nothing under the road is kept.
  assert.equal(clipOutsideRoads([{ values: positions, size: 3 }], [0, 1, 2], [-1, -1, -1]).indices.length, 0)
})
