import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { EventEmitter } from 'node:events'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { canWalkAt } from '../server/movement.ts'
import { createGame } from '../server/game.ts'
import { islandSaveFile } from '../server/save.ts'
import { juniperCenter, juniperLayout } from '../src/juniper-habitat.ts'
import { actionHint, atHomeDoor } from '../src/actions.ts'
import { chargePower } from '../src/charged-actions.ts'
import { farmPlots, market } from '../src/farm.ts'
import { fisherAt } from '../src/harbor-fisher.ts'
import { jobBoard, jobs, secondIslandGoal } from '../src/jobs.ts'
import { footpaths, shellglassPoint } from '../src/routes.ts'
import { northernRegions } from '../src/scenery.ts'
import { groundHeight, grove, maxWadeDepth, walkingHeight, waterDepth, waterLevel } from '../src/terrain.ts'
import { daySeconds, isNight } from '../src/weather.ts'
import { crewHomes, ferryTerminal, jobPay, lookout, offset, skiffStart, spawns, town, truckStart } from '../src/world.ts'

const tokens = ['a'.repeat(32), 'b'.repeat(32), 'c'.repeat(32)]

class GameClient extends EventEmitter {
  readyState = 1
  bufferedAmount = 0
  messages = []
  send(raw) {
    const message = JSON.parse(raw)
    if (message.type === 'state') this.state = message
    else this.messages.push(message)
  }
  request(type, extra = {}) { this.emit('message', Buffer.from(JSON.stringify({ type, ...extra }))) }
  close() { this.readyState = 3; this.emit('close') }
  terminate() { this.close() }
  get player() {
    const id = this.messages.find(({ type }) => type === 'welcome')?.id
    return this.state.players.find((player) => player.id === id)
  }
}

function player(id, point = spawns[id], overrides = {}) {
  return {
    ...point, id, heading: 0, y: groundHeight(point), grounded: true, onBed: false, reaching: false, rightHandRaised: false,
    connected: true, sleeping: false, seat: null, inventory: [], equipped: null, goods: { fish: 0, carrots: 0 },
    seeds: 0, charge: null, casting: null, throwing: false, rowing: false, ownsAngler: false, ...overrides,
  }
}

function setup(t, { saved, players = [], arrange = () => {}, random = () => 0 } = {}) {
  let time = 10000
  const checkpoint = t.mock.fn(() => game.snapshotForSave())
  const save = saved ?? createGame().snapshotForSave()
  if (!saved) save.crew = players.map((entry, index) => ({ token: tokens[index], player: entry, reserved: true }))
  arrange(save)
  const game = createGame({ save, clock: () => time, random, checkpoint })
  const sockets = []
  t.after(() => sockets.forEach((socket) => socket.close()))
  function advance(ticks = 1) {
    for (let i = 0; i < ticks; i++) {
      time += 1000 / 30
      game.tick()
    }
  }
  function link() {
    const socket = new GameClient()
    sockets.push(socket)
    game.connect(socket)
    return socket
  }
  function join(token) {
    const socket = link()
    socket.request('join', { token })
    advance()
    return socket
  }
  function input(socket, request = {}) {
    socket.request('input', { input: { x: 0, z: 0, ...request } })
  }
  function hold(socket, ticks, request = {}) {
    for (let i = 0; i < ticks; i++) {
      if (i % 6 === 0) input(socket, request)
      advance()
    }
  }
  function click(socket, aim) {
    input(socket)
    socket.request('primary', { phase: 'start' })
    socket.request('primary', { phase: 'release', aim })
    advance()
  }
  function elapse(milliseconds) {
    time += milliseconds
    advance()
  }
  function advanceUntil(condition, limit = 2900) {
    for (let i = 0; i < limit && !condition(); i++) advance()
    assert.ok(condition(), 'The expected game state was not reached before the tick limit')
  }
  return { game, advance, advanceUntil, elapse, link, join, input, hold, click, checkpoint }
}

function door(id) {
  const { x, z, d } = crewHomes[id].building
  return { x, z: z - d / 2 - 0.75 }
}

test('one player turns in at their door and advances to dawn', (t) => {
  const h = setup(t, {
    players: [player(0, door(0))],
    arrange: (save) => { save.islandTime = daySeconds * 0.68 },
  })
  const a = h.join(tokens[0])
  assert.ok(atHomeDoor(a.player))
  assert.match(actionHint(a.state, a.player)[1], /Turn in/)
  a.request('interact')
  h.advance()
  assert.equal(a.state.weather.hour, 6)
  assert.equal(a.player.sleeping, false)
})

