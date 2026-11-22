import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createGame } from '../server/game.ts'
import { islandSaveFile } from '../server/save.ts'
import { downwindHotspot, igniteFire, wildfirePay } from '../server/wildfire.ts'
import { actionHint } from '../src/actions.ts'
import { fireWatchGeometry } from '../src/assets/geometry/fire-watch.ts'
import { fireFinder } from '../src/fire-watch.ts'
import { fireWatchBaseHeight, walkingHeight } from '../src/terrain.ts'
import { daySeconds, dryHoursAt } from '../src/weather.ts'
import { windAt } from '../src/island-wind.ts'
import { createJuniperHabitat, juniperCenter } from '../src/juniper-habitat.ts'
import { fireSite, wildfireSizes } from '../src/wildfire.ts'
import { extinguisherStations, itemStarts, offset } from '../src/world.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

// 10:00 on a dry morning.
const dryMorning = daySeconds + 80
const stationItem = (id) => itemStarts.length - extinguisherStations.length + extinguisherStations.findIndex((station) => station.id === id)
const deck = { ...fireFinder, x: fireFinder.x + 0.9 }
const onDeck = () => player(0, deck, { y: fireWatchBaseHeight() + fireWatchGeometry.deck.top })

// Keeps sending input, as a crewmate holding the button does, until the condition holds.
function holdUntil(h, client, condition, limit) {
  for (let tick = 0; tick < limit && !condition(); tick += 6) h.hold(client, 6)
  assert.ok(condition(), 'The expected game state was not reached while holding')
}

function afterShift(save, time = dryMorning) {
  save.islandTime = time
  Object.assign(save.world, { mission: 'complete', fire: 0 })
}

function burning(save, site = 'meadow-slope', size = 'patch') {
  afterShift(save)
  return igniteFire(save.world.events, save.islandTime, { site, size })
}

test('smoke from a scheduled fire waits for a dry day, then reaches the whole crew', (t) => {
  const h = setup(t, {
    players: [player(0), player(1)],
    arrange(save) {
      afterShift(save, daySeconds - 40)
      save.world.events.nextFireAt = save.islandTime
    },
  })
  const a = h.join(tokens[0]), b = h.join(tokens[1])
  h.advance()
  assert.equal(a.state.events.fire, null, 'no fire starts at night')
  assert.ok(a.state.events.nextFireAt > a.state.islandTime)
  h.advanceUntil(() => a.state.events.fire !== null, 30 * 30 * 6)
  assert.ok(a.state.weather.hour >= 8 && a.state.weather.rain <= 0.3)
  const fire = a.state.events.fire
  assert.equal(fire.located, false)
  assert.equal(fire.hotspots.length, wildfireSizes[fire.size].hotspots)
  for (const client of [a, b]) assert.ok(client.messages.some((message) => message.type === 'wildfire' && message.event === 'smoke'))
})

test('the fire finder locates the smoke and a crewmate knocks it down for pay', (t) => {
  let fire
  const h = setup(t, {
    players: [onDeck(), player(1)],
    arrange(save) {
      fire = burning(save)
      const spot = fire.hotspots[0]
      Object.assign(save.crew[1].player, offset({ ...spot, heading: 0 }, 0, -3), { y: walkingHeight(spot) })
      Object.assign(save.world.items[stationItem('pinewoods')], { holder: 1 })
    },
  })
  const a = h.join(tokens[0])
  assert.deepEqual(actionHint(a.state, a.player), ['E', 'Sight the fire finder'])
  a.request('interact')
  h.advance()
  assert.equal(a.state.events.fire.located, true)
  const located = a.messages.find((message) => message.type === 'wildfire' && message.event === 'located')
  assert.equal(located.place, fireSite('meadow-slope').name)
  assert.equal(located.playerId, 0)
  const b = h.join(tokens[1])
  assert.match(actionHint(b.state, b.player)[1], /Hold to spray · 100% left/)
  const coins = b.state.crewCoins
  b.request('primary', { phase: 'start' })
  holdUntil(h, b, () => b.state.events.fire === null, 30 * 12)
  assert.equal(b.state.crewCoins, coins + wildfireSizes.patch.coins)
  assert.equal(a.state.events.lastFire.outcome, 'extinguished')
  assert.equal(a.state.events.firesOut, fire.id)
  assert.ok(a.state.events.nextFireAt >= a.state.islandTime + 3 * daySeconds)
  assert.ok(b.state.items[stationItem('pinewoods')].charge < 1)
  assert.ok(a.messages.some((message) => message.type === 'wildfire' && message.event === 'out' && message.coins === wildfireSizes.patch.coins))
  a.request('interact')
  h.advance()
  assert.ok(a.messages.some((message) => message.type === 'wildfire' && message.event === 'clear'))
})

