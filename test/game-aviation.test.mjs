import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createGame } from '../server/game.ts'
import { islandSaveFile } from '../server/save.ts'
import { aerialSurveys, rackBrief, surveyClue } from '../src/aviation.ts'
import { startRidgeFlight, stepRidgeFlight } from '../src/simulation/ridge-flight.ts'
import { groundHeight } from '../src/terrain.ts'
import { distance, offset } from '../src/world.ts'
import { ridgeHeading, ridgeLaunch, ridgeMeadow, ridgeReturn } from '../src/worlds/starter/ridge-scout.ts'
import { mirrorPoolWillow } from '../src/worlds/starter/sites.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

const besideSign = offset({ ...ridgeMeadow, heading: ridgeHeading }, 5.55, -8)
const notice = (client, result) => client.messages.filter((message) => message.type === 'flight-result' && message.result === result)

function beforeLanding() {
  const flight = startRidgeFlight()
  let ticks = 0
  while (!flight.outcome && ticks < 360) {
    stepRidgeFlight(flight, { turn: 0, pitch: 0 })
    ticks++
  }
  assert.equal(flight.outcome, 'field')
  return ticks - 1
}

function walkTo(h, client, target) {
  for (let tick = 0; tick < 180 && distance(client.player, target) > 0.45; tick++) {
    h.input(client, { x: target.x - client.player.x, z: target.z - client.player.z })
    h.advance()
  }
  assert.ok(distance(client.player, target) <= 0.45)
  h.input(client)
  h.advance()
}

function flySurvey(h, pilot) {
  for (let tick = 0; tick < 290 && (tick === 0 || pilot.state.aviation.flight); tick++) {
    const seconds = tick / 30
    h.input(pilot, { flightTurn: seconds > 0.35 && seconds < 1.72 ? 1 : seconds > 3 && seconds < 5.65 ? -1 : 0 })
    h.advance()
  }
}

test('both players see the meadow mark and the second pilot can survey without a checkout', (t) => {
  const h = setup(t, { players: [player(0, ridgeLaunch), player(1, besideSign)], arrange: (save) => {
    delete save.world.aviation
  } })
  const a = h.join(tokens[0]), b = h.join(tokens[1])
  b.request('interact')
  h.advance()
  assert.equal(a.state.aviation.marked, true)
  assert.equal(b.state.aviation.marked, true)
  assert.equal(b.state.aviation.qualified, false)
  a.request('interact')
  h.advance(16)
  assert.equal(a.player.grounded, false)
  assert.equal(b.state.aviation.flight.pilotId, a.player.id)
  a.request('jump')
  a.request('seat')
  h.advanceUntil(() => a.state.aviation.flight === null)
  assert.equal(a.player.grounded, true)
  assert.equal(b.state.aviation.qualified, true)
  assert.equal(a.state.aviation.marked, false)
  assert.equal(notice(a, 'qualified').length, 1)
  assert.equal(notice(b, 'qualified').length, 1)
  const ground = { x: a.player.x, z: a.player.z }
  assert.ok(distance(ground, ridgeMeadow) < 1)

  walkTo(h, b, ridgeReturn)
  walkTo(h, b, ridgeLaunch)
  walkTo(h, a, besideSign)
  a.request('interact')
  b.request('interact')
  h.advance()
  assert.equal(a.state.aviation.marked, true)
  assert.equal(a.state.aviation.flight.outing, 'survey')
  flySurvey(h, b)
  assert.equal(a.state.aviation.flight, null)
  assert.equal(a.state.aviation.surveyed, true)
  assert.equal(b.state.aviation.surveyed, true)
  assert.equal(notice(a, 'surveyed').length, 1)
  assert.equal(notice(b, 'surveyed').length, 1)
  assert.equal(notice(b, 'qualified').length, 1)
  assert.equal(h.game.crewCoins, 0)

  // Once the survey is recorded, the rack lends the wing for free flights around the island.
  walkTo(h, b, ridgeReturn)
  walkTo(h, b, ridgeLaunch)
  b.request('interact')
  h.advance()
  assert.equal(a.state.aviation.flight.outing, 'free')
  h.advanceUntil(() => a.state.aviation.flight === null)
  const [landed] = notice(a, 'landed')
  assert.ok(landed)
  const reported = [...notice(a, 'surveyed')[0].aerial ?? [], ...landed.aerial ?? []]
  assert.deepEqual([...reported].sort(), [...a.state.aviation.aerial].sort())
  assert.equal(notice(b, 'surveyed').length, 1)
  assert.deepEqual([b.state.aviation.qualified, b.state.aviation.surveyed, h.game.crewCoins], [true, true, 0])
})

