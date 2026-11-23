import assert from 'node:assert/strict'
import { test } from 'node:test'
import { roadKinds } from '../src/assets/geometry/route-profiles.ts'
import { roadSuggestion } from '../src/assets/recipes/workbench-roads.ts'
import { analyseRoad } from '../src/workbench/road-analysis.ts'
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
  const suggestion = suggestRoute(from, to, 0.12)
  assert.ok(suggestion && suggestion.dots.length > 2, 'a route exists within 12%')
  assert.equal(suggestion.bends.length, suggestion.dots.length + 1, 'a bend for every stretch')
  const route = [from, ...suggestion.dots, to]
  for (let i = 1; i < route.length; i++) assert.ok(Math.hypot(route[i].x - route[i - 1].x, route[i].z - route[i - 1].z) <= roadSuggestion.maxDotSpacingM + roadSuggestion.minDotSpacingM + 1e-6, 'no stretch much longer than the dot spacing')
  assert.ok(naturalGroundHeight(to) > naturalGroundHeight(from))
  // The suggested road bends no tighter than the Fire and Rescue pickup can turn.
  const { radii } = analyseRoad({ id: 'suggested', name: 'Suggested', kind: 'fire-road', points: route, bends: suggestion.bends, maxGrade: suggestion.bends.map(() => 0.12) })
  assert.ok(Math.min(...radii) >= roadKinds['fire-road'].minTurnRadiusM, `tightest bend ${Math.min(...radii).toFixed(1)} m`)
  assert.equal(suggestRoute(from, { x: -92, z: 219 }, 0.02), undefined, 'no route up the summit at 2%')
})

test('Suggest route keeps a road straight where a straight road holds the grade', () => {
  // The valley west of Cairn rises gently: a road builder runs straight up it.
  const from = { x: -112, z: 109 }, to = { x: -256, z: 294 }
  const suggestion = suggestRoute(from, to, 0.12)
  const route = [from, ...suggestion.dots, to]
  const length = route.slice(1).reduce((sum, point, i) => sum + Math.hypot(point.x - route[i].x, point.z - route[i].z), 0)
  const straightLine = Math.hypot(to.x - from.x, to.z - from.z), slack = 1.01
  assert.ok(length < straightLine * slack, `${length.toFixed(0)} m against ${straightLine.toFixed(0)} m in a straight line`)
  assert.deepEqual(suggestion.bends.filter((bend) => bend !== 0), [], 'no stretch is bent')
})
