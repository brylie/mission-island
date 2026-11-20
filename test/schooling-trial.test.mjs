import assert from 'node:assert/strict'
import test from 'node:test'
import { createSchoolTrial, readSchoolRoute } from '../src/workbench/school-trial.ts'
import { seededRandom } from '../src/seeded-random.ts'
import { createWander } from '../src/simulation/motion-noise.ts'
import { poolRadius, schoolStep } from '../src/simulation/fish-school.ts'

function frame(trial) {
  return globalThis.structuredClone({ fish: trial.school.fish, leader: trial.school.leader, actor: trial.actor, tracks: trial.tracks })
}

function spread(members) {
  return Math.max(...members.flatMap(f => members.map(g => Math.hypot(f.x - g.x, f.z - g.z))))
}

for (const kind of ['player', 'skiff']) {
  test(kind + ' startles a flank, the school disperses and regroups on a stable leader', () => {
    const trial = createSchoolTrial(42, kind, '')
    let partial = false, widest = 0
    for (let tick = 1; tick <= 450; tick++) {
      trial.seek(tick / 30)
      const members = trial.school.fish
      const scared = members.filter(f => f.alarm > 0).length
      if (scared > 0 && scared < members.length) partial = true
      widest = Math.max(widest, spread(members))
      assert.ok(members.every(f => Math.hypot(f.x, f.z) < poolRadius))
    }
    assert.ok(partial)
    assert.ok(widest > 6 && spread(trial.school.fish) < widest / 2)
    const leader = trial.school.leader
    assert.ok(leader >= 0 && leader < 6)
    assert.equal(trial.school.encounters, 1)
    trial.seek(14)
    assert.equal(trial.school.leader, leader)
  })
}

test('manual steering survives rewind and setup links, and permits a different second approach', () => {
  const trial = createSchoolTrial(87, 'player', '')
  trial.seek(1)
  trial.steer({ x: 0, z: -2 })
  trial.seek(8)
  trial.steer({ x: -6, z: 2 })
  trial.seek(15)
  const expected = frame(trial)
  const copy = createSchoolTrial(87, 'player', JSON.stringify(trial.route))
  copy.seek(15)
  assert.deepEqual(frame(copy), expected)
  trial.seek(0)
  trial.seek(15)
  assert.deepEqual(frame(trial), expected)
  trial.seek(5)
  trial.steer({ x: 3, z: 3 })
  assert.equal(trial.route.length, 2)
  trial.seek(15)
  assert.notDeepEqual(frame(trial), expected)
  assert.equal(trial.actor.x, 3)
})

test('route validation bounds imported targets and random leaders depend on the seed', () => {
  for (const route of ['{}', '[', '[[0,231,0]]', '[[2,0,0],[2,0,1]]', '[[999,0,0]]']) {
    assert.deepEqual(readSchoolRoute(route), [])
  }
  const leaders = new Set()
  for (const seed of [9, 18, 25, 42, 68, 125]) {
    const trial = createSchoolTrial(seed, 'skiff', '')
    for (let tick = 1; tick <= 900 && trial.school.leader < 0; tick++) trial.seek(tick / 30)
    leaders.add(trial.school.leader)
  }
  assert.ok(!leaders.has(-1) && leaders.size > 1)
})

test('the same seeded school replays a five-centimetre perturbation independently', () => {
  const original = createSchoolTrial(125, 'skiff', '')
  const nudged = createSchoolTrial(125, 'skiff', '', true)
  const fish = globalThis.structuredClone(original.school.fish)
  fish[0].x += .05
  assert.deepEqual(nudged.school.fish, fish)
  assert.notDeepEqual(original.school.fish, createSchoolTrial(126, 'skiff', '').school.fish)
  original.seek(25)
  nudged.seek(25)
  const recorded = frame(nudged)
  assert.notDeepEqual(recorded.fish, original.school.fish)
  nudged.seek(0)
  nudged.seek(25)
  assert.deepEqual(frame(nudged), recorded)
})

test('individual reaction times vary and leader history resets at a new disturbance', () => {
  const trial = createSchoolTrial(42, 'skiff', '')
  const delays = trial.school.fish.map(f => f.responseTicks)
  assert.ok(delays.every(t => t >= 2 && t <= 5))
  assert.ok(new Set(delays).size > 1)
  trial.seek(15)
  assert.equal(trial.school.leaderTrail.length, 5)
  trial.steer(trial.school.fish[trial.school.leader])
  for (let t = 15; t < 30 && !trial.school.scattered; t += .1) trial.seek(t)
  assert.ok(trial.school.scattered)
  assert.deepEqual(trial.school.leaderTrail, [])
})

test('body heading and swimming direction turn together, with bounded yaw and acceleration', () => {
  for (const kind of ['player', 'skiff']) {
    for (const seed of [0, 42, 125, 9999]) {
      const trial = createSchoolTrial(seed, kind, '')
      for (let tick = 1; tick <= 900; tick++) {
        const before = trial.school.fish
        trial.seek(tick * schoolStep + 1e-8)
        for (const [i, fish] of trial.school.fish.entries()) {
          const angle = fish.heading - before[i].heading
          assert.ok(Math.abs(angle) <= 3.4 * schoolStep + 1e-9)
          assert.ok(Math.abs(fish.turnRate - before[i].turnRate) <= 14 * schoolStep + 1e-9)
          assert.ok(Math.abs(Math.sin(fish.heading) * fish.vx - Math.cos(fish.heading) * fish.vz) < 1e-9)
          assert.ok(Math.cos(fish.heading) * fish.vx + Math.sin(fish.heading) * fish.vz > 0)
        }
      }
    }
  }
})

test('wander stays correlated over short times and returns toward its mean over long runs', () => {
  const next = createWander(seededRandom(68), schoolStep, .65, .29)
  let value = 0, total = 0, squares = 0, adjacentProduct = 0
  for (let i = 0; i < 30000; i++) {
    const previous = value
    value = next(value)
    total += value
    squares += value * value
    adjacentProduct += previous * value
  }
  assert.ok(Math.abs(total / 30000) < .03)
  assert.ok(Math.abs(Math.sqrt(squares / 30000) - .29) < .025)
  assert.ok(adjacentProduct / squares > .9)
})
