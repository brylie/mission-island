import assert from 'node:assert/strict'
import test from 'node:test'
import { learnerVehicles } from '../src/learner-vehicles.ts'
import { gradedRoads } from '../src/terrain.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

// The fire roads are for the island's vehicles. Each one is set at the foot of the
// steepest straight climb on a road, facing up it, and driven on full throttle.

const climbM = 40
const straightRad = 0.08
// How far a vehicle's centre may wander from the centreline and still be on the 4 m road.
const onRoadM = 1.6

// The steepest straight stretch on a road: its foot, the heading up it, and its mean grade.
function steepestClimb(road) {
  const { profile } = road
  let best
  for (let i = 0; i + climbM < profile.length; i++) {
    const foot = profile[i], top = profile[i + climbM]
    const turn = Math.abs(Math.atan2(Math.sin(Math.atan2(top.dx, top.dz) - Math.atan2(foot.dx, foot.dz)), Math.cos(Math.atan2(top.dx, top.dz) - Math.atan2(foot.dx, foot.dz))))
    if (turn > straightRad) continue
    const rise = top.y - foot.y
    const up = rise > 0
    const grade = Math.abs(rise) / climbM
    // Vehicles head along the chord from the foot to the top, which never strays more than a
    // few decimetres from a stretch this straight.
    const [low, high] = up ? [foot, top] : [top, foot]
    if (!best || grade > best.grade) best = { grade, foot: low, top: high, heading: Math.atan2(high.x - low.x, high.z - low.z) }
  }
  return best
}

const offCentreline = (road, point) => Math.min(...road.profile.map((sample) => Math.hypot(sample.x - point.x, sample.z - point.z)))
const holdTicks = 15

// Drives on full throttle in short holds until the vehicle has climbed the stretch, checking
// it keeps to the road all the way, and returns how far up it got and how long it took.
function driveUp(h, driver, pose, climb, maxTicks) {
  const { foot, heading } = climb
  const along = (point) => (point.x - foot.x) * Math.sin(heading) + (point.z - foot.z) * Math.cos(heading)
  let ticks = 0
  while (ticks < maxTicks && along(pose()) < climbM) {
    h.hold(driver, holdTicks, { z: 1 })
    ticks += holdTicks
    assert.ok(offCentreline(spur, pose()) < onRoadM, `${offCentreline(spur, pose()).toFixed(2)} m off the centreline after ${ticks} ticks`)
  }
  return { climbed: along(pose()), ticks }
}

const roads = gradedRoads()
const spur = roads.find((road) => road.layout.id === 'summit-spur')

test('the fire roads have steep straight climbs to test on', () => {
  assert.ok(steepestClimb(spur).grade > 0.1, `the spur climbs ${(steepestClimb(spur).grade * 100).toFixed(0)}%`)
})

test('the flatbed climbs the summit spur\'s steepest straight stretch and stays on the road', (t) => {
  const { foot, heading } = steepestClimb(spur)
  const start = { x: foot.x, z: foot.z, heading }
  const h = setup(t, {
    players: [player(0, start, { seat: 'driver' })],
    arrange: (save) => {
      save.world.truck = start
    },
  })
  const driver = h.join(tokens[0])
  const { climbed } = driveUp(h, driver, () => driver.state.truck, steepestClimb(spur), 600)
  assert.ok(climbed >= climbM, `the flatbed got ${climbed.toFixed(1)} m up the spur`)
})

for (const id of Object.keys(learnerVehicles)) {
  test(`the ${id} climbs the summit spur's steepest straight stretch and stays on the road`, (t) => {
    const { foot, heading } = steepestClimb(spur)
    const start = { x: foot.x, z: foot.z, heading }
    const h = setup(t, {
      players: [player(0, start, { seat: 'driver', vehicle: id })],
      arrange: (save) => { save.world.vehicles = { ...save.world.vehicles, [id]: start } },
    })
    const driver = h.join(tokens[0])
    // The tractor creeps at walking pace, so it gets longer.
    const { climbed } = driveUp(h, driver, () => driver.state.vehicles[id], steepestClimb(spur), id === 'tractor' ? 1800 : 600)
    assert.ok(climbed >= climbM, `the ${id} got ${climbed.toFixed(1)} m up the spur`)
  })
}
