import assert from 'node:assert/strict'
import test from 'node:test'
import { createSchoolTrial, readSchoolRoute } from '../src/workbench/school-trial.ts'
import { poolRadius } from '../src/simulation/fish-school.ts'

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
    for (let tick = 1; tick <= 900; tick++) {
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
    trial.seek(15)
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
    trial.seek(15)
    leaders.add(trial.school.leader)
  }
  assert.ok(!leaders.has(-1) && leaders.size > 1)
})
