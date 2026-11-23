import assert from 'node:assert/strict'
import { test } from 'node:test'
import { roadKinds } from '../src/assets/geometry/route-profiles.ts'
import { createRoadGrading } from '../src/road-grading.ts'
import { groundHeight, naturalGroundHeight } from '../src/terrain.ts'
import { analyseRoad } from '../src/workbench/road-analysis.ts'
import { starterRoads } from '../src/worlds/starter/layout/roads.ts'

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

test('a branch leaves its road level, without a step or a second cut', () => {
  // The branch leaves the trunk where the trunk runs in cut through the hill, and climbs
  // a gentle side slope it can hold within its grade.
  const gentle = ({ x, z }) => z * 0.05 + Math.max(0, Math.min(20, (x - 60) * 0.4))
  const branch = { id: 'branch', name: 'Branch', kind: 'fire-road', points: [{ x: 100, z: 0 }, { x: 100, z: 60 }], bends: [0] }
  const grading = createRoadGrading([layout, branch], gentle)
  const ground = (point) => gentle(point) + grading.delta(point)
  const trunkOnly = createRoadGrading([layout], gentle)
  const [trunk, climb] = grading.roads()
  const atJunction = trunk.profile.find((sample) => sample.x >= 100)
  assert.ok(atJunction.cut > 1, 'the junction is in cut, where a second cut would show')
  assert.ok(Math.abs(climb.profile[0].y - atJunction.y) < onRoadM, 'the branch starts level with the trunk')
  // Up the branch the ground is the branch's own profile, rising smoothly off the trunk.
  for (const sample of climb.profile.slice(0, 16)) assert.ok(Math.abs(ground(sample) - sample.y) < onRoadM, `${ground(sample).toFixed(2)} on the branch at ${sample.along} m, profile ${sample.y.toFixed(2)}`)
  // Across the trunk from the branch, the trunk's bed and cut bank are as the trunk alone left them.
  for (const x of [97, 100, 103]) {
    for (const z of [-2, -4, -6]) {
      const alone = gentle({ x, z }) + trunkOnly.delta({ x, z })
      assert.ok(Math.abs(ground({ x, z }) - alone) < onRoadM + kind.crown, `(${x}, ${z}) is ${ground({ x, z }).toFixed(2)}, the trunk alone ${alone.toFixed(2)}`)
    }
  }
})

test('the shipped fire roads keep to their grades, bends and earthworks, and meet without a step', () => {
  assert.ok(starterRoads.length >= 1, 'the island has its fire road')
  const shipped = createRoadGrading(starterRoads, naturalGroundHeight)
  starterRoads.forEach((road, i) => {
    // Each road is judged over the ground the roads before it shaped, as the island grades it.
    const before = createRoadGrading(starterRoads.slice(0, i), naturalGroundHeight)
    const { warnings } = analyseRoad(road, (point) => naturalGroundHeight(point) + before.delta(point))
    assert.deepEqual(warnings.map((warning) => warning.text), [], road.name)
  })
  // Every road runs smoothly into its ends, and where it ends partway along another road
  // (a T junction) the ground runs on along its heading onto that road without a step.
  // Rises are compared with a steep road grade.
  const stepM = 0.25, steepest = 0.25, joinM = 1
  const roads = shipped.roads()
  const inside = (other, sample) => sample.along > farM && sample.along < other.profile.at(-1).along - farM
  const partwayAlong = (road, end) => roads.some((other) => other !== road && other.profile.some((sample) => inside(other, sample) && Math.hypot(sample.x - end.x, sample.z - end.z) < joinM))
  for (const road of roads) {
    for (const end of [road.profile[0], road.profile.at(-1)]) {
      const inward = end === road.profile[0] ? 1 : -1
      const reach = partwayAlong(road, end) ? road.halfFormation : 0
      for (let t = -road.halfFormation * 2; t < reach; t += stepM) {
        const a = { x: end.x - inward * end.dx * t, z: end.z - inward * end.dz * t }
        const b = { x: a.x - inward * end.dx * stepM, z: a.z - inward * end.dz * stepM }
        const rise = Math.abs(groundHeight(b) - groundHeight(a)) / stepM
        assert.ok(rise < steepest, `${road.layout.name}: ${(rise * 100).toFixed(0)}% slope at its end near (${end.x.toFixed(0)}, ${end.z.toFixed(0)})`)
      }
    }
  }
  assert.ok(roads.filter((road) => partwayAlong(road, road.profile[0]) || partwayAlong(road, road.profile.at(-1))).length >= 2, 'the spur and the Fallow Ridge road join the fire road partway along')
})