function steerTowards(h, pilot, target, until) {
  for (let tick = 0; tick < 30 * 60 && pilot.state.aviation.flight; tick++) {
    const { x, z, heading } = pilot.player
    const error = Math.atan2(target.x - x, target.z - z) - heading
    h.input(pilot, { flightTurn: Math.max(-1, Math.min(1, 2 * Math.atan2(Math.sin(error), Math.cos(error)))), flightPitch: -0.6 })
    h.advance()
    if (until?.()) return
  }
}

const flyingCrew = (aerial = []) => ({ players: [player(0, ridgeLaunch), player(1, besideSign)], arrange: (save) => {
  save.world.aviation = { qualified: true, surveyed: true, aerial }
} })

test('a free flight over Mirror Pool records its aerial survey once, after a safe landing, for the whole crew', (t) => {
  const pool = aerialSurveys.find(({ id }) => id === 'pool')
  const h = setup(t, flyingCrew())
  const a = h.join(tokens[0]), b = h.join(tokens[1])
  a.request('interact')
  h.advance()
  steerTowards(h, a, pool.site, () => a.state.aviation.flight?.spotted.includes('pool'))
  assert.deepEqual(a.messages.filter((m) => m.type === 'aerial-sighting').map((m) => m.id).filter((id) => id === 'pool'), ['pool'])
  assert.equal(b.messages.filter((m) => m.type === 'aerial-sighting').length, 0, 'only the pilot hears a sighting')
  assert.deepEqual(b.state.aviation.aerial, [], 'nothing is recorded before landing')
  h.advanceUntil(() => a.state.aviation.flight === null)
  assert.ok(a.state.aviation.aerial.includes('pool'))
  for (const client of [a, b]) {
    const [landed, ...extra] = notice(client, 'landed')
    assert.equal(extra.length, 0)
    assert.ok(landed.aerial.includes('pool'))
    assert.equal(landed.recorded, a.state.aviation.aerial.length)
  }
  assert.equal(h.game.crewCoins, 0)

  // A second pass over the same place adds nothing.
  walkTo(h, a, ridgeReturn)
  walkTo(h, a, ridgeLaunch)
  const recorded = a.state.aviation.aerial.length
  a.request('interact')
  h.advance()
  steerTowards(h, a, pool.site)
  h.advanceUntil(() => a.state.aviation.flight === null)
  assert.equal(a.state.aviation.aerial.length, recorded)
  assert.ok(notice(a, 'landed').slice(1).every((result) => !result.aerial?.includes('pool')))
  assert.deepEqual(h.game.snapshotForSave().world.aviation.aerial, a.state.aviation.aerial)
})

test('an interrupted flight loses its sightings, and the checkout flight records none', (t) => {
  const pool = aerialSurveys.find(({ id }) => id === 'pool')
  const h = setup(t, flyingCrew())
  const a = h.join(tokens[0])
  a.request('interact')
  h.advance()
  steerTowards(h, a, pool.site, () => a.state.aviation.flight?.spotted.includes('pool'))
  a.request('respawn')
  h.advance()
  assert.equal(a.state.aviation.flight, null)
  assert.deepEqual(a.state.aviation.aerial, [])

  const fresh = setup(t, { players: [player(0, ridgeLaunch)], arrange: (save) => {
    delete save.world.aviation
  } })
  const pilot = fresh.join(tokens[0])
  pilot.request('interact')
  fresh.advance()
  steerTowards(fresh, pilot, pool.site)
  fresh.advanceUntil(() => pilot.state.aviation.flight === null)
  assert.deepEqual(pilot.state.aviation.aerial, [])
})