test('an unattended fire catches its next hotspot, and a long-burning one goes out without pay', (t) => {
  const h = setup(t, {
    players: [player(0)],
    arrange(save) {
      const fire = burning(save, 'pinewoods-glade', 'blaze')
      save.islandTime += daySeconds
      // The fire has been burning for most of its life.
      fire.startedAt = save.islandTime - daySeconds * 1.5 + 50
    },
  })
  const a = h.join(tokens[0])
  const coins = a.state.crewCoins
  const caught = () => a.state.events.fire.hotspots.filter((spot) => spot.caught).length
  assert.equal(caught(), 1)
  h.advanceUntil(() => caught() === 2, 30 * 45)
  assert.equal(a.state.events.fire.located, false, 'nobody is near enough to see it')
  h.advanceUntil(() => a.state.events.fire === null, 30 * 30)
  assert.equal(a.state.events.lastFire.outcome, 'burned-out')
  assert.equal(a.state.crewCoins, coins)
})

test('spraying a fire drains the extinguisher, and an empty one refills at a station or on its stand', (t) => {
  const farm = extinguisherStations.find((station) => station.id === 'farm')
  const id = stationItem('farm'), other = stationItem('harbor')
  let spot
  const h = setup(t, {
    players: [player(0), player(1, offset(farm, 0, 1.2))],
    arrange(save) {
      spot = burning(save, 'farm-hedge', 'blaze').hotspots[0]
      Object.assign(save.crew[0].player, offset({ ...spot, heading: 0 }, 0, -3), { y: walkingHeight(spot) })
      Object.assign(save.world.items[other], { holder: 0, charge: 0.05 })
      Object.assign(save.world.items[id], { holder: 1, charge: 0.3, x: farm.x + 3 })
    },
  })
  const a = h.join(tokens[0]), b = h.join(tokens[1])
  a.request('primary', { phase: 'start' })
  holdUntil(h, a, () => a.state.items[other].charge === 0, 30 * 3)
  h.hold(a, 6)
  assert.equal(a.state.items[other].spraying, false, 'an empty extinguisher stops spraying')
  assert.ok(a.state.events.fire.hotspots[0].heat > 0)
  assert.equal(b.state.items[id].charge, 0.3, 'spraying away from a fire costs nothing')
  assert.deepEqual(actionHint(b.state, b.player), ['E', 'Refill extinguisher'])
  b.request('interact')
  h.advance()
  assert.equal(b.state.items[id].charge, undefined)
  assert.deepEqual(actionHint(b.state, b.player), ['E', 'Return extinguisher to its stand'])
  b.request('interact')
  h.advance()
  assert.deepEqual([b.state.items[id].x, b.state.items[id].z], [farm.x, farm.z])
})

test('an extinguisher left lying about is back on its stand, full, after dawn', (t) => {
  const farm = extinguisherStations.find((station) => station.id === 'farm')
  const id = stationItem('farm')
  const h = setup(t, {
    players: [player(0)],
    arrange(save) {
      afterShift(save, daySeconds - 30)
      Object.assign(save.world.items[id], { x: farm.x + 4, charge: 0.2 })
    },
  })
  const a = h.join(tokens[0])
  holdUntil(h, a, () => a.state.islandTime >= daySeconds, 30 * 40)
  h.advance()
  const restocked = a.state.items[id]
  assert.deepEqual([restocked.x, restocked.z, restocked.charge], [farm.x, farm.z, undefined])
})

