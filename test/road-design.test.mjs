import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bendToward, sampleRoad, stretchMiddle, turnRadii } from '../src/road-shape.ts'
import { solveRoadProfile } from '../src/road-profile.ts'

const plan = { points: [{ x: 0, z: 0 }, { x: 40, z: 10 }, { x: 80, z: 0 }, { x: 120, z: 30 }], bends: [0, 0, 0] }
const closeM = 0.01
const stepM = 1
const stepSlackM = 0.05
// A sharper turn than this over one metre (a radius under 5 m) would be a corner, not a curve.
const turnToleranceRad = 0.2

test('a bend moves the middle of its stretch sideways by exactly the bend, to the left of travel', () => {
  const straight = stretchMiddle(plan, 1)
  const bent = { ...plan, bends: [0, 6.5, 0] }
  const middle = stretchMiddle(bent, 1)
  assert.ok(Math.abs(Math.hypot(middle.x - straight.x, middle.z - straight.z) - 6.5) < closeM)
  // Travelling east-south-east from (40, 10) to (80, 0), left is north-ish: z grows.
  assert.ok(middle.z > straight.z)
  // Dragging the middle to a point recovers the bend that puts it there.
  assert.ok(Math.abs(bendToward(plan, 1, middle) - 6.5) < closeM)
  // Bending one stretch leaves the others' middles alone.
  assert.deepEqual(stretchMiddle(bent, 0), stretchMiddle(plan, 0))
})

test('the centreline is sampled evenly and runs smoothly through every dot', () => {
  const samples = sampleRoad({ ...plan, bends: [3, -5, 2] })
  for (let i = 1; i < samples.length - 1; i++) {
    const gap = Math.hypot(samples[i].x - samples[i - 1].x, samples[i].z - samples[i - 1].z)
    assert.ok(Math.abs(gap - stepM) < stepSlackM, `gap ${gap.toFixed(3)} at ${i}`)
    const turn = Math.acos(Math.min(1, samples[i].dx * samples[i - 1].dx + samples[i].dz * samples[i - 1].dz))
    assert.ok(turn < turnToleranceRad, `kink of ${turn.toFixed(3)} rad at ${samples[i].along.toFixed(0)} m`)
  }
  const last = samples[samples.length - 1]
  assert.ok(Math.hypot(last.x - 120, last.z - 30) < closeM, 'the road ends on its last dot')
  assert.equal(turnRadii(sampleRoad({ points: [{ x: 0, z: 0 }, { x: 50, z: 0 }], bends: [0] }))[10], Infinity)
})

test('a road holds its grade limit, follows gentle ground and meets pinned ends', () => {
  const samples = sampleRoad({ points: [{ x: 0, z: 0 }, { x: 200, z: 0 }], bends: [0] })
  // A hill rising 30 m in 60 m: too steep for a 12% road.
  const hill = ({ x }) => Math.max(0, Math.min(30, (x - 70) * 0.5))
  const profile = solveRoadProfile(samples, { groundAt: hill, halfWidth: 2, maxGrade: () => 0.12, start: 0 })
  for (let i = 1; i < profile.length; i++) assert.ok(Math.abs(profile[i].y - profile[i - 1].y) <= 0.12 * (profile[i].along - profile[i - 1].along) + 1e-9)
  assert.equal(profile[0].y, 0)
  assert.ok(profile.some((sample) => sample.cut > 1), 'the road cuts into the hill')
  // A hollow 6 m deep and 16 m across is filled rather than dived into.
  const hollow = ({ x }) => Math.abs(x - 100) < 8 ? -6 : 0
  const across = solveRoadProfile(samples, { groundAt: hollow, halfWidth: 2, maxGrade: () => 0.12 })
  assert.ok(across.some((sample) => sample.cut < -1), 'the road fills the hollow')
  // On level ground the road lies on the ground.
  const flat = solveRoadProfile(samples, { groundAt: () => 4, halfWidth: 2, maxGrade: () => 0.12 })
  assert.ok(flat.every((sample) => Math.abs(sample.y - 4) < 1e-9 && Math.abs(sample.cut) < 1e-9))
  assert.deepEqual(solveRoadProfile(samples, { groundAt: hill, halfWidth: 2, maxGrade: () => 0.12, start: 0 }), profile)
})
