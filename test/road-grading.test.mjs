import assert from 'node:assert/strict'
import { test } from 'node:test'
import { roadKinds } from '../src/assets/geometry/route-profiles.ts'
import { createRoadGrading } from '../src/road-grading.ts'
import { groundHeight, naturalGroundHeight } from '../src/terrain.ts'

// Ground that rises across the road (a side slope) and along it (a hill too steep to follow).
const natural = ({ x, z }) => z * 0.25 + Math.max(0, Math.min(20, (x - 60) * 0.4))
const layout = { id: 'test', name: 'Test road', kind: 'fire-road', points: [{ x: 0, z: 0 }, { x: 160, z: 0 }], bends: [0] }
const kind = roadKinds['fire-road']
const onRoadM = 0.08
const farM = 40
const slopeSlack = 0.15
const sideStepM = 0.5

test('graded ground follows the road profile and eases back to natural ground on batters', () => {
  const grading = createRoadGrading([layout], natural)
  const ground = (point) => natural(point) + grading.delta(point)
  const [road] = grading.roads()
  for (const sample of road.profile.filter((_, i) => i % 10 === 5)) {
    assert.ok(Math.abs(ground(sample) - sample.y) < onRoadM, `centre at ${sample.along.toFixed(0)} m is ${ground(sample).toFixed(2)}, profile ${sample.y.toFixed(2)}`)
    // Across the formation the road is level apart from its crown.
    const edge = { x: sample.x, z: sample.z + road.halfWidth }
    assert.ok(Math.abs(ground(edge) - (sample.y - kind.crown)) < onRoadM)
    assert.equal(grading.delta({ x: sample.x, z: sample.z + farM }), 0, 'far from the road the ground is untouched')
    assert.equal(grading.delta({ x: sample.x, z: sample.z - farM }), 0)
    // Batters never stand steeper than their slope.
    for (let side = road.halfFormation + 1; side < road.halfFormation + 10; side += sideStepM) {
      for (const direction of [1, -1]) {
        const a = ground({ x: sample.x, z: sample.z + direction * side }), b = ground({ x: sample.x, z: sample.z + direction * (side + sideStepM) })
        const rise = Math.abs(b - a) / sideStepM
        assert.ok(rise <= Math.max(1 / kind.cutSlope, 1 / kind.fillSlope, 0.25) + slopeSlack, `batter at ${side} m rises ${rise.toFixed(2)}`)
      }
    }
  }
  assert.ok(grading.clearance(road.profile[40]) < 0, 'the centreline is inside the formation')
  assert.equal(grading.clearance({ x: 80, z: 200 }), Infinity)
})

test('the shipped island has no graded roads until one is laid, so the ground is the natural ground', () => {
  for (const point of [{ x: 12, z: 20 }, { x: -92, z: 219 }, { x: -290, z: 300 }]) assert.equal(groundHeight(point), naturalGroundHeight(point))
})