test('the rack gives the survey clue before launch and invites an island survey afterwards', () => {
  assert.match(rackBrief({ qualified: false, surveyed: false })[0], /checkout/)
  const [survey, clue] = rackBrief({ qualified: true, surveyed: false })
  assert.match(survey, /Mirror Pool survey/)
  assert.ok(clue.startsWith(surveyClue))
  assert.match(clue, /willow/)
  const [free, brief] = rackBrief({ qualified: true, surveyed: true, aerial: ['pool'] })
  assert.match(free, /survey the island/)
  assert.match(brief, new RegExp(`${aerialSurveys.length - 1} of ${aerialSurveys.length} places`))
  assert.match(rackBrief({ qualified: true, surveyed: true, aerial: aerialSurveys.map(({ id }) => id) })[1], /Every place/)
})

test('one loan wins simultaneous requests, with no charge and neutral controls after input expires', (t) => {
  const h = setup(t, { players: [player(0, ridgeLaunch), player(1, ridgeLaunch)] })
  const a = h.join(tokens[0]), b = h.join(tokens[1])
  a.request('interact')
  b.request('interact')
  h.input(a, { x: -1, z: 1, flightTurn: 1, flightPitch: -1 })
  h.advance(10)
  assert.equal(b.state.aviation.flight.pilotId, a.player.id)
  assert.equal(b.player.grounded, true)
  assert.ok(a.state.aviation.flight.bank < -0.2)
  assert.ok(a.state.aviation.flight.pitch < -0.1)
  h.advance(45)
  assert.ok(Math.abs(a.state.aviation.flight.bank) < 0.01)
  assert.ok(Math.abs(a.state.aviation.flight.pitch) < 0.01)
  a.request('respawn')
  h.advance()
  assert.equal(b.state.aviation.flight, null)
  assert.equal(a.player.grounded, true)
  assert.equal(a.state.crewCoins, 0)
  assert.equal(notice(b, 'interrupted').length, 1)
})

test('a short landing leaves the pilot on the meadow side of the ridge and releases the wing', (t) => {
  const h = setup(t, { players: [player(0, ridgeLaunch), player(1, besideSign)] })
  const a = h.join(tokens[0]), b = h.join(tokens[1])
  b.request('interact')
  a.request('interact')
  h.advance(55)
  h.hold(a, 110, { flightPitch: 1 })
  assert.equal(a.state.aviation.flight, null)
  assert.equal(a.state.aviation.marked, false)
  assert.equal(a.state.aviation.qualified, false)
  assert.equal(notice(a, 'short').length, 1)
  assert.equal(notice(b, 'short').length, 1)
  assert.equal(a.player.grounded, true)
  assert.equal(a.player.y, groundHeight(a.player))
  assert.ok(distance(a.player, ridgeLaunch) > 15)
  walkTo(h, a, ridgeReturn)
  walkTo(h, a, ridgeLaunch)
  a.request('interact')
  h.advance()
  assert.equal(a.state.aviation.flight.pilotId, a.player.id)
})

test('the host shows the updraft lifting the borrowed wing on both clients', (t) => {
  const h = setup(t, { players: [player(0, ridgeLaunch), player(1, besideSign)] })
  const a = h.join(tokens[0]), b = h.join(tokens[1])
  a.request('interact')
  h.hold(a, 36, { flightTurn: -1 })
  h.hold(a, 85)
  assert.equal(a.state.aviation.flight.climbing, true)
  assert.equal(b.state.aviation.flight.climbing, true)
  const enteredAt = a.player.y
  h.hold(a, 38, { flightTurn: 1 })
  assert.ok(a.player.y > enteredAt + 4)
  assert.equal(b.state.aviation.qualified, false)
})

test('a pilot can climb in the updraft, turn back to the willow, and land the survey in one flight', (t) => {
  const h = setup(t, { players: [player(0, ridgeLaunch), player(1, besideSign)], arrange: (save) => {
    save.world.aviation = { qualified: true, surveyed: false }
  } })
  const a = h.join(tokens[0]), b = h.join(tokens[1])
  a.request('interact')
  let climbed = false
  let observed = false
  for (let tick = 0; tick < 630 && (tick === 0 || a.state.aviation.flight); tick++) {
    const seconds = tick / 30
    const right = seconds >= 3.1 && seconds < 7.2
    const left = seconds < 1.2 || (seconds >= 9.2 && seconds < 14.7)
    h.input(a, { flightTurn: Number(right) - Number(left), flightPitch: Number(seconds >= 15) })
    h.advance()
    climbed ||= b.state.aviation.flight?.climbing === true
    observed ||= climbed && b.state.aviation.flight?.observed === true
  }
  assert.ok(climbed && observed)
  assert.equal(a.player.grounded, true)
  assert.equal(a.state.aviation.flight, null)
  assert.equal(notice(b, 'surveyed').length, 1)
  assert.ok(distance(a.player, ridgeMeadow) < 5)
})

