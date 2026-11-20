import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createCargoPhysics } from '../server/cargo.ts'
import { catchChance, stepFight } from '../server/fishing.ts'
import { createGame } from '../server/game.ts'
import { canOccupyGround, stepPlayer, stepPlayerOnTerrain } from '../server/movement.ts'
import { islandSaveFile } from '../server/save.ts'
import { skiffExit, stepSkiff } from '../server/skiff.ts'
import { castPeakSeconds, chargePower, throwSeconds } from '../src/charged-actions.ts'
import { cleanCrewName, readAppearance } from '../src/crew-appearance.ts'
import { northernProps } from '../src/scenery.ts'
import { boundaryBuoys, buoyBoundaryPoint, coastPoint, groundHeight, offshoreLimitMetres, withinSkiffBoundary } from '../src/terrain.ts'
import { parkedTruckPose, truckPoint } from '../src/truck-pose.ts'
import { daylight, daySeconds, isNight, nextDawn, nightLighting, weatherAt } from '../src/weather.ts'
import { crateSize, jumpSpeed, localPoint, offset, skiffStart, truckBed, truckRoof, truckStart } from '../src/world.ts'

test('weather completes a shared day, has dry nights, and skips from either side of midnight', () => {
  assert.deepEqual(weatherAt(0), { hour: 6, rain: 0 })
  assert.deepEqual(weatherAt(daySeconds), { hour: 6, rain: 0 })
  assert.ok(weatherAt(daySeconds * 0.24).rain > 0.5)
  assert.equal(weatherAt(daySeconds * 2.24).rain, 0)
  assert.equal(daylight(12), 1)
  assert.equal(daylight(2), 0)
  assert.equal(nightLighting(2), 1)
  assert.equal(nightLighting(12), 0)
  assert.ok(isNight(2) && isNight(19) && !isNight(13))
  assert.equal(nextDawn(daySeconds * 0.65), daySeconds)
  assert.equal(nextDawn(daySeconds * 0.95), daySeconds)
})

test('the buoy line is 75 metres off the coast and stops a skiff without blocking an inward turn', () => {
  assert.equal(offshoreLimitMetres, 75)
  assert.equal(boundaryBuoys.length, 24)
  for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 1.4]) {
    const coast = coastPoint(angle)
    const boundary = buoyBoundaryPoint(angle)
    assert.ok(Math.abs(Math.hypot(coast.x - boundary.x, coast.z - boundary.z) - offshoreLimitMetres) < 1e-8)
    assert.ok(withinSkiffBoundary({ x: boundary.x * 0.999, z: boundary.z * 0.999 }))
    assert.equal(withinSkiffBoundary({ x: boundary.x * 1.001, z: boundary.z * 1.001 }), false)
  }
  const boundary = buoyBoundaryPoint(0)
  const boat = { x: boundary.x - 2.3, z: 0, heading: Math.PI / 2, speed: 0 }
  for (let i = 0; i < 200; i++) stepSkiff(boat, [{ x: 0, z: 1 }], 1 / 30)
  assert.equal(boat.speed, 0)
  assert.ok(boat.x > boundary.x - 2.3 && boat.x < boundary.x)
  const blocked = boat.x
  for (let i = 0; i < 50; i++) stepSkiff(boat, [{ x: 0, z: -1 }], 1 / 30)
  assert.ok(boat.x < blocked - 1)
  assert.equal(skiffExit(boat, 'starboard'), undefined)
  assert.equal(skiffExit({ ...skiffStart, speed: 2 }, 'port'), undefined)
})

test('throw and cast power behave differently and fishing can land, snap, or escape', () => {
  assert.equal(chargePower('throw', -1), 0)
  assert.equal(chargePower('throw', throwSeconds / 2), 0.5)
  assert.equal(chargePower('throw', throwSeconds * 2), 1)
  assert.equal(chargePower('cast', castPeakSeconds), 1)
  assert.equal(chargePower('cast', castPeakSeconds * 2), 0)
  assert.ok(catchChance(0.9) > catchChance(0.2))
  for (const [mode, expected] of [['controlled', 'caught'], ['always', 'line-snapped'], ['idle', 'escaped']]) {
    const fight = { tension: 0.25, progress: 0, pulling: false }
    let outcome
    for (let i = 0; i < 750 && !outcome; i++) {
      const elapsed = i / 30
      const reeling = mode === 'always' || (mode === 'controlled' && elapsed % 3.1 <= 1.7)
      outcome = stepFight(fight, elapsed, reeling, 1 / 30)
    }
    assert.equal(outcome, expected)
  }
})

