import assert from 'node:assert/strict'
import { test } from 'node:test'
import { roadKinds } from '../src/assets/geometry/road-kinds.ts'
import { roadDesignerLook, roadSuggestion } from '../src/assets/recipes/workbench-roads.ts'
import { createRoadGrading } from '../src/road-grading.ts'
import { analyseRoad, dotAlongs, gradeBand } from '../src/workbench/road-analysis.ts'
import { roadSummary, sectionReadout, stretchHint } from '../src/workbench/road-inspector.ts'
import { createRoadDraft, roadsHash } from '../src/workbench/road-draft.ts'
import { starterRoads } from '../src/worlds/starter/layout/roads.ts'
import { suggestRoute } from '../src/workbench/road-suggest.ts'
import { naturalGroundHeight } from '../src/terrain.ts'

test('undo and discard clear a selected dot the restored roads may not have', () => {
  const draft = createRoadDraft()
  draft.discard()
  draft.addRoad({ x: 0, z: 0 }, { x: 40, z: 0 }, 'fire-road')
  draft.extend({ x: 80, z: 10 })
  assert.equal(draft.selectedDot(), 2, 'extending selects the new end')
  draft.undo()
  assert.equal(draft.selectedDot(), undefined)
  // Deleting with nothing selected leaves the road whole: one bend per stretch.
  draft.deleteDot()
  assert.equal(draft.road().bends.length, draft.road().points.length - 1)
  draft.select(draft.road().id, 1)
  draft.discard()
  assert.equal(draft.selectedDot(), undefined)
})

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

function fakeStorage(t, initial) {
  const data = new Map(initial)
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
  } } })
  t.after(() => {
    delete globalThis.window
  })
  return data
}

test('the road draft knows what it can undo and keeps the grading order', (t) => {
  fakeStorage(t)
  const draft = createRoadDraft()
  assert.equal(draft.canUndo(), false)
  assert.equal(draft.canRedo(), false)
  const [first, second] = draft.roads().map((road) => road.id)
  draft.select(second)
  draft.moveRoad(-1)
  assert.deepEqual(draft.roads().slice(0, 2).map((road) => road.id), [second, first])
  draft.moveRoad(-1)
  assert.equal(draft.roads()[0].id, second, 'the first road cannot move further up')
  assert.equal(draft.canUndo(), true)
  draft.undo()
  assert.equal(draft.roads()[0].id, first)
  assert.equal(draft.canRedo(), true)
})

test('a draft warns when roads.ts changed after it began', (t) => {
  const key = 'mission-island-road-draft'
  const edited = starterRoads.map((road, i) => i ? road : { ...road, name: 'Renamed' })
  // A draft begun from other roads, with a base that is not today's source.
  const data = fakeStorage(t, [[key, JSON.stringify({ base: ['older'], roads: edited })]])
  const draft = createRoadDraft()
  assert.equal(draft.sourceChanged(), true)
  draft.markSaved()
  assert.equal(draft.sourceChanged(), false, 'a saved draft is the source')
  assert.ok(JSON.parse(data.get(key)).base.includes(roadsHash(edited)), 'the roads.ts this save writes is known after the reload')
  // A draft kept as a bare list, from before the base was stored, still loads.
  data.set(key, JSON.stringify(edited))
  assert.equal(createRoadDraft().roads()[0].name, 'Renamed')
  // A draft that matches the source has nothing to overwrite, whatever its base.
  data.set(key, JSON.stringify({ base: ['older'], roads: starterRoads }))
  assert.equal(createRoadDraft().sourceChanged(), false)
  // Discard starts again from the source, and undoing it brings the warning back.
  data.set(key, JSON.stringify({ base: ['older'], roads: edited }))
  const stale = createRoadDraft()
  stale.discard()
  assert.equal(stale.sourceChanged(), false)
  stale.undo()
  assert.equal(stale.sourceChanged(), true)
  assert.equal(roadsHash([{ ...starterRoads[0], points: starterRoads[0].points.map(({ x, z }) => ({ x: x + 0.001, z })) }]), roadsHash([starterRoads[0]]), 'the hash rounds as Save does')
})

test('grade bands follow each stretch\'s own limit', () => {
  assert.equal(gradeBand(0.03, 0.12), 'easy')
  assert.equal(gradeBand(0.08, 0.12), 'steady')
  assert.equal(gradeBand(0.1, 0.12), 'limit', 'within a fifth of a 12% limit')
  assert.equal(gradeBand(0.1, 0.15), 'steady', 'the same grade is steady under a 15% limit')
  assert.equal(gradeBand(-0.14, 0.12), 'over', 'downhill counts too')
  assert.equal(gradeBand(0.05, 0.06), 'limit', 'a gentle limit is near sooner than the easy grade')
})

