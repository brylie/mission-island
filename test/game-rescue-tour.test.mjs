import assert from 'node:assert/strict'
import test from 'node:test'
import { actionHint } from '../src/actions.ts'
import { careerUnlockXp, learnerVehicles, practiceStopRadiusM, practiceStopSpeedMps, practiceStopXp, practiceTourKey } from '../src/learner-vehicles.ts'
import { buildRoadNetwork, halfWidthOf } from '../src/road-network.ts'
import { distance, offset } from '../src/world.ts'
import { harborJobSites } from '../src/worlds/starter/layout/places.ts'
import { starterRoads } from '../src/worlds/starter/layout/roads.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

// The Fire and Rescue pickup's practice tour, run through the real host. Each leg sets
// the pickup down at the next stop and lets the host tick, then carries the island on
// to the next leg through the save, as a host restart would. The legs are placed, not
// driven: steering a couple of kilometres of road in a test would cost minutes, and the
// fire road climbs are driven in game-fire-road.test.mjs.

const { pickup } = learnerVehicles
const settleTicks = 10
// Two seconds on the brake after paying: the pickup must still be at rest in the ring,
// not sliding off a slope or pushed out of a solid.
const brakeTicks = 60
const driverDoor = (pose) => offset(pose, pickup.exits[0].x, pickup.exits[0].z)
const besidePickup = (stop) => ({ x: stop.x, z: stop.z + 6 })

// A save keeps the crew on foot, so each leg seats its driver again. Anyone else stands
// clear of the pickup.
function placeCrew(save, stop, driver) {
  save.world.vehicles = { ...save.world.vehicles, pickup: { x: stop.x, z: stop.z, heading: 0 } }
  save.crew = save.crew.map((entry, slot) => ({
    ...entry,
    player: slot === driver
      ? { ...entry.player, x: stop.x, z: stop.z, seat: 'driver', vehicle: 'pickup' }
      : { ...entry.player, ...besidePickup(stop), seat: null, vehicle: undefined },
  }))
}

// One leg: the island from `saved` (or a fresh one with `crewSize` crewmates), the pickup
// at `stop` with crewmate `driver` at the wheel.
function leg(t, saved, stop, { driver = 0, crewSize = 1 } = {}) {
  const h = setup(t, {
    saved,
    players: Array.from({ length: crewSize }, (_, slot) => player(slot, besidePickup(stop))),
    arrange: (save) => placeCrew(save, stop, driver),
  })
  const sockets = joinCrew(h, saved, crewSize)
  const wheel = sockets[driver]
  h.hold(wheel, settleTicks)
  h.hold(wheel, brakeTicks, { brake: true })
  const pose = wheel.state.vehicles.pickup
  assert.ok(distance(pose, stop) <= practiceStopRadiusM, `The pickup rests inside the ring at ${stop.name}`)
  assert.ok(Math.abs(pose.speed) <= practiceStopSpeedMps, `The pickup stays stopped at ${stop.name}`)
  return {
    h,
    sockets,
    driver: wheel,
    notices: wheel.messages.filter(({ type }) => type === 'practice-run' || type === 'practice-tour'),
    xp: wheel.player.drivingXp?.rescue ?? 0,
    index: wheel.state.practice.pickup,
    save: h.game.snapshotForSave(),
  }
}

function joinCrew(h, saved, crewSize) {
  const size = saved ? saved.crew.length : crewSize
  return Array.from({ length: size }, (_, slot) => h.join(tokens[slot]))
}

// Drives the whole tour. `driverAt(i)` picks who drives to stop i.
function driveTour(t, { from, crewSize = 1, driverAt = () => 0 } = {}) {
  const paid = []
  let saved = from
  let last
  pickup.stops.forEach((stop, i) => {
    const driver = driverAt(i)
    const before = saved?.crew[driver].player.drivingXp?.rescue ?? 0
    last = leg(t, saved, stop, { driver, crewSize })
    paid.push(...last.notices.filter(({ type }) => type === 'practice-run').map(({ stop: name }) => name))
    assert.equal(last.xp - before, practiceStopXp, `${stop.name} pays its driver ${practiceStopXp} XP once`)
    saved = last.save
  })
  return { paid, last, saved }
}