test('expanded ground supports crates and northern scenery blocks crew movement', () => {
  const physics = createCargoPhysics()
  const p = { x: -34, z: 102 }
  const ground = groundHeight(p)
  const crate = { id: 0, kind: 'crate', holder: null, heading: 0, delivered: false }
  physics.release(crate, p, ground + 2)
  let truck = physics.parkTruck(truckStart)
  for (let i = 0; i < 120; i++) truck = physics.step([crate], truck, { x: 0, z: 0 }, 1 / 30)
  assert.ok(Math.hypot(crate.x - p.x, crate.z - p.z) < 1, JSON.stringify(crate))
  assert.ok(Math.abs(crate.y - ground - crateSize / 2) < 0.13)
  const rock = northernProps.find(({ tree }) => !tree)
  assert.ok(rock)
  assert.equal(canOccupyGround(rock, 0.4, -2), false)
})

test('the truck collides with buildings and stops at deep water', () => {
  const physics = createCargoPhysics()
  function drive(start) {
    let truck = physics.parkTruck(start)
    for (let i = 0; i < 100; i++) truck = physics.step([], truck, { x: 0, z: 1 }, 1 / 30)
    return truck
  }
  const wall = drive({ x: -50, z: -12, heading: Math.PI })
  assert.ok(wall.z < -16 && wall.z > -17.1 && Math.abs(wall.speed) < 0.1)

  const start = coastPoint(-2.2, 0.915)
  const coast = coastPoint(-2.2)
  const heading = Math.atan2(coast.x - start.x, coast.z - start.z)
  const shore = drive({ ...start, heading })
  const front = groundHeight(offset(shore, 0, 1.9))
  assert.ok(front >= -0.27 && front < -0.19)
  assert.ok(Math.abs(shore.speed) < 0.15)
})

test('the truck rear lip is jumpable and its side rail blocks an attempted entry', () => {
  const dt = 1 / 30
  const pose = parkedTruckPose(truckStart)
  function jump(lateral, forward, direction) {
    const motion = {
      player: { ...offset(truckStart, lateral, forward), y: 0, heading: 0, grounded: false, onBed: false },
      verticalSpeed: jumpSpeed,
    }
    for (let i = 0; i < 30; i++) stepPlayer(motion, pose, pose,
      i < 15 ? direction : { x: 0, z: 0 }, false, dt)
    return motion.player
  }
  assert.equal(jump(0, -3.26, { x: 1, z: 0 }).onBed, true)
  assert.equal(jump(-1.62, -1.45, { x: 0, z: -1 }).onBed, false)
})

test('a second jump reaches the truck roof and stays on it as the truck moves', () => {
  const dt = 1 / 30
  const pose = parkedTruckPose(truckStart)
  const motion = {
    player: { ...offset(truckStart, 0, -0.55), y: truckBed.top, heading: truckStart.heading,
      grounded: false, onBed: false, swimming: false },
    verticalSpeed: jumpSpeed,
  }
  for (let i = 0; i < 36; i++) {
    stepPlayer(motion, pose, pose, { x: i < 11 ? 1 : 0, z: 0 }, false, dt)
  }
  assert.equal(motion.player.truckSurface, 'roof')
  assert.equal(motion.player.y, truckRoof.top)
  const local = localPoint(pose, motion.player)
  const moved = { ...pose, x: pose.x + 0.8, pitch: -0.2, roll: 0.12 }
  const expected = truckPoint(moved, local.x, truckRoof.top, local.z)
  stepPlayer(motion, pose, moved, { x: 0, z: 0 }, false, dt)
  assert.ok(Math.abs(motion.player.x - expected.x) < 1e-9)
  assert.ok(Math.abs(motion.player.y - expected.y) < 1e-9)
  assert.equal(motion.player.truckSurface, 'roof')
})

test('a crate blocks a walking player and supports a player landing from a jump', () => {
  const dt = 1 / 30
  const pose = parkedTruckPose(truckStart)
  const top = (point, margin) => Math.abs(point.x - 20.9) < crateSize / 2 + margin &&
    Math.abs(point.z + 18) < crateSize / 2 + margin ? crateSize : -Infinity
  const motion = { player: { x: 19.5, z: -18, y: 0, heading: 0, grounded: true, onBed: false, swimming: false }, verticalSpeed: 0 }
  for (let i = 0; i < 12; i++) stepPlayer(motion, pose, pose, { x: 1, z: 0 }, false, dt, top)
  assert.ok(motion.player.x < 20.45)
  motion.player.grounded = false
  motion.verticalSpeed = jumpSpeed
  for (let i = 0; i < 40; i++) {
    stepPlayer(motion, pose, pose, { x: motion.player.x < 20.75 ? 1 : 0, z: 0 }, false, dt, top)
  }
  assert.ok(Math.abs(motion.player.y - crateSize) < 0.02)
  assert.equal(motion.player.grounded, true)
})