test('a burning fire and a part-used extinguisher survive a restart, and older saves gain the stations', (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'mission-wildfire-'))
  t.after(() => rmSync(folder, { recursive: true, force: true }))
  const file = islandSaveFile(folder, 5173)
  const h = setup(t, {
    players: [player(0)],
    arrange(save) {
      burning(save, 'farm-hedge', 'spot')
      save.world.items[stationItem('farm')].charge = 0.4
    },
  })
  h.join(tokens[0])
  file.write(h.game.snapshotForSave())
  const reloaded = file.load()
  assert.equal(reloaded.world.events.fire.site, 'farm-hedge')
  assert.equal(reloaded.world.items[stationItem('farm')].charge, 0.4)
  assert.equal(createGame({ save: reloaded }).snapshotForSave().world.events.fire.size, 'spot')

  const older = createGame().snapshotForSave()
  older.version = 6
  delete older.world.events
  older.world.items = older.world.items.slice(0, itemStarts.length - extinguisherStations.length)
  file.write(older)
  const migrated = file.load()
  assert.equal(migrated.version, 7)
  assert.equal(migrated.world.items.length, itemStarts.length)
  assert.deepEqual(migrated.world.events, { seed: 0, nextFireAt: null, fire: null, firesOut: 0 })

  const broken = createGame().snapshotForSave()
  broken.world.events.fire = { id: 4, site: 'nowhere', size: 'spot', startedAt: 0, located: false, hotspots: [] }
  file.write(broken)
  assert.throws(() => file.load(), /Could not load island save/)
})

test('pay drops with each hotspot that caught, and the spread countdown survives a restart', (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'mission-wildfire-spread-'))
  t.after(() => rmSync(folder, { recursive: true, force: true }))
  const file = islandSaveFile(folder, 5173)
  let fire
  const h = setup(t, {
    players: [player(0)],
    arrange(save) {
      fire = burning(save, 'meadow-slope', 'blaze')
      for (const spot of fire.hotspots.slice(0, 3)) Object.assign(spot, { caught: true, heat: spot.peak })
      fire.spreadElapsed = 12
    },
  })
  const a = h.join(tokens[0])
  assert.equal(wildfirePay(a.state.events.fire), wildfireSizes.blaze.coins - 2)
  file.write(h.game.snapshotForSave())
  const saved = file.load().world.events.fire.spreadElapsed
  assert.ok(saved > 12 && saved < 13)
  const caught = (state) => state.events.fire.hotspots.filter((spot) => spot.caught).length
  h.advanceUntil(() => caught(a.state) === 4, 30 * 9)
  assert.ok(a.messages.some((message) => message.type === 'wildfire' && message.event === 'spread' && message.burning === 4))
})

test('a fire waits while nobody is awake to see it', (t) => {
  const h = setup(t, { players: [player(0)], arrange: (save) => void burning(save) })
  const a = h.join(tokens[0])
  const heat = () => a.state.events.fire.hotspots[0].heat
  const before = heat()
  a.close()
  h.advance(30)
  const watcher = h.join(tokens[0])
  assert.ok(Math.abs(heat.call(null) - before) < 0.05)
  assert.ok(watcher.state.events.fire.startedAt > dryMorning, 'the burnout clock moved with the pause')
})

