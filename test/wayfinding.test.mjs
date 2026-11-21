import assert from 'node:assert/strict'
import test from 'node:test'
import { deliveryWaypoints, loadedDeliveryRoute } from '../src/delivery-wayfinding.ts'
import { deliveryRadius, jobs } from '../src/jobs.ts'
import { distanceToRoads } from '../src/routes.ts'
import { ridgeFlightWaypoints } from '../src/ridge-wayfinding.ts'
import { groundHeight } from '../src/terrain.ts'
import { waypointsAlongPath } from '../src/wayfinding.ts'
import { distance, town } from '../src/world.ts'
import { ridgeLaunch, ridgeLaunchClearance, ridgeMeadow, ridgeUpdraft } from '../src/worlds/starter/ridge-scout.ts'
import { mirrorPoolWillow } from '../src/worlds/starter/sites.ts'

test('wayfinding preserves a caller’s three-dimensional route', () => {
  const start = { x: 0, y: 10, z: 0 }
  const bend = { x: 0, y: 14, z: 0 }
  assert.deepEqual(waypointsAlongPath([start, bend, { ...bend }, { x: 0, y: 14, z: 4 }], 2), [
    { x: 0, y: 12, z: 0 }, bend, { x: 0, y: 14, z: 2 },
  ])
})

test('loaded delivery orbs guide the crew toward the current drop', () => {
  const route = { items: [{ kind: 'crate', onBed: false, delivered: false }], mission: 'delivery', jobs: { active: null } }
  assert.equal(loadedDeliveryRoute(route), undefined)
  route.items[0].onBed = true
  assert.equal(loadedDeliveryRoute(route), 'delivery')
  assert.ok(deliveryWaypoints.delivery.every(point => distanceToRoads(point) < .05))
  assert.ok(distance(deliveryWaypoints.delivery.at(-1), town) < deliveryRadius)
  route.mission = 'complete'
  for (const id of ['farm-supplies', 'beach-gear']) {
    route.jobs.active = { id, progress: 0 }
    assert.equal(loadedDeliveryRoute(route), id)
    assert.ok(distance(deliveryWaypoints[id].at(-1), jobs[id].drop) < deliveryRadius)
    assert.ok(deliveryWaypoints[id].every(point => point.y - groundHeight(point) > .7))
  }
  route.jobs.active = { id: 'market-fish', progress: 0 }
  assert.equal(loadedDeliveryRoute(route), undefined)
})

test('flight orbs point straight from launch or the current pilot position to the selected destination', () => {
  const pilot = { x: ridgeUpdraft.x, y: 23, z: ridgeUpdraft.z }
  for (const [toWillow, target, height] of [[true, mirrorPoolWillow, 3.5], [false, ridgeMeadow, .6]]) {
    const end = { ...target, y: groundHeight(target) + height }
    const launch = { ...ridgeLaunch, y: groundHeight(ridgeLaunch) + ridgeLaunchClearance }
    assert.deepEqual(ridgeFlightWaypoints(toWillow), ridgeFlightWaypoints(toWillow, launch))
    assert.deepEqual(ridgeFlightWaypoints(toWillow, Object.create(pilot)), ridgeFlightWaypoints(toWillow, pilot))
    for (const point of ridgeFlightWaypoints(toWillow, pilot)) {
      const t = (point.x - pilot.x) / (end.x - pilot.x)
      assert.ok(t > 0 && t < 1)
      assert.ok(Math.abs(point.z - (pilot.z + (end.z - pilot.z) * t)) < 1e-8)
      assert.ok(Math.abs(point.y - (pilot.y + .8 + (end.y - pilot.y - .8) * t)) < 1e-8)
    }
    assert.ok(distance(ridgeFlightWaypoints(toWillow, pilot).at(-1), target) < 3.8)
  }
})
