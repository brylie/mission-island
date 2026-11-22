import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { openPlaytestMetrics } from '../server/multiplayer.ts'
import { createPlaytestMetrics } from '../server/playtest-metrics.ts'
import { secondsAtIslandHour } from '../src/residents/schedule.ts'
import { weatherAt } from '../src/weather.ts'
import { door, player, setup, tokens } from './support/game-harness.mjs'

test('a two-seat sleep skip logs the observed night and dawn in a private host file', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mission-island-playtest-metrics-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const run = openPlaytestMetrics(root, 5479)
  const directory = join(root, '.mission-island', 'metrics')
  const files = readdirSync(directory)
  assert.equal(files.length, 1)
  const path = join(directory, files[0])
  assert.equal(statSync(path).mode & 0o777, 0o600)
  const h = setup(t, {
    metrics: run(),
    players: [player(0, door(0)), player(1, door(1))],
    arrange: (save) => { save.islandTime = secondsAtIslandHour(23) },
  })
  h.advance()
  assert.equal(readFileSync(path, 'utf8'), '')
  const beforeJoin = h.game.snapshotForSave().islandTime
  const a = h.link()
  a.request('join', { token: tokens[0] })
  const [start] = readFileSync(path, 'utf8').split('\n')
  assert.equal(JSON.parse(start).islandTime, beforeJoin, 'record the baseline before the next tick or command')
  const b = h.join(tokens[1])
  a.request('crew-name', { name: 'Private Crew Name' })
  h.advance()
  assert.equal(a.player.name, 'Private Crew Name')
  a.close()
  h.advance()
  const rejoined = h.join(tokens[0])
  for (const socket of [rejoined, b]) socket.request('interact', { choice: { action: 'sleep' } })
  h.advance(10)

  const raw = readFileSync(path, 'utf8')
  assert.ok(!raw.includes('Private Crew Name') && tokens.every((token) => !raw.includes(token)))
  const rows = raw.trimEnd().split('\n').map((line) => JSON.parse(line))
  assert.deepEqual(rows.filter(({ event }) => event === 'crew').map(({ connectedSlots }) => connectedSlots), [[0], [0, 1], [1], [0, 1]])
  const skips = rows.filter(({ event }) => event === 'sleep-skip')
  assert.equal(skips.length, 1)
  assert.ok(skips[0].fromIslandTime >= secondsAtIslandHour(23))
  assert.equal(skips[0].islandHour, 6)
  const bram = rows.filter(({ event, resident }) => event === 'household' && resident === 'bram')
  assert.deepEqual(bram.map(({ stop, indoors, windowLit }) => [stop, indoors, windowLit]), [
    ['home', true, false],
    ['home', true, true],
  ])
  assert.equal(bram[1].islandTime, skips[0].islandTime)

  renameSync(path, path + '.old')
  b.close()
  h.advance()
  assert.equal(statSync(path).mode & 0o777, 0o600)
  rejoined.close()
})

test('checkpoint metrics start when the crew is ready and restart from a fresh baseline', (t) => {
  const rows = []
  let wallTime = 100
  const run = createPlaytestMetrics((event) => rows.push(event), () => wallTime)
  for (const revision of [1, 2]) {
    const playtest = { checkpoint: 'household-evening', seats: 2, revision }
    const h = setup(t, { playtest, metrics: run(playtest) })
    const a = h.join(tokens[0])
    assert.equal(a.state.playtest.started, false)
    assert.ok(!rows.some(({ run }) => run === revision))
    wallTime += 500
    h.join(tokens[1])
    const baseline = rows.filter(({ run }) => run === revision)
    assert.equal(baseline[0].event, 'run-start')
    assert.equal(baseline[0].checkpoint, 'household-evening')
    assert.equal(baseline[0].seats, 2)
    assert.equal(baseline[0].elapsedMs, 0)
    assert.deepEqual(baseline[1].connectedSlots, [0, 1])
    assert.ok(baseline.some(({ event, resident, stop, indoors }) => event === 'household' && resident === 'mara' && stop === 'home' && !indoors))
  }
})

test('observed household changes distinguish porch, bedtime, waking and departure', (t) => {
  const rows = []
  const run = createPlaytestMetrics((event) => rows.push(event))()
  const h = setup(t)
  const baseline = h.join(tokens[0]).state
  for (const hour of [18.5, 19.2, 19.3, 21.1, 5.3, 6]) {
    const islandTime = secondsAtIslandHour(hour)
    run.sample({ ...baseline, islandTime, weather: weatherAt(islandTime) })
  }
  const mara = rows.filter(({ event, resident }) => event === 'household' && resident === 'mara')
  assert.deepEqual(mara.map(({ stop, indoors, windowLit }) => [stop, indoors, windowLit]), [
    ['home', false, false],
    ['home', true, true],
    ['home', true, false],
    ['home', true, true],
    ['walking', false, false],
  ])
})