test('a fire spreads to the hotspot the wind carries it toward, and remembers the burnt ground', (t) => {
  let fire
  const h = setup(t, {
    players: [player(0)],
    arrange(save) {
      fire = burning(save, 'pinewoods-glade', 'blaze')
      Object.assign(fire.hotspots[0], { heat: fire.hotspots[0].peak })
      fire.spreadElapsed = 19.9
    },
  })
  const a = h.join(tokens[0])
  h.advanceUntil(() => a.state.events.fire.hotspots.filter((spot) => spot.caught).length === 2, 30 * 3)
  const [first, ...rest] = a.state.events.fire.hotspots
  const wind = windAt(a.state.islandTime)
  const score = (spot) => {
    const gap = Math.hypot(spot.x - first.x, spot.z - first.z)
    return ((spot.x - first.x) * wind.x + (spot.z - first.z) * wind.z) / gap - gap * 0.12
  }
  const best = Math.max(...rest.map(score))
  const caught = rest.find((spot) => spot.caught)
  assert.ok(score(caught) >= best - 0.25, 'the downwind hotspot catches, within the seeded jitter')

  // Reload with the flames gone: the record keeps which hotspots burned, for the scar.
  const saved = h.game.snapshotForSave()
  const burnt = saved.world.events.fire.hotspots.flatMap((spot, index) => spot.caught ? [index] : [])
  for (const spot of saved.world.events.fire.hotspots) spot.heat = 0
  const later = setup(t, { saved })
  const b = later.join(tokens[0])
  later.advance()
  assert.equal(b.state.events.fire, null)
  assert.deepEqual(b.state.events.lastFire.burned, burnt)
})

test('grass will not catch for two hours after a shower, and a long dry spell brings the next fire early', (t) => {
  const afterShower = setup(t, {
    players: [player(0)],
    arrange(save) {
      afterShift(save, 170)
      save.world.events.nextFireAt = save.islandTime
    },
  })
  const a = afterShower.join(tokens[0])
  afterShower.advance(30 * 10)
  assert.equal(a.state.events.fire, null, 'still damp at 15:00')
  afterShower.advanceUntil(() => a.state.events.fire !== null, 30 * 75)
  assert.ok(dryHoursAt(a.state.islandTime) >= 2)

  for (const [lead, expected] of [[120, true], [200, false]]) {
    const dry = setup(t, {
      players: [player(0)],
      arrange(save) {
        afterShift(save, 1100)
        save.world.events.nextFireAt = save.islandTime + lead
      },
    })
    const b = dry.join(tokens[0])
    dry.advance()
    assert.equal(b.state.events.fire !== null, expected, `a fire due ${lead} s after 22 dry hours ${expected ? 'starts now' : 'waits'}`)
  }
})

test('Juniper hares bolt from burning ground as they would from a visitor', () => {
  const weather = { hour: 12, rain: 0 }
  const calm = createJuniperHabitat(), smoky = createJuniperHabitat()
  const [hare] = calm(0, weather, []).hares
  smoky(0, weather, [])
  const fire = { x: juniperCenter.x + hare.x + 0.5, z: juniperCenter.z + hare.z }
  let quiet, burning
  for (let second = 1; second <= 4; second++) {
    quiet = calm(second, weather, [])
    burning = smoky(second, weather, [], [fire])
  }
  const gap = (frame) => Math.hypot(juniperCenter.x + frame.hares[0].x - fire.x, juniperCenter.z + frame.hares[0].z - fire.z)
  assert.ok(gap(burning) > gap(quiet) + 1, `the hare keeps ${gap(burning).toFixed(1)} m from the fire, against ${gap(quiet).toFixed(1)} m on a calm day`)
})

test('across many seeds, a hotspot downwind always catches before an equally close one upwind', () => {
  for (const islandTime of [0, daySeconds * 1.8]) {
    const wind = windAt(islandTime)
    const unit = { x: wind.x / wind.strength, z: wind.z / wind.strength }
    const spot = (along, heat, caught) => ({ x: unit.x * along, z: unit.z * along, heat, peak: 1, caught })
    for (let seed = 1; seed <= 40; seed++) {
      const fire = { id: 1, site: 'meadow-slope', size: 'patch', startedAt: 0, located: false, hotspots: [spot(0, 1, true), spot(-2, 0, false), spot(2, 0, false)] }
      const events = { seed, nextFireAt: null, fire, firesOut: 0 }
      assert.equal(downwindHotspot(events, fire, islandTime), fire.hotspots[2], `seed ${seed} at ${islandTime} s`)
    }
  }
})
