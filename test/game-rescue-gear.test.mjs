import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createGame } from '../server/game.ts'
import { islandSaveFile } from '../server/save.ts'
import { learnerVehicles } from '../src/learner-vehicles.ts'
import { throwRangeM } from '../src/rescue-gear.ts'
import { waterLevel } from '../src/terrain.ts'
import { distance, dockEndZ, harborDock, itemStarts, lookout, offset } from '../src/world.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

const pickup = learnerVehicles.pickup
const gearId = (kind) => itemStarts.findIndex((start) => start.kind === kind && 'slot' in start)
const tailgate = offset(pickup.park, 0, -3.1)
const holding = (kind, id = 0) => (save) => Object.assign(save.world.items[gearId(kind)], { holder: id, stowed: undefined })

test('pickup gear rides stowed in the bed and stays with the pickup as it drives', (t) => {
  const { join, hold } = setup(t, { players: [player(0, pickup.park, { seat: 'driver', vehicle: 'pickup' })] })
  const driver = join(tokens[0])
  const gear = () => driver.state.items.filter((item) => 'slot' in itemStarts[item.id])
  assert.equal(gear().length, 8)
  assert.ok(gear().every((item) => item.stowed && distance(item, driver.state.vehicles.pickup) < 3))
  hold(driver, 90, { z: 1 })
  assert.ok(distance(driver.state.vehicles.pickup, pickup.park) > 6, 'The pickup drove away')
  assert.ok(gear().every((item) => item.stowed && distance(item, driver.state.vehicles.pickup) < 3), 'The gear came along')
})

test('crew take gear from the bed with E and stow it again at the pickup', (t) => {
  const { join, advance } = setup(t, { players: [player(0, tailgate)] })
  const crew = join(tokens[0])
  const kit = gearId('first-aid')
  crew.request('interact', { choice: { action: 'pick-up', subject: kit } })
  advance()
  assert.equal(crew.state.items[kit].holder, 0)
  assert.equal(crew.state.items[kit].stowed, undefined)
  crew.request('interact', { choice: { action: 'put-down' } })
  advance()
  assert.equal(crew.state.items[kit].holder, null)
  assert.equal(crew.state.items[kit].stowed, true)
})

test('the radio and whistle tell the whole crew where the caller is, without repeating on a double click', (t) => {
  const { join, advance } = setup(t, {
    players: [player(0, lookout), player(1, tailgate)],
    arrange: holding('radio'),
  })
  const caller = join(tokens[0])
  const partner = join(tokens[1])
  caller.request('primary', { phase: 'start' })
  advance()
  caller.request('primary', { phase: 'release' })
  caller.request('primary', { phase: 'start' })
  advance()
  const heard = partner.messages.filter(({ type }) => type === 'crew-signal')
  assert.equal(heard.length, 1)
  assert.equal(heard[0].signal, 'radio')
  assert.equal(heard[0].place, 'Forest Lookout')
  assert.ok(distance(heard[0], lookout) < 0.5, 'The call carries where it came from')
})

test('the first aid kit checks on the nearest crewmate', (t) => {
  const beside = offset({ ...tailgate, heading: 0 }, 1.2, 0)
  const { join, advance } = setup(t, { players: [player(0, tailgate), player(1, beside)], arrange: holding('first-aid') })
  const helper = join(tokens[0])
  const patient = join(tokens[1])
  helper.request('primary', { phase: 'start' })
  advance()
  assert.deepEqual(patient.messages.find(({ type }) => type === 'first-aid-check'), { type: 'first-aid-check', helperId: 0, patientId: 1 })
})