test('the rescue practice tour visits each stop once in order, then ends with a summary', (t) => {
  const { paid, last } = driveTour(t)
  assert.deepEqual(paid, pickup.stops.map(({ name }) => name))
  assert.equal(last.index, pickup.stops.length, 'The tour ends after its last stop instead of starting over')
  const { finished } = last.notices.find(({ type }) => type === 'practice-run')
  assert.deepEqual(finished, { stops: pickup.stops.length, earned: [{ playerId: 0, xp: pickup.stops.length * practiceStopXp }], qualified: [0] })
  // One solo tour reaches the Saltwind qualification.
  assert.ok(last.xp >= careerUnlockXp)
})

test('a finished tour pays nothing more, even back at its first stop or after a restart', (t) => {
  const { last, saved } = driveTour(t)
  // Waiting at the last stop pays nothing more.
  last.h.hold(last.driver, settleTicks * 3)
  assert.equal(last.driver.player.drivingXp.rescue, last.xp)
  // Back at the first stop, on a restarted host, the tour does not start again by itself.
  const again = leg(t, saved, pickup.stops[0])
  assert.equal(again.xp, last.xp)
  assert.equal(again.index, pickup.stops.length)
  assert.equal(again.notices.length, 0)
})

test('the crew starts the tour again on purpose, at the driver\'s door', (t) => {
  const { last } = driveTour(t)
  const { h, driver } = last
  assert.match(actionHint(driver.state, driver.player)[1], /tour complete · then E at the driver’s door to go again$/)
  // At the wheel, E does nothing; the tour waits for the crew to step out.
  driver.request('interact')
  h.advance()
  assert.equal(driver.state.practice.pickup, pickup.stops.length)
  driver.request('seat')
  h.advance()
  assert.equal(driver.player.seat, null)
  // Out at the driver's door, E with nothing aimed starts the tour again, so it works
  // with the keyboard alone.
  assert.ok(distance(driver.player, driverDoor(driver.state.vehicles.pickup)) < 1)
  assert.deepEqual(actionHint(driver.state, driver.player), ['E', 'Start the pickup practice tour again'])
  const saves = h.checkpoint.mock.callCount()
  driver.request('interact')
  h.advance()
  assert.equal(driver.state.practice.pickup, 0, 'The tour starts again at its first stop')
  assert.ok(driver.messages.some(({ type, event }) => type === 'practice-tour' && event === 'restarted'))
  // The restart is saved straight away.
  assert.ok(h.checkpoint.mock.callCount() > saves)
  assert.equal(h.checkpoint.mock.calls.at(-1).result.world.practice.pickup, 0)
  // A started tour can't be restarted part way.
  driver.messages.length = 0
  driver.request('interact', { choice: { action: 'restart-practice-tour', subject: 0 } })
  h.advance()
  assert.ok(!driver.messages.some(({ type }) => type === 'practice-tour'))
  // The second tour pays again, from its first stop.
  const second = leg(t, h.game.snapshotForSave(), pickup.stops[0])
  assert.equal(second.xp, last.xp + practiceStopXp)
  assert.equal(second.index, 1)
})

test('beside the pickup but away from its door, E still takes gear; the restart waits for aim', (t) => {
  const { last } = driveTour(t)
  const { h, driver } = last
  driver.request('seat')
  h.advance()
  // Walk round to the bed, where the gear is.
  const bed = offset(driver.state.vehicles.pickup, 0, pickup.exits[2].z)
  const save = h.game.snapshotForSave()
  save.crew[0].player = { ...save.crew[0].player, ...bed }
  const next = setup(t, { saved: save })
  const crewmate = next.join(tokens[0])
  next.advance()
  assert.match(actionHint(crewmate.state, crewmate.player)[1], /^Take /)
  crewmate.request('interact')
  next.advance()
  assert.equal(crewmate.state.practice.pickup, pickup.stops.length)
  crewmate.request('interact', { choice: { action: 'restart-practice-tour', subject: 0 } })
  next.advance()
  assert.equal(crewmate.state.practice.pickup, 0)
})

