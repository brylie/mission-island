import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPlaytestMetrics } from '../server/playtest-metrics.ts'
import { fieldInteractions } from '../src/field-interactions.ts'
import { farmPlots, market } from '../src/farm.ts'
import { atJobBoard, jobBoard } from '../src/jobs.ts'
import { produceCounter } from '../src/worlds/starter/farm-order-sites.ts'
import { door, player, setup, tokens } from './support/game-harness.mjs'

function recorder() {
  let clock = 0
  const rows = []
  const metrics = createPlaytestMetrics((row) => rows.push(row), () => clock)()
  return {
    metrics,
    read: (event) => rows.filter((row) => row.event === event),
    wait(milliseconds) { clock += milliseconds },
  }
}

test('the real job board records available choices, denied retries and progress by seat', (t) => {
  const log = recorder()
  const h = setup(t, {
    metrics: log.metrics,
    players: [
      player(0, { x: jobBoard.x, z: jobBoard.z - 3.1 }),
      player(1, market, { goods: { fish: 2, carrots: 0 } }),
    ],
    arrange(save) { save.world.mission = 'complete' },
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  assert.ok(!atJobBoard(a.player))
  a.request('take-job', { id: 'market-fish' })
  assert.ok(a.messages.some(({ type }) => type === 'order-unavailable'))
  log.wait(500)
  for (let step = 0; step < 30 && !atJobBoard(a.player); step++) h.hold(a, 1, { z: 1 })
  assert.ok(atJobBoard(a.player))
  log.wait(500)
  h.advance()
  a.request('take-job', { id: 'market-fish' })
  b.request('interact', { choice: { action: 'market' } })
  h.advance()
  assert.equal(b.state.jobs.active, null)
  const choices = ['farm-supplies', 'beach-gear', 'market-fish', 'market-carrots']
  assert.deepEqual(log.read('job-options').map(({ slot, choices }) => [slot, choices]), [[0, choices]])
  assert.deepEqual(log.read('job-choice').map(({ slot, job, choices, result }) => [slot, job, choices, result]), [
    [0, 'market-fish', [], 'away-from-board'],
    [0, 'market-fish', choices, 'accepted'],
  ])
  assert.deepEqual(log.read('gameplay-recovery').map(({ job, after, attempts, durationMs }) => [job, after, attempts, durationMs]), [
    ['market-fish', 'away-from-board', 1, 1000],
  ])
  assert.deepEqual(log.read('job-progress').map(({ slot, job, progress, target, complete }) => [slot, job, progress, target, complete]), [
    [1, 'market-fish', 2, 2, true],
  ])
})

test('at the harbor board a ferry haul excludes the crate jobs from available choices', (t) => {
  const log = recorder()
  const h = setup(t, {
    metrics: log.metrics,
    players: [player(0, jobBoard)],
    arrange(save) {
      save.world.mission = 'complete'
      save.world.ferryRepair.haul = 1
    },
  })
  const a = h.join(tokens[0])
  a.request('take-job', { id: 'farm-supplies' })
  a.request('take-job', { id: 'market-carrots' })
  h.advance()
  const choices = ['market-fish', 'market-carrots']
  assert.deepEqual(log.read('job-choice').map(({ choices, result }) => [choices, result]), [
    [choices, 'timber-haul'],
    [choices, 'accepted'],
  ])
  assert.equal(a.state.jobs.active.id, 'market-carrots')
})

function cast(h, client, heading) {
  h.input(client)
  client.request('primary', { phase: 'start' })
  h.hold(client, 26)
  client.request('primary', { phase: 'release', aim: heading })
  h.advance()
}

test('repeat fishing separates visits from casts and records related work and cast recovery', (t) => {
  const log = recorder()
  const h = setup(t, {
    metrics: log.metrics,
    random: () => 1,
    players: [player(0, { x: -44, z: -36.7 }, { inventory: ['fishing-rod'], equipped: 'fishing-rod' }), player(1, jobBoard)],
    arrange(save) { save.world.mission = 'complete' },
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  cast(h, a, 0)
  log.wait(500)
  cast(h, a, 0)
  log.wait(1500)
  cast(h, a, Math.PI)
  h.hold(a, 111)
  cast(h, a, Math.PI)
  h.hold(a, 111)
  log.wait(46_000)
  cast(h, a, Math.PI)
  h.hold(a, 111)
  b.request('take-job', { id: 'market-fish' })
  cast(h, a, Math.PI)
  assert.deepEqual(log.read('mechanic-use').map(({ mechanic, slot, repeat, relatedWork }) => [mechanic, slot, repeat, relatedWork]), [
    ['fishing', 0, false, []],
    ['fishing', 0, true, []],
    ['fishing', 0, true, ['market-fish']],
  ])
  assert.deepEqual(log.read('gameplay-outcome').slice(0, 4).map(({ result }) => result), ['dry-cast', 'dry-cast', 'cast', 'no-bite'])
  assert.deepEqual(log.read('gameplay-recovery').map(({ result, after, attempts, durationMs }) => [result, after, attempts, durationMs]), [
    ['cast', 'dry-cast', 2, 2000],
  ])
})

test('co-op timeline credits rowing and riding separately and ends when a seat leaves', (t) => {
  const log = recorder()
  const shore = { x: -46.7, z: -33.9 }
  const rod = { inventory: ['fishing-rod'], equipped: 'fishing-rod' }
  const h = setup(t, { metrics: log.metrics, players: [player(0, shore, rod), player(1, shore)] })
  const a = h.join(tokens[0])
  assert.deepEqual(log.read('co-op-activity'), [])
  log.wait(300)
  const b = h.join(tokens[1])
  a.request('seat')
  b.request('seat')
  h.advance()
  cast(h, a, a.state.skiff.heading)
  assert.ok(a.player.casting)
  log.wait(300)
  h.hold(b, 15, { z: 1 })
  log.wait(300)
  h.advance()
  assert.ok(b.state.skiff.speed > 0)
  const passenger = log.read('co-op-activity').filter(({ slot }) => slot === 0).at(-1)
  assert.equal(passenger.activity, 'skiff-passenger')
  assert.equal(passenger.vehicleMoving, true)
  assert.equal(log.read('co-op-activity').filter(({ slot }) => slot === 1).at(-1).activity, 'rowing')
  assert.equal(log.read('gameplay-outcome').at(-1).result, 'line-retrieved-by-motion')
  const rowing = log.read('mechanic-use').filter(({ mechanic }) => mechanic === 'rowing')
  assert.deepEqual(rowing.map(({ slot, repeat }) => [slot, repeat]), [[1, false]])
  log.wait(300)
  b.close()
  assert.deepEqual(log.read('co-op-activity').slice(-2).map(({ slot, activity }) => [slot, activity]), [
    [0, 'co-op-ended'],
    [1, 'co-op-ended'],
  ])
  a.request('respawn')
  assert.equal(log.read('gameplay-outcome').at(-1).result, 'respawned-on-land')
})

test('produce orders credit the accepting seat and the partner who turns in the harvest', (t) => {
  const log = recorder()
  const h = setup(t, {
    metrics: log.metrics,
    players: [player(0, produceCounter), player(1, produceCounter, { goods: { fish: 0, carrots: 2 } })],
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  a.request('interact', { choice: { action: 'accept-produce' } })
  b.request('interact', { choice: { action: 'deliver-produce' } })
  h.advance()
  assert.equal(a.state.farmWork.progress.stage, 'qualified')
  assert.deepEqual(log.read('job-choice').map(({ job, slot, result }) => [job, slot, result]), [['produce:starter', 0, 'accepted']])
  assert.deepEqual(log.read('job-progress').map(({ job, slot, complete }) => [job, slot, complete]), [['produce:starter', 1, true]])
})

test('cultivation tracks validated tools and hand-planting with their produce order context', (t) => {
  const log = recorder()
  const plot = farmPlots[0]
  const h = setup(t, {
    metrics: log.metrics,
    players: [player(0, plot, { inventory: ['hoe'], equipped: 'hoe' }), player(1, plot, { seeds: 1 })],
    arrange(save) { save.world.produce = { stage: 'starter', delivered: 0, load: 0 } },
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  h.click(a)
  h.click(a)
  b.request('interact', { choice: { action: 'plant', subject: 0 } })
  h.advance()
  assert.equal(a.state.farm[0], 'planted')
  log.wait(300)
  h.advance()
  assert.deepEqual(log.read('co-op-activity').slice(-2).map(({ activity }) => activity), ['interacting', 'interacting'])
  assert.deepEqual(log.read('mechanic-use').map(({ slot, mechanic, relatedWork }) => [slot, mechanic, relatedWork]), [
    [0, 'farming', ['produce:starter']],
    [1, 'farming', ['produce:starter']],
  ])
})

test('field setbacks recover only on the selected subject and prompted observations carry outing context', (t) => {
  const log = recorder()
  const rim = { x: 44.46, z: -30.6 }
  const h = setup(t, {
    metrics: log.metrics,
    players: [player(0, rim, { grounded: false }), player(1)],
    arrange(save) { save.world.journal.heardMara = true },
  })
  const a = h.link()
  a.request('join', { token: tokens[0] })
  const staff = 2
  const cairn = 4
  for (const subject of [staff, cairn, 800]) a.request('interact', { choice: { action: 'inspect-field', subject } })
  log.wait(300)
  h.join(tokens[1])
  const choice = fieldInteractions(a.state, a.player).find(({ record }) => record === 'place:shellglass')
  assert.equal(choice.subject, staff)
  a.request('interact', { choice: { action: choice.action, subject: choice.subject } })
  log.wait(300)
  h.advance()
  assert.equal(log.read('co-op-activity').filter(({ slot }) => slot === 0).at(-1).activity, 'interacting')
  assert.deepEqual(log.read('mechanic-use').map(({ relatedWork }) => relatedWork), [['outing:mara']])
  assert.deepEqual(log.read('gameplay-recovery').map(({ subject, attempts }) => [subject, attempts]), [['place:shellglass', 1]])
})

test('a crew slot joining a waiting checkpoint does not observe a run before it starts', (t) => {
  const log = recorder()
  const h = setup(t, {
    metrics: log.metrics,
    players: [player(0, door(0)), player(1, door(1))],
    playtest: { checkpoint: 'household-evening', seats: 2, revision: 1 },
  })
  const a = h.join(tokens[0])
  const b = h.link()
  b.request('join', { token: tokens[1] })
  b.close()
  assert.deepEqual(log.read('run-start'), [])
  h.advance()
  assert.equal(a.state.playtest.started, false)
  log.wait(300)
  h.join(tokens[1])
  assert.equal(log.read('run-start').length, 1)
  assert.equal(log.read('co-op-activity').length, 2)
})