test('disconnect and a disk restart on either side of qualifying touchdown agree with the award', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'ridge-aviation-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const disk = islandSaveFile(directory, 5173)
  const appearance = { uniform: 'default', skin: 'deep', shirt: 'blue' }
  const h = setup(t, { players: [player(0, ridgeLaunch, { appearance }), player(1, besideSign)], arrange: (save) => {
    save.crewCoins = 9
  } })
  const a = h.join(tokens[0]), b = h.join(tokens[1])
  a.request('interact')
  h.advance(beforeLanding())
  assert.equal(a.player.grounded, false)
  const before = h.game.snapshotForSave()
  disk.write(before)
  const recovered = setup(t, { saved: disk.load() })
  const pilot = recovered.join(tokens[0])
  assert.equal(pilot.state.aviation.flight, null)
  assert.equal(pilot.state.aviation.qualified, false)
  assert.equal(pilot.player.grounded, true)
  assert.deepEqual(pilot.player.appearance, appearance)
  assert.equal(pilot.player.y, groundHeight(pilot.player))
  assert.ok(distance(pilot.player, ridgeLaunch) < 1)

  a.close()
  h.advance()
  assert.equal(b.state.aviation.qualified, false)
  assert.equal(b.state.aviation.flight, null)
  assert.equal(notice(b, 'interrupted').length, 1)
  const rejoined = h.join(tokens[0])
  rejoined.request('interact')
  h.advance(beforeLanding() + 1)
  assert.equal(rejoined.state.aviation.qualified, true)
  assert.equal(rejoined.player.grounded, true)
  rejoined.close()
  disk.write(h.game.snapshotForSave())
  const after = setup(t, { saved: disk.load() })
  const other = after.join(tokens[1]), landed = after.join(tokens[0])
  assert.equal(other.state.aviation.qualified, true)
  assert.equal(other.state.aviation.flight, null)
  assert.equal(other.state.crewCoins, 9)
  assert.equal(landed.player.grounded, true)
  assert.ok(distance(landed.player, ridgeMeadow) < 1)
  assert.equal(notice(b, 'qualified').length, 1)
})

test('ground visits and a survey landing without the airborne observation give no credit', (t) => {
  const h = setup(t, { players: [player(0, ridgeLaunch), player(1, { x: mirrorPoolWillow.x + 2, z: mirrorPoolWillow.z })], arrange: (save) => {
    save.world.aviation = { qualified: true, surveyed: false }
  } })
  const a = h.join(tokens[0]), b = h.join(tokens[1])
  b.request('interact')
  b.request('respawn')
  a.request('interact')
  h.advanceUntil(() => a.state.aviation.flight !== null)
  h.advanceUntil(() => a.state.aviation.flight === null)
  assert.equal(a.state.aviation.surveyed, false)
  assert.equal(notice(b, 'observation').length, 1)
  assert.equal(h.game.snapshotForSave().world.aviation.surveyed, false)
})

test('saves keep aerial surveys, older saves start with none, and unknown or duplicate places are rejected', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'mission-aerial-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const file = islandSaveFile(directory, 0, 'aerial')
  const write = (aviation) => {
    const save = createGame().snapshotForSave()
    save.world.aviation = aviation
    file.write(save)
  }
  write({ qualified: true, surveyed: true })
  assert.deepEqual(createGame({ save: file.load() }).tick().aviation.aerial, [])
  write({ qualified: true, surveyed: true, aerial: ['pool', 'fernfall'] })
  assert.deepEqual(createGame({ save: file.load() }).tick().aviation.aerial, ['pool', 'fernfall'])
  for (const aerial of [['pool', 'pool'], ['atlantis'], 'pool']) {
    write({ qualified: true, surveyed: true, aerial })
    assert.throws(() => file.load(), /Could not load/)
  }
  write({ qualified: false, surveyed: false, aerial: ['pool'] })
  assert.throws(() => file.load(), /Could not load/)
})