test('a second draft truck blocks walking and supports landing on its bed', () => {
  const first = parkedTruckPose(truckStart)
  const second = parkedTruckPose({ ...truckStart, x: 21, z: -18 })
  const motion = {
    player: { ...offset(second, 0, -3.26), y: groundHeight(second), heading: 0, grounded: true, onBed: false, swimming: false },
    verticalSpeed: 0,
  }
  const step = () => stepPlayerOnTerrain(motion, [first, second], { x: 1, z: 0 }, false, 1 / 30, () => -Infinity)
  for (let i = 0; i < 12; i++) step()
  assert.ok(motion.player.x < second.x - 3)
  motion.player.grounded = false
  motion.verticalSpeed = jumpSpeed
  for (let i = 0; i < 24; i++) step()
  assert.equal(motion.player.truckSurface, 'bed')
})

test('named save slots are separate, validated and replaced with full snapshots', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mission-island-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  assert.equal(islandSaveFile(root, 5173, 'off'), undefined)
  assert.throws(() => islandSaveFile(root, 5173, '../unsafe'), /MISSION_ISLAND_SAVE/)
  const first = islandSaveFile(root, 5173)
  const other = islandSaveFile(root, 5173, 'weekend')
  assert.equal(first.load(), undefined)
  const save = createGame().snapshotForSave()
  first.write(save)
  assert.deepEqual(first.load(), save)
  const crew = [{ token: 'a'.repeat(32), reserved: true, player: {
    ...truckStart, id: 0, y: 0, coins: 0, seeds: 0, inventory: [], goods: { fish: 0, carrots: 0 },
  } }]
  const held = { ...save, crew, world: { ...save.world, items: save.world.items.map((item) => ({ ...item })) } }
  held.world.items[0].holder = 0
  first.write(held)
  assert.deepEqual(first.load(), held)
  for (const holder of ['0', 1]) {
    held.world.items[0].holder = holder
    first.write(held)
    assert.throws(() => first.load(), /Could not load island save/)
  }
  held.world.items[0].holder = 0
  crew[0].reserved = false
  first.write(held)
  assert.throws(() => first.load(), /Could not load island save/)
  assert.equal(other.load(), undefined)
  save.islandTime = 500
  save.world.farm[0] = 'planted'
  first.write(save)
  other.write(save)
  assert.deepEqual(first.load(), save)
  assert.deepEqual(other.load(), save)
  const legacy = { ...save, world: { ...save.world } }
  delete legacy.world.jobs
  delete legacy.jobCrew
  other.write(legacy)
  assert.deepEqual(other.load(), legacy)
  save.world.mission = 'complete'
  save.world.jobs.active = { id: 'market-fish', progress: 1 }
  first.write(save)
  assert.deepEqual(first.load(), save)
  other.write({ ...save, world: { ...save.world, jobs: { completed: 0, active: { id: 'market-fish', progress: 2 } } } })
  assert.throws(() => other.load(), /Could not load island save/)
  const filename = join(root, '.mission-island', 'saves', 'weekend.json')
  assert.ok(readFileSync(filename, 'utf8').endsWith('\n'))
  writeFileSync(filename, '{"version":2}')
  assert.throws(() => other.load(), /Could not load island save/)
  assert.equal(readFileSync(filename, 'utf8'), '{"version":2}')
})

test('display names normalize spaces and remove control characters', () => {
  assert.equal(cleanCrewName(null), '')
  assert.equal(cleanCrewName('  Jo\u0000\u202e   Island  '), 'Jo Island')
  const spaced = cleanCrewName('Jo\t \u202e \nIsland')
  assert.equal(spaced, 'Jo Island')
  assert.equal(cleanCrewName(spaced), spaced)
  assert.equal(cleanCrewName('L'.repeat(30)).length, 24)
  assert.deepEqual(readAppearance({ uniform: 'constructor', skin: 2 }), { uniform: 'default', skin: 'default' })
})