test('a ring buoy thrown off the dock lands ahead and floats', (t) => {
  const dockEnd = { x: harborDock.x, z: dockEndZ }
  const { join, hold } = setup(t, { players: [player(0, dockEnd, { heading: Math.PI })], arrange: holding('ring-buoy') })
  const thrower = join(tokens[0])
  const buoy = gearId('ring-buoy')
  thrower.request('primary', { phase: 'start' })
  hold(thrower, 30)
  thrower.request('input', { input: { x: 0, z: 0 } })
  thrower.request('primary', { phase: 'release', aim: Math.PI })
  hold(thrower, 1)
  const item = thrower.state.items[buoy]
  assert.equal(item.holder, null)
  assert.ok(distance(item, dockEnd) >= throwRangeM.min - 0.01, `The buoy landed ${distance(item, dockEnd).toFixed(1)} m out`)
  assert.ok(item.y >= waterLevel - 0.001, 'The buoy floats')
})

test('pickup extinguishers spray anywhere, and spraying the lookout after the fire pays nothing', (t) => {
  const { join, advance } = setup(t, {
    players: [player(0, lookout)],
    arrange: (save) => {
      save.world.mission = 'complete'
      save.world.fire = 0
      holding('extinguisher')(save)
    },
  })
  const crew = join(tokens[0])
  const coins = crew.state.crewCoins
  crew.request('primary', { phase: 'start' })
  for (let i = 0; i < 10; i++) {
    crew.request('input', { input: { x: 0, z: 0 } })
    advance()
  }
  assert.equal(crew.state.items[gearId('extinguisher')].spraying, true)
  assert.equal(crew.state.crewCoins, coins)
  assert.equal(crew.state.mission, 'complete')
})

test('a Fire Watch save from before the rescue gear gains every piece, stowed in the pickup', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mission-island-gear-save-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const file = islandSaveFile(root, 5173)
  const current = createGame().snapshotForSave()
  const legacy = { ...JSON.parse(JSON.stringify(current)), version: 7 }
  legacy.world.items = legacy.world.items.filter((_, id) => !('slot' in itemStarts[id]))
  file.write(legacy)
  const migrated = file.load()
  assert.equal(migrated.version, 8)
  assert.equal(migrated.world.items.length, itemStarts.length)
  assert.ok(migrated.world.items.filter((_, id) => 'slot' in itemStarts[id]).every((item) => item.stowed === true))
})

test('a first aid check with nobody near tells only the helper', (t) => {
  const { join, advance } = setup(t, { players: [player(0, tailgate), player(1, lookout)], arrange: holding('first-aid') })
  const helper = join(tokens[0])
  const partner = join(tokens[1])
  helper.request('primary', { phase: 'start' })
  advance()
  assert.deepEqual(helper.messages.find(({ type }) => type === 'first-aid-check'), { type: 'first-aid-check', helperId: 0, patientId: null })
  assert.equal(partner.messages.some(({ type }) => type === 'first-aid-check'), false)
})

test('a swimmer can grab a floating ring buoy', (t) => {
  const dockEnd = { x: harborDock.x, z: dockEndZ }
  const water = offset({ ...dockEnd, heading: Math.PI }, 0, 6)
  const { join, advance } = setup(t, {
    players: [player(0, water, { swimming: true, y: waterLevel - 0.52 })],
    arrange: (save) => Object.assign(save.world.items[gearId('ring-buoy')], { ...offset({ ...water, heading: 0 }, 0.8, 0), y: waterLevel, stowed: undefined }),
  })
  const swimmer = join(tokens[0])
  swimmer.request('interact', { choice: { action: 'pick-up', subject: gearId('ring-buoy') } })
  advance()
  assert.equal(swimmer.state.items[gearId('ring-buoy')].holder, 0)
})

test('gear carried into danger goes back into the pickup bed on respawn', (t) => {
  const deep = offset({ x: harborDock.x, z: dockEndZ, heading: Math.PI }, 0, 12)
  const { join, advance } = setup(t, { players: [player(0, deep, { swimming: true, y: waterLevel - 0.52 })], arrange: holding('flashlight') })
  const crew = join(tokens[0])
  crew.request('respawn')
  advance()
  const flashlight = crew.state.items[gearId('flashlight')]
  assert.equal(flashlight.holder, null)
  assert.equal(flashlight.stowed, true)
  assert.ok(distance(flashlight, crew.state.vehicles.pickup) < 3)
})
