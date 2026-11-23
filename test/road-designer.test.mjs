import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRoadDraft } from '../src/workbench/road-draft.ts'
import { suggestRoute } from '../src/workbench/road-suggest.ts'
import { naturalGroundHeight } from '../src/terrain.ts'

test('the road draft adds, extends, splits, deletes and undoes', () => {
  const draft = createRoadDraft()
  draft.discard()
  draft.addRoad({ x: 0, z: 0 }, { x: 40, z: 0 }, 'fire-road')
  const road = draft.road()
  assert.equal(road.points.length, 2)
  draft.extend({ x: 80, z: 10 })
  assert.deepEqual(draft.road().points.at(-1), { x: 80, z: 10 })
  draft.extend({ x: -30, z: 0 })
  assert.deepEqual(draft.road().points[0], { x: -30, z: 0 }, 'a point nearer the start extends the start')
  draft.begin()
  draft.setBend(1, 8)
  draft.insertDot(1, { x: 20, z: 4 })
  assert.equal(draft.road().points.length, 5)
  assert.deepEqual(draft.road().bends.slice(1, 3), [4, 4], 'a split stretch keeps half its bend each side')
  draft.select(draft.road().id, 2)
  draft.deleteDot()
  assert.equal(draft.road().points.length, 4)
  draft.undo()
  assert.equal(draft.road().points.length, 5)
  draft.redo()
  assert.equal(draft.road().points.length, 4)
  draft.setStretchGrade(0, 0.18)
  assert.equal(draft.road().maxGrade[0], 0.18)
  draft.setStretchGrade(0, null)
  assert.equal(draft.road().maxGrade, undefined, 'no overrides left means no override list')
  draft.discard()
})

test('Suggest route finds a grade-limited way up toward Cairn Summit', () => {
  const from = { x: 12, z: 20 }, to = { x: -60, z: 170 }
  const dots = suggestRoute(from, to, 0.12)
  assert.ok(dots && dots.length > 2, 'a route exists within 12%')
  const route = [from, ...dots, to]
  for (let i = 1; i < route.length; i++) assert.ok(Math.hypot(route[i].x - route[i - 1].x, route[i].z - route[i - 1].z) <= 40 + 1e-6, 'no stretch longer than the dot spacing')
  assert.ok(naturalGroundHeight(to) > naturalGroundHeight(from))
  assert.equal(suggestRoute(from, { x: -92, z: 219 }, 0.02), undefined, 'no route up the summit at 2%')
})