test('two connected players must turn in, and a waiting player can cancel', (t) => {
  const h = setup(t, {
    players: [player(0, door(0)), player(1, door(1))],
    arrange: (save) => { save.islandTime = daySeconds * 0.73 },
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  a.request('interact')
  h.advance()
  assert.equal(a.player.sleeping, true)
  assert.match(actionHint(a.state, a.player)[1], /Waiting/)
  assert.ok(isNight(b.state.weather.hour))
  a.request('interact')
  h.advance()
  assert.equal(a.player.sleeping, false)
  a.request('interact')
  h.input(a, { z: -1 })
  h.advance()
  assert.equal(a.player.sleeping, false)
  h.input(a)
  a.request('interact')
  b.request('interact')
  h.advance()
  assert.deepEqual(a.state.weather, b.state.weather)
  assert.equal(a.state.islandTime, b.state.islandTime)
  assert.equal(b.state.weather.hour, 6)
  assert.equal(b.player.sleeping, false)
  a.request('interact')
  h.advance()
  assert.equal(a.player.sleeping, false)
})

test('an occupied crew slot is protected, reconnects, and keeps its profile after expiry', (t) => {
  const h = setup(t)
  const invalid = h.link()
  invalid.emit('message', Buffer.from('{'))
  invalid.emit('message', Buffer.from('null'))
  invalid.request('interact')
  invalid.request('join', { token: 'invalid' })
  assert.equal(invalid.messages.length, 0)
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  assert.equal(h.join(tokens[0]).messages[0].type, 'duplicate')
  assert.equal(h.join(tokens[2]).messages[0].type, 'full')
  assert.deepEqual(actionHint(a.state, a.player), ['E', 'Take tools and a carrot seed'])
  a.request('interact')
  a.request('appearance', { appearance: { uniform: 'angler', skin: 'deep' } })
  a.request('input', { input: null })
  h.advance()
  assert.equal(a.player.equipped, 'fishing-rod')
  assert.deepEqual(a.player.appearance, { uniform: 'default', skin: 'deep' })
  assert.equal(a.state.players.length, 2)
  a.close()
  assert.equal(h.join(tokens[0]).player.inventory.length, 3)
  b.close()
  h.advance(363)
  assert.equal(h.game.snapshotForSave().crew.find(({ token }) => token === tokens[1]).reserved, false)
  const restored = h.join(tokens[1])
  assert.equal(restored.player.id, 1)
  assert.equal(restored.player.connected, true)
})

test('markets sell only owned goods, consume coins for seeds and protect locked uniforms', (t) => {
  const h = setup(t, { players: [player(0, market, { goods: { fish: 2, carrots: 1 } }), player(1)] })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  assert.match(actionHint(a.state, a.player)[1], /Sell for 7/)
  a.request('buy-seed')
  a.request('interact')
  a.request('interact')
  b.request('buy-seed')
  a.request('buy-seed')
  a.request('buy-angler')
  a.request('buy-angler')
  a.request('appearance', { appearance: { uniform: 'angler', skin: 12 } })
  h.advance()
  assert.deepEqual(a.player.goods, { fish: 0, carrots: 0 })
  assert.equal(a.state.crewCoins, 3)
  assert.equal(b.state.crewCoins, 3)
  assert.deepEqual(b.messages.filter(({ type }) => type === 'market-sale'), [{ type: 'market-sale', coins: 7 }])
  assert.equal(a.player.seeds, 1)
  assert.equal(b.player.seeds, 0)
  assert.equal(a.player.appearance.uniform, 'angler')
  assert.equal(a.messages.filter(({ type }) => type === 'market-sale').length, 1)
  assert.ok(h.checkpoint.mock.callCount() > 0)
})

test('simultaneous purchases spend the last shared coin once and award the seed to its buyer', (t) => {
  const h = setup(t, { players: [player(0, market), player(1, market)], arrange(save) { save.crewCoins = 1 } })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  b.request('buy-seed')
  a.request('buy-seed')
  h.advance()
  assert.equal(a.state.crewCoins, 0)
  assert.equal(b.state.crewCoins, 0)
  assert.equal(a.player.seeds, 0)
  assert.equal(b.player.seeds, 1)
})

test('rain waters a shared plot, repeated crops grow from zero, and harvest is awarded once', (t) => {
  const plot = farmPlots[0]
  const h = setup(t, {
    players: [
      player(0, plot, { seeds: 2 }),
      player(1, plot, { inventory: ['hoe', 'watering-can'], equipped: 'hoe' }),
    ],
    arrange: (save) => { save.islandTime = daySeconds * 0.18 },
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  h.click(b)
  assert.equal(a.state.farm[0], 'tilled')
  b.request('interact')
  h.advance()
  assert.equal(a.state.farm[0], 'tilled')
  a.request('interact')
  h.advance()
  assert.equal(b.state.farm[0], 'planted')
  h.advanceUntil(() => b.state.farm[0] !== 'planted')
  assert.ok(a.state.weather.rain > 0.35)
  assert.equal(b.state.farm[0], 'watered')
  h.advanceUntil(() => b.state.farm[0] !== 'watered')
  a.request('interact')
  b.request('interact')
  h.advance()
  assert.equal(a.player.goods.carrots + b.player.goods.carrots, 1)
  assert.equal(a.state.farm[0], 'grass')
  h.click(b)
  a.request('interact')
  h.advance(60)
  assert.equal(a.player.seeds, 0)
  assert.equal(b.state.farm[0], 'watered')
  assert.ok(h.game.snapshotForSave().growth[0] < 3)
  h.advanceUntil(() => b.state.farm[0] !== 'watered')
  b.request('interact')
  h.advance()
  assert.equal(b.player.goods.carrots, 1)
})

test('hand watering starts growth and darkness pauses it', (t) => {
  const h = setup(t, {
    players: [player(0, farmPlots[3], { inventory: ['watering-can'], equipped: 'watering-can' })],
    arrange: (save) => { save.world.farm[3] = 'planted'; save.islandTime = daySeconds * 0.67 },
  })
  const a = h.join(tokens[0])
  h.click(a)
  h.advance(100)
  assert.equal(a.state.farm[3], 'watered')
  assert.equal(h.game.snapshotForSave().growth[3], 0)
})

function cast(h, client, heading) {
  h.input(client)
  client.request('primary', { phase: 'start' })
  h.hold(client, 26)
  assert.ok(client.player.charge.power > 0.9)
  client.request('primary', { phase: 'release', aim: heading })
  h.advance()
}

test('crewmates see the raised right hand independently of left reach, and it clears on release or timeout', (t) => {
  const h = setup(t)
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  const observed = () => b.state.players.find(({ id }) => id === a.player.id)
  h.input(a, { raiseRightHand: true })
  a.request('primary', { phase: 'start' })
  h.advance()
  assert.equal(observed().rightHandRaised, true)
  assert.equal(observed().reaching, true)
  assert.equal(h.game.snapshotForSave().crew[0].player.rightHandRaised, false)
  h.input(a, { raiseRightHand: false })
  h.advance()
  assert.equal(observed().rightHandRaised, false)
  assert.equal(observed().reaching, true)
  h.input(a, { raiseRightHand: true })
  h.advance()
  h.elapse(450)
  assert.equal(observed().rightHandRaised, false)
})

test('dock fishing synchronizes a bite, lets the player reel and rewards the landed fish', (t) => {
  const point = { x: -44, z: -36.7 }
  const h = setup(t, { players: [player(0, point, { inventory: ['fishing-rod'], equipped: 'fishing-rod' })] })
  const a = h.join(tokens[0])
  cast(h, a, 0)
  assert.ok(a.messages.some(({ result }) => result === 'dry-cast'))
  cast(h, a, Math.PI)
  assert.ok(a.player.casting.bobber.z < point.z)
  h.hold(a, 110)
  assert.match(actionHint(a.state, a.player)[1], /reel/)
  assert.equal(a.player.goods.fish, 0)
  let reeling = false
  for (let i = 0; i < 690 && a.player.casting; i++) {
    h.input(a)
    const desired = !a.player.casting.fight.pulling
    if (desired !== reeling) a.request('primary', { phase: desired ? 'start' : 'release' })
    reeling = desired
    h.advance()
  }
  assert.equal(a.player.goods.fish, 1)
  assert.ok(a.messages.some(({ result }) => result === 'caught'))
})

test('a bite is independent of the cast meter and walking retrieves the line', (t) => {
  const h = setup(t, {
    players: [player(0, { x: -44, z: -36.7 }, { inventory: ['fishing-rod'], equipped: 'fishing-rod' })],
    random: () => 1,
  })
  const a = h.join(tokens[0])
  cast(h, a, Math.PI)
  h.hold(a, 111)
  assert.ok(a.messages.some(({ result }) => result === 'no-bite'))
  assert.equal(a.player.goods.fish, 0)
  cast(h, a, Math.PI)
  h.hold(a, 2, { x: 1 })
  assert.equal(a.player.casting, null)
})

test('two players board a skiff, and paddling retrieves the other player’s line', (t) => {
  const shore = { x: -46.7, z: -33.9 }
  const rod = { inventory: ['fishing-rod'], equipped: 'fishing-rod' }
  const h = setup(t, { players: [player(0, shore, rod), player(1, shore, rod)] })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  assert.equal(actionHint(a.state, a.player)[1], 'Board skiff')
  a.request('seat'); b.request('seat')
  h.advance()
  assert.equal(a.player.seat, 'port')
  assert.equal(b.player.seat, 'starboard')
  cast(h, a, skiffStart.heading)
  h.hold(b, 15, { z: 1 })
  assert.equal(a.player.casting, null)
  assert.ok(b.state.skiff.speed > 0)
  h.click(b)
  assert.ok(b.messages.some(({ result }) => result === 'boat-moving'))
  b.request('seat')
  h.advance()
  assert.equal(b.player.seat, 'starboard')
  h.advance(50)
  b.request('seat')
  h.advance()
  assert.equal(b.player.seat, null)
  assert.ok(b.player.y < 1 && b.player.y > waterLevel - 0.55)
})

test('short throws use physical cargo and the truck keeps it when the crew boards', (t) => {
  const h = setup(t, {
    players: [player(0, offset(truckStart, 0, -4.8)), player(1, offset(truckStart, 2.1, 0.9))],
    arrange: (save) => { save.world.items[0].holder = 0 },
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  a.request('seat')
  h.advance()
  assert.equal(a.player.seat, null)
  a.request('primary', { phase: 'start' })
  h.advance()
  assert.ok(a.player.charge.power < 0.1)
  a.request('primary', { phase: 'cancel' })
  h.advance()
  assert.equal(b.state.items[0].holder, 0)
  h.click(a, truckStart.heading)
  h.advance(90)
  assert.equal(b.state.items[0].onBed, true)
  b.request('seat')
  h.advance()
  assert.equal(b.player.seat, 'driver')
  h.hold(b, 45, { z: 1, careful: true })
  assert.ok(b.state.truck.x > truckStart.x)
  assert.equal(a.state.items[0].onBed, true)
  assert.deepEqual(actionHint(b.state, b.player), ['Space', 'Brake to exit truck'])
  h.hold(b, 30, { brake: true })
  assert.equal(a.state.truck.braking, true)
  assert.equal(b.state.truck.speed, 0)
  b.request('seat')
  h.advance()
  assert.equal(b.player.seat, null)
})

test('the driver and passenger share hilly suspension and only the driver operates the brake', (t) => {
  const start = { x: -19, z: 11, heading: 0 }
  const h = setup(t, {
    players: [player(0, offset(start, -2.1, 0)), player(1, offset(start, 2.1, 0))],
    arrange: (save) => { save.world.truck = start },
  })
  const driver = h.join(tokens[0])
  const passenger = h.join(tokens[1])
  driver.request('seat')
  passenger.request('seat')
  h.advance()
  assert.equal(driver.player.seat, 'driver')
  assert.equal(passenger.player.seat, 'passenger')
  h.input(passenger, { brake: true })
  h.hold(driver, 45, { z: 1, careful: true })
  const climbing = driver.state.truck
  assert.ok(climbing.z > start.z + 2.5 && climbing.y > 0.5 && climbing.speed > 3)
  assert.ok(climbing.pitch < -0.12 && Math.abs(climbing.roll) > 0.05)
  assert.ok(Math.max(...climbing.suspension) - Math.min(...climbing.suspension) > 0.02)
  assert.equal(climbing.braking, false)
  assert.deepEqual(passenger.state.truck, climbing)
  assert.deepEqual(actionHint(passenger.state, passenger.player), ['', 'Wait for the truck to stop'])
  h.hold(driver, 30, { z: 1, brake: true })
  const stopped = passenger.state.truck
  assert.equal(stopped.braking, true)
  assert.equal(stopped.speed, 0)
  assert.deepEqual(actionHint(driver.state, driver.player), ['F', 'Exit truck'])
  assert.ok(stopped.z - climbing.z < 1.8)
  h.hold(driver, 60)
  assert.equal(passenger.state.truck.z, stopped.z)
  assert.equal(passenger.state.truck.braking, false)
  h.hold(driver, 26, { z: -1, x: 1 })
  const reversing = passenger.state.truck
  assert.ok(reversing.speed < -1 && reversing.z < stopped.z - 0.6)
  assert.ok(reversing.steering > 0.2 && reversing.heading < stopped.heading - 0.05)
  h.hold(driver, 1, { z: 1 })
  assert.equal(passenger.state.truck.braking, true)
})

test('a crate loaded on a sloping deck stays aboard after the host reloads the save', (t) => {
  const start = { x: -19, z: 14.75, heading: 0 }
  const h = setup(t, {
    players: [player(0, offset(start, 2.2, -1.5))],
    arrange(save) {
      save.world.truck = start
      save.world.items[0].holder = 0
    },
  })
  const client = h.join(tokens[0])
  client.request('interact')
  h.advance(45)
  assert.equal(client.state.items[0].onBed, true)
  assert.equal(client.state.items[0].holder, null)
  const saved = h.game.snapshotForSave()
  const game = createGame({ save: saved })
  const reconnected = new GameClient()
  t.after(() => reconnected.close())
  game.connect(reconnected)
  reconnected.request('join', { token: tokens[0] })
  for (let i = 0; i < 30; i++) game.tick()
  assert.equal(reconnected.state.items[0].onBed, true)
  assert.ok(Math.abs(reconnected.state.truck.z - saved.world.truck.z) < 0.15)
})

test('delivering all crates and spraying the fire unlocks repeatable jobs without resetting the island', (t) => {
  const h = setup(t, {
    players: [player(0, town), player(1, { x: lookout.x + 2, z: lookout.z + 1 })],
    arrange: (save) => {
      save.world.items.slice(0, 3).forEach((item, i) => Object.assign(item, { ...town, x: town.x - 1 + i, y: 0.46 }))
      Object.assign(save.world.items[3], { x: lookout.x + 1, z: lookout.z + 1 })
    },
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  b.request('interact')
  h.advance()
  assert.equal(b.state.items[3].holder, null)
  for (let i = 0; i < 3; i++) {
    a.request('interact')
    h.advance()
    assert.equal(a.state.items.some(({ holder }) => holder === 0), true)
    a.request('interact')
    h.advance()
  }
  assert.equal(b.state.mission, 'fire')
  assert.equal(b.state.crewCoins, jobPay.crate * 3 + jobPay.delivery)
  b.request('interact')
  h.advance()
  assert.match(actionHint(b.state, b.player)[1], /spray/)
  b.request('primary', { phase: 'start' })
  h.hold(b, 170)
  assert.equal(a.state.mission, 'complete')
  assert.equal(a.state.fire, 0)
  assert.equal(a.state.crewCoins, jobPay.crate * 3 + jobPay.delivery + jobPay.fire)
  assert.equal(b.state.crewCoins, a.state.crewCoins)
  assert.equal(a.state.lastStarterPay, 'fire')
  assert.equal(b.state.lastStarterPay, 'fire')
  assert.equal(a.state.items[3].holder, null)
  const before = a.player
  a.request('reset')
  h.advance()
  assert.equal(b.state.mission, 'complete')
  assert.deepEqual(a.player, before)
})

test('the cottage gives each saved profile one starter seed, including existing tool owners', (t) => {
  const h = setup(t, { players: [player(0), player(1, spawns[1], { inventory: ['hoe'] })] })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  assert.deepEqual(actionHint(a.state, a.player), ['E', 'Take tools and a carrot seed'])
  assert.deepEqual(actionHint(b.state, b.player), ['E', 'Collect starter carrot seed'])
  a.request('interact')
  b.request('interact')
  h.advance()
  assert.equal(a.player.seeds, 1)
  assert.equal(b.player.seeds, 1)
  assert.deepEqual(b.player.inventory, ['hoe'])
  assert.equal(a.messages.filter(({ type }) => type === 'starter-seed').length, 1)
  const resumed = setup(t, { saved: h.game.snapshotForSave() })
  const returning = resumed.join(tokens[0])
  returning.request('interact')
  resumed.advance()
  returning.request('interact')
  resumed.advance()
  assert.equal(returning.player.seeds, 1)
  assert.equal(returning.player.inventory.length, 3)
})

test('a solo delivery credits the bank while a crewmate is offline across a host restart', (t) => {
  const h = setup(t, {
    players: [player(0, town), player(1)],
    arrange(save) {
      save.world.items[0].holder = 0
      Object.assign(save.world.items[1], { x: town.x + 1.1, z: town.z, y: 0.5 })
      Object.assign(save.world.items[2], { x: town.x - 1.1, z: town.z, y: 0.5 })
    },
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  a.request('interact')
  h.advance()
  assert.equal(b.state.crewCoins, jobPay.crate)
  assert.equal(a.state.lastStarterPay, 'crate')
  assert.equal(b.state.lastStarterPay, 'crate')
  b.close()
  h.elapse(12_100)
  assert.equal(h.game.snapshotForSave().crew[1].reserved, false)
  const resumed = setup(t, { saved: h.game.snapshotForSave() })
  const driver = resumed.join(tokens[0])
  for (let i = 0; i < 2; i++) {
    driver.request('interact')
    resumed.advance()
    driver.request('interact')
    resumed.advance()
  }
  assert.equal(driver.state.mission, 'fire')
  assert.equal(resumed.game.snapshotForSave().crewCoins, 3 * jobPay.crate + jobPay.delivery)
  const returning = resumed.join(tokens[1])
  assert.equal(returning.state.crewCoins, driver.state.crewCoins)
  assert.equal(returning.state.lastStarterPay, 'delivery')
})

test('each cottage has its own daytime welcome note and keeps its owner across a rejoin', (t) => {
  const h = setup(t, { players: [player(0, door(0)), player(1, door(1))] })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  for (const client of [a, b]) {
    assert.deepEqual(actionHint(client.state, client.player), ['E', 'Read your welcome note'])
    client.request('interact')
    assert.deepEqual(client.messages.at(-1), { type: 'crew-note' })
    client.close()
  }
  h.elapse(12_100)
  const resumed = setup(t, { saved: h.game.snapshotForSave() })
  assert.equal(resumed.join(tokens[1]).player.id, 1)
  assert.equal(resumed.join(tokens[0]).player.id, 0)
})

test('Mara moves between walkable stops and either crewmate can talk at the fishing dock', (t) => {
  for (const hour of [0, 18.25, ...Array.from({ length: 26 }, (_, index) => 6 + index / 100)]) {
    assert.ok(canWalkAt(fisherAt(hour), .25, waterLevel - maxWadeDepth))
  }
  const dock = fisherAt(8)
  const h = setup(t, {
    players: [player(0, dock, { y: walkingHeight(dock) }), player(1, dock, { y: walkingHeight(dock) })],
    arrange(save) { save.islandTime = daySeconds * 2 / 24 },
  })
  for (const token of tokens.slice(0, 2)) {
    const client = h.join(token)
    assert.deepEqual(actionHint(client.state, client.player), ['E', 'Talk to Mara'])
    client.request('interact')
    assert.deepEqual(client.messages.at(-1), { type: 'fisher-chat' })
  }
  const approach = footpaths.find(({ name }) => name === 'Ferry approach').points
  assert.deepEqual(approach.at(-1), ferryTerminal)
  for (let z = approach[0].z; z > ferryTerminal.z + 1; z -= .5) {
    assert.ok(canWalkAt({ x: ferryTerminal.x, z }, .5, waterLevel - maxWadeDepth))
  }
})

test('an older completed shift pools legacy wallets and keeps its order and farm on rejoining', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mission-island-bank-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const file = islandSaveFile(root, 5173)
  const save = createGame().snapshotForSave()
  Object.assign(save.world, { mission: 'complete', fire: 0, jobs: { active: { id: 'market-carrots', progress: 1 }, completed: 2 } })
  save.world.farm[0] = 'watered'
  save.version = 1
  delete save.crewCoins
  save.crew = [13, 9].map((coins, id) => ({
    token: tokens[id], player: player(id, door(id), { coins, starterSeedClaimed: true, lastStarterPay: id === 0 ? 'delivery' : 'fire' }), reserved: id === 0,
  }))
  file.write(save)
  const h = setup(t, { saved: file.load() })
  const returning = tokens.slice(0, 2).map(h.join)
  for (const client of returning) {
    client.request('interact')
    h.advance()
    assert.deepEqual(client.messages.at(-1), { type: 'crew-note' })
    assert.equal(client.state.crewCoins, 22)
    assert.equal(client.state.lastStarterPay, 'fire')
    assert.deepEqual(client.state.jobs, save.world.jobs)
    assert.equal(client.state.farm[0], 'watered')
  }
  returning[1].close()
  h.elapse(12_100)
  const newcomer = h.join(tokens[2])
  assert.deepEqual(actionHint(newcomer.state, newcomer.player), ['E', 'Take tools and a carrot seed'])
  assert.equal(newcomer.state.crewCoins, 22)
  file.write(h.game.snapshotForSave())
  const migrated = file.load()
  assert.equal(migrated.version, 2)
  assert.equal(migrated.lastStarterPay, 'fire')
  assert.ok(migrated.crew.every(({ player }) => !('coins' in player)))
  assert.equal(createGame({ save: migrated }).crewCoins, 22)
  assert.deepEqual(newcomer.state.jobs, save.world.jobs)
})

test('the harbor board offers a new cargo and destination without moving either crew member or vehicle', (t) => {
  const h = setup(t, {
    players: [player(0, jobBoard), player(1, skiffStart, { seat: 'port' })],
    arrange(save) {
      save.world.mission = 'complete'
      save.world.truck = { x: 21, z: -8, heading: 0 }
      save.world.farm[1] = 'planted'
    },
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  const before = a.state
  assert.deepEqual(actionHint(a.state, a.player), ['E', 'Open the harbor job board'])
  b.request('take-job', { id: 'beach-gear' })
  a.request('take-job', { id: 'constructor' })
  h.advance()
  assert.equal(a.state.jobs.active, null)
  assert.ok(b.messages.some(({ type }) => type === 'order-unavailable'))
  a.request('take-job', { id: 'farm-supplies' })
  a.request('take-job', { id: 'beach-gear' })
  h.advance()
  assert.deepEqual(b.state.jobs.active, { id: 'farm-supplies', progress: 0 })
  assert.equal(b.player.seat, 'port')
  assert.equal(a.player.x, before.players[0].x)
  assert.deepEqual(a.state.skiff, before.skiff)
  assert.ok(Math.abs(a.state.truck.x - before.truck.x) < 0.05)
  assert.equal(a.state.farm[1], 'planted')
  assert.equal(a.state.items.filter(({ kind, delivered }) => kind === 'crate' && !delivered).length, 2)
  const saved = h.game.snapshotForSave()
  const job = jobs['farm-supplies']
  saved.crew[0].player = player(0, town)
  saved.world.items[0].holder = 0
  const wrongDrop = setup(t, { saved })
  const dropping = wrongDrop.join(tokens[0])
  dropping.request('interact')
  wrongDrop.advance()
  assert.equal(dropping.state.jobs.active.progress, 0)
  assert.equal(dropping.state.items[0].delivered, false)

  saved.crew[0].player = player(0, job.drop)
  Object.assign(saved.world.items[1], { ...job.drop, x: job.drop.x + 1, y: 0.5 })
  const nearFarm = setup(t, { saved })
  const delivery = nearFarm.join(tokens[0])
  assert.deepEqual(actionHint(delivery.state, delivery.player), ['E', 'Deliver crate'])
  for (let i = 0; i < 3; i++) {
    delivery.request('interact')
    nearFarm.advance()
  }
  assert.deepEqual(delivery.state.jobs, { active: null, completed: 1 })
  assert.equal(delivery.state.mission, 'complete')
  assert.equal(delivery.state.crewCoins, job.coins)
  assert.equal(nearFarm.join(tokens[1]).state.crewCoins, job.coins)
})

test('market orders can be filled by both players, survive a reload, and count toward the second island', (t) => {
  const h = setup(t, {
    players: [player(0, jobBoard, { goods: { fish: 2, carrots: 1 } }), player(1, market, { goods: { fish: 1, carrots: 0 } })],
    arrange(save) {
      save.world.mission = 'complete'
      save.world.jobs.completed = secondIslandGoal - 1
    },
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  a.request('take-job', { id: 'market-fish' })
  h.advance()
  assert.match(actionHint(b.state, b.player)[1], /Contribute 1 fish/)
  b.request('interact')
  h.advance()
  assert.equal(a.state.jobs.active.progress, 1)
  assert.equal(b.state.crewCoins, 0)
  const saved = h.game.snapshotForSave()
  Object.assign(saved.crew[0].player, market, { y: groundHeight(market) })
  const resumed = setup(t, { saved })
  const seller = resumed.join(tokens[0])
  assert.deepEqual(seller.state.jobs.active, { id: 'market-fish', progress: 1 })
  resumed.checkpoint.mock.resetCalls()
  seller.request('interact')
  const checkpoint = resumed.checkpoint.mock.calls[0]?.result
  assert.deepEqual(checkpoint?.world.jobs, { active: null, completed: secondIslandGoal })
  assert.equal(checkpoint.crewCoins, jobs['market-fish'].coins)
  resumed.advance()
  assert.deepEqual(seller.player.goods, { fish: 1, carrots: 1 })
  assert.equal(seller.state.crewCoins, jobs['market-fish'].coins)
  assert.deepEqual(seller.state.jobs, { active: null, completed: secondIslandGoal })
  const teammate = resumed.join(tokens[1])
  assert.equal(teammate.state.crewCoins, seller.state.crewCoins)
  seller.request('buy-seed')
  seller.request('interact')
  resumed.advance()
  assert.equal(seller.player.seeds, 1)
  assert.equal(seller.state.crewCoins, jobs['market-fish'].coins - 1 + 5)
  assert.equal(seller.state.jobs.completed, secondIslandGoal)
})

test('an extinguisher left by an expired crew member stays reachable on a hill', (t) => {
  const h = setup(t, {
    players: [player(0, grove)],
    arrange(save) {
      save.world.mission = 'fire'
      save.world.items[3].holder = 0
    },
  })
  const disconnected = h.join(tokens[0])
  disconnected.close()
  h.elapse(12_100)
  const returning = h.join(tokens[0])
  const tool = returning.state.items[3]
  assert.equal(tool.holder, null)
  assert.ok(tool.y > 2.1)
  assert.equal(tool.y, groundHeight(tool) + 0.04)
  returning.request('interact')
  h.advance()
  assert.equal(returning.state.items[3].holder, 0)
})

test('a saved night, held equipment and inventory resume after recreating the host', (t) => {
  const h = setup(t, {
    players: [player(0, door(0), { seeds: 2, goods: { fish: 2, carrots: 3 } })],
    arrange: (save) => {
      save.crewCoins = 6
      save.islandTime = daySeconds * 0.8
      save.world.farm[2] = 'watered'
      save.growth[2] = 9
      save.world.items[0].holder = 0
    },
  })
  h.join(tokens[0])
  const save = h.game.snapshotForSave()
  const restarted = createGame({ save })
  const a = new GameClient()
  t.after(() => a.close())
  restarted.connect(a)
  a.request('join', { token: tokens[0] })
  restarted.tick()
  assert.ok(isNight(a.state.weather.hour))
  assert.equal(a.state.crewCoins, 6)
  assert.equal(a.player.seeds, 2)
  assert.equal(a.state.items[0].holder, 0)
  assert.equal(a.state.farm[2], 'watered')
  assert.equal(restarted.snapshotForSave().growth[2], 9)
  assert.equal(chargePower('throw', 3), 1)
})

test('a skiff seat survives a slower reload while the other player paddles', (t) => {
  const h = setup(t, {
    players: [player(0, skiffStart, { seat: 'port' }), player(1, skiffStart, { seat: 'starboard' })],
  })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  b.close()
  h.elapse(45_000)
  h.hold(a, 100, { z: 1 })
  const restored = h.join(tokens[1])
  assert.equal(restored.player.seat, 'starboard')
  assert.equal(restored.player.swimming, false)
  assert.ok(Math.hypot(restored.player.x - restored.state.skiff.x, restored.player.z - restored.state.skiff.z) < 0.6)
})

test('a player who resumes in deep water can swim or respawn without losing progress', (t) => {
  const deep = { x: -47, z: -38 }
  const h = setup(t, {
    players: [player(0, deep, { y: groundHeight(deep), seeds: 1, inventory: ['fishing-rod'],
      equipped: 'fishing-rod', goods: { carrots: 1, fish: 2 } })],
    arrange: (save) => { save.world.items[0].holder = 0; save.crewCoins = 3 },
  })
  const a = h.join(tokens[0])
  assert.ok(waterDepth(deep) > maxWadeDepth)
  assert.equal(a.player.swimming, true)
  assert.ok(a.player.y > groundHeight(deep))
  assert.match(actionHint(a.state, a.player)[1], /Swim/)
  h.hold(a, 75, { z: 1 })
  assert.equal(a.player.swimming, false)
  a.request('respawn')
  h.advance()
  assert.equal(a.player.x, spawns[0].x)
  assert.equal(a.player.z, spawns[0].z)
  assert.equal(a.state.items[0].holder, null)
  assert.deepEqual(a.player.goods, { carrots: 1, fish: 2 })
  assert.equal(a.state.crewCoins, 3)
  assert.equal(a.player.seeds, 1)
})

test('crew names and discoveries appear in snapshots and saves', (t) => {
  const region = northernRegions[0]
  const h = setup(t, { players: [player(0, region.site), player(1)] })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  a.request('crew-name', { name: '  Lina   Moss  ' })
  h.input(a)
  h.advance()
  assert.equal(b.state.players[0].name, 'Lina Moss')
  assert.deepEqual(a.player.discoveries, [region.id])
  assert.deepEqual(b.player.discoveries, [])
  assert.deepEqual(h.game.snapshotForSave().crew[0].player.discoveries, [region.id])
})

test('discovering Shellglass Tide Pool uses the existing per-crew save path', (t) => {
  const start = footpaths.find(({ name }) => name === 'Driftwood shore walk').points[0]
  const h = setup(t, { players: [player(0, start), player(1)] })
  const a = h.join(tokens[0])
  const b = h.join(tokens[1])
  h.input(a)
  h.advance()
  assert.deepEqual(a.player.discoveries, [])
  const dx = shellglassPoint.x - start.x, dz = shellglassPoint.z - start.z
  const length = Math.hypot(dx, dz)
  h.hold(a, 36, { x: dx / length, z: dz / length })
  assert.deepEqual(a.player.discoveries, ['shellglass'])
  assert.deepEqual(b.player.discoveries, [])
  const resumed = setup(t, { saved: h.game.snapshotForSave() })
  assert.deepEqual(resumed.join(tokens[0]).player.discoveries, ['shellglass'])
})

test('a second player disturbs the shared Juniper habitat and reconnects to its current state', t => {
  const fox = juniperLayout.foxes[0]
  const nearby = { x: juniperCenter.x + fox.x, z: juniperCenter.z + fox.z + .55 }
  const { join, advance } = setup(t, { players: [player(0), player(1, nearby)] })
  const observer = join(tokens[0]), walker = join(tokens[1])
  advance(4)
  assert.equal(observer.state.juniper.foxes[0].behavior, 'fleeing')
  assert.ok(observer.state.juniper.hares.some(h => h.behavior === 'fleeing'))
  assert.deepEqual(observer.state.juniper, walker.state.juniper)
  walker.close()
  advance(150)
  assert.notEqual(observer.state.juniper.foxes[0].behavior, 'fleeing')
  const returned = join(tokens[1])
  assert.deepEqual(returned.state.juniper, observer.state.juniper)
})

test('a save made mid-jump inside the relocated market restores to walkable ground', t => {
  const wall = { x: 39, z: 1.7 }
  assert.equal(canWalkAt(wall, .4, waterLevel), false)
  const h = setup(t, { players: [player(0, wall, { grounded: false, y: 1.2 })] })
  const restored = h.join(tokens[0]).player
  assert.ok(canWalkAt(restored, .4, waterLevel))
  assert.equal(restored.grounded, true)
  assert.equal(restored.y, groundHeight(restored))
})