test('the designer reads a road out in words', () => {
  // A straight road from the shore up a steep face: grade problems all the way.
  const road = { id: 'steep', name: 'Steep test', kind: 'fire-road', points: [{ x: 12, z: 20 }, { x: -60, z: 170 }, { x: -92, z: 219 }], bends: [0, 0] }
  const analysis = analyseRoad(createRoadGrading([road], naturalGroundHeight, []).roads()[0])
  assert.ok(analysis.warningTotal >= analysis.warnings.length)
  assert.ok(analysis.warnings.length <= roadDesignerLook.maxWarnings)
  const alongs = dotAlongs(analysis, road.points.length)
  assert.equal(alongs[0], 0)
  assert.ok(alongs[1] > 0 && alongs[1] < alongs[2], 'each dot sits further along than the one before')
  assert.equal(alongs[2], analysis.graded.profile.at(-1).along)
  assert.match(roadSummary(road, analysis), /^Steep test: 3 dots · \d+ m · /)
  const capped = { ...analysis, warnings: analysis.warnings.slice(0, 1), warningTotal: 5 }
  assert.match(roadSummary(road, capped), /1 shown of 5 problems/)
  assert.match(sectionReadout(analysis, undefined), /^Steepest: \d+% at \d+ m \(limit 12%\)/)
  assert.match(sectionReadout(analysis, alongs[1]), /^At \d+ m: grade \d+% \(limit 12%\), road/)
  assert.equal(stretchHint(road, undefined), 'Select a dot to set its stretch limit')
  assert.match(stretchHint(road, 1), /Dot 2 to the next; empty uses the fire road limit, 12%/)
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
  const suggested = { id: 'suggested', name: 'Suggested', kind: 'fire-road', points: route, bends: suggestion.bends, maxGrade: suggestion.bends.map(() => 0.12) }
  const { radii } = analyseRoad(createRoadGrading([suggested], naturalGroundHeight, []).roads()[0])
  assert.ok(Math.min(...radii) >= roadKinds['fire-road'].minTurnRadiusM, `tightest bend ${Math.min(...radii).toFixed(1)} m`)
  assert.equal(suggestRoute(from, { x: -92, z: 219 }, 0.02), undefined, 'no route up the summit at 2%')
})

test('Suggest route keeps a road straight where a straight road holds the grade', () => {
  // The country south-west of Cairn rises gently: a road builder runs straight across it.
  const from = { x: -112, z: 107 }, to = { x: -172, z: 167 }
  const suggestion = suggestRoute(from, to, 0.12)
  const route = [from, ...suggestion.dots, to]
  const length = route.slice(1).reduce((sum, point, i) => sum + Math.hypot(point.x - route[i].x, point.z - route[i].z), 0)
  const straightLine = Math.hypot(to.x - from.x, to.z - from.z), slack = 1.01
  assert.ok(length < straightLine * slack, `${length.toFixed(0)} m against ${straightLine.toFixed(0)} m in a straight line`)
  assert.deepEqual(suggestion.bends.filter((bend) => bend !== 0), [], 'no stretch is bent')
})

test('Suggest route switches back up a slope too steep to climb straight, in hairpins the pickup can take', () => {
  // A 35 % plane, 31.5 m to climb at no more than 15 %: at least 210 m of road.
  const plane = ({ z }) => z * 0.35 + 5
  const from = { x: 0, z: 0 }, to = { x: 0, z: 90 }
  const suggestion = suggestRoute(from, to, 0.15, plane)
  assert.ok(suggestion, 'a switchback route exists')
  const points = [from, ...suggestion.dots, to]
  const [road] = createRoadGrading([{ id: 'switchback', name: 'Switchback', kind: 'fire-road', points, bends: suggestion.bends, maxGrade: suggestion.bends.map(() => 0.15) }], plane, []).roads()
  const length = road.profile.at(-1).along, least = 31.5 / 0.15
  assert.ok(length >= least * 0.95 && length < least * 1.35, `${length.toFixed(0)} m of road for ${least} m of climb`)
  const { radii } = analyseRoad(road)
  assert.ok(Math.min(...radii) >= roadKinds['fire-road'].minTurnRadiusM, `tightest bend ${Math.min(...radii).toFixed(1)} m`)
  assert.ok(Math.max(...road.profile.map((sample) => Math.abs(sample.grade))) <= 0.15 + 0.005, 'the road holds its grade')
})