test('two crewmates share the wheel: the summary gives each their own XP, and the other one restarts', (t) => {
  const half = Math.floor(pickup.stops.length / 2)
  const { last } = driveTour(t, { crewSize: 2, driverAt: (i) => (i < half ? 0 : 1) })
  const [first, second] = last.sockets
  const summary = (socket) => socket.messages.find(({ type, finished }) => type === 'practice-run' && finished).finished
  const expected = [{ playerId: 0, xp: half * practiceStopXp }, { playerId: 1, xp: (pickup.stops.length - half) * practiceStopXp }]
  assert.deepEqual(summary(first).earned, expected)
  assert.deepEqual(summary(second).earned, expected, 'Both screens get the same per-driver totals')
  assert.deepEqual(summary(first).qualified, [], 'Neither reached the unlock on a shared tour')
  // The crewmate who was not driving at the end walks to the driver's door and starts it again.
  const save = last.h.game.snapshotForSave()
  save.crew[0].player = { ...save.crew[0].player, ...driverDoor(last.driver.state.vehicles.pickup), seat: null, vehicle: undefined }
  save.crew[1].player = { ...save.crew[1].player, seat: 'driver', vehicle: 'pickup' }
  const next = setup(t, { saved: save })
  const walker = next.join(tokens[0])
  const wheel = next.join(tokens[1])
  next.advance()
  walker.request('interact')
  next.advance()
  assert.equal(walker.state.practice.pickup, 0)
  assert.ok(wheel.messages.some(({ type, event, playerId }) => type === 'practice-tour' && event === 'restarted' && playerId === 0))
})

test('boarding before the first stop introduces the tour', (t) => {
  const beside = offset(pickup.park, pickup.exits[0].x, pickup.exits[0].z)
  const { join, advance } = setup(t, { players: [player(0, beside)] })
  const crewmate = join(tokens[0])
  crewmate.request('seat')
  advance()
  assert.equal(crewmate.player.vehicle, 'pickup')
  const intro = crewmate.messages.find(({ type, event }) => type === 'practice-tour' && event === 'intro')
  assert.deepEqual(intro, { type: 'practice-tour', event: 'intro', vehicle: 'pickup', stops: pickup.stops.length })
})

const network = buildRoadNetwork(starterRoads)
const onCarriageway = (point) => network.roads.some((road) => road.samples.some((sample) => distance(sample, point) <= halfWidthOf(road)))

test('the tour is a circuit of road stops, each with its own ring and lesson', () => {
  const names = pickup.stops.map(({ name }) => name)
  assert.deepEqual(names, [
    'Fire Watch',
    'Island Farm',
    'Harbor Depot',
    'Fire road trailhead',
    'Fire road culvert',
    'Cairn turnoff',
    'Alder Creek',
    'Pine Draw hairpin',
    'Cairn ridge',
    'Ridge junction',
    'Summit pad',
    'Fire Supplies',
  ])
  for (const stop of pickup.stops) {
    const offRoad = [harborJobSites.farmDrop, pickup.park].some((site) => distance(stop, site) === 0)
    assert.ok(onCarriageway(stop) || offRoad, `${stop.name} is on a road the pickup can drive`)
    assert.ok(stop.lesson, `${stop.name} teaches something`)
  }
  assert.equal(new Set(pickup.stops.map(({ lesson }) => lesson)).size, pickup.stops.length, 'Every stop teaches something different')
  assert.ok(distance(pickup.stops[0], pickup.park) > practiceStopRadiusM, 'The parked pickup is not already at the first stop')
  assert.ok(distance(pickup.stops.at(-1), pickup.park) <= practiceStopRadiusM, 'The circuit ends back where the pickup parks')
  pickup.stops.slice(1).forEach((stop, i) => {
    assert.ok(distance(stop, pickup.stops[i]) > practiceStopRadiusM * 2, `${pickup.stops[i].name} and ${stop.name} have rings of their own`)
  })
})

test('a saved tour index past the last stop loads as a finished tour', (t) => {
  const { join } = setup(t, {
    players: [player(0, pickup.park)],
    arrange: (save) => { save.world.practice = { pickup: pickup.stops.length + 3, tractor: 0 } },
  })
  assert.equal(join(tokens[0]).state.practice.pickup, pickup.stops.length)
})

test('a save from before the tour, or for another list of stops, starts the tour over', (t) => {
  for (const tours of [undefined, { pickup: { key: 'Forest Lookout trailhead / Harbor Depot', earned: [], qualified: [] } }]) {
    const { join } = setup(t, {
      players: [player(0, pickup.park)],
      arrange: (save) => {
        save.world.practice = { pickup: 4, tractor: 1 }
        if (tours) save.world.practiceTours = { ...save.world.practiceTours, ...tours }
        else delete save.world.practiceTours
      },
    })
    const { state } = join(tokens[0])
    assert.equal(state.practice.pickup, 0)
    assert.equal(state.practiceTours.pickup.key, practiceTourKey('pickup'))
  }
})
