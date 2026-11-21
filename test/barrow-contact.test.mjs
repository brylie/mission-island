import assert from 'node:assert/strict'
import test from 'node:test'
import { barrowRig } from '../src/barrow.ts'
import { barrowWheelGround } from '../src/barrow-contact.ts'
import { barrowLegPose, barrowWalk } from '../src/barrow-gait.ts'
import { routeContactHeight } from '../src/route-contact.ts'
import { roadSurface, sidewalkLift, trailLift } from '../src/routes.ts'
import { walkingHeight } from '../src/terrain.ts'

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} ≈ ${expected}`)

test('the wheel sits on each visible road surface and returns to ground level on grass', () => {
  for (const [point, expected] of [
    [{ x: 28.8, z: -8 }, 0],
    [{ x: 31.6, z: -8 }, trailLift],
    [{ x: 39, z: 8.24 }, sidewalkLift],
    [{ x: 25, z: 8.5 }, roadSurface.shoulder],
    [{ x: 39, z: 9.4 }, roadSurface.asphalt],
    [{ x: 39, z: 12 }, roadSurface.asphalt],
  ]) {
    assert.equal(walkingHeight(point), 0)
    near(routeContactHeight(point), expected)
    near(barrowWheelGround({ x: point.x, z: point.z - barrowRig.wheelZ, heading: 0 }), expected)
  }
})

test('the front of the tire climbs the asphalt seam before the axle reaches it', () => {
  const point = { x: 39, z: 8.96 }
  assert.ok(routeContactHeight(point) < roadSurface.asphalt)
  const support = barrowWheelGround({ x: point.x, z: point.z - barrowRig.wheelZ, heading: 0 })
  assert.ok(support > routeContactHeight(point))
  assert.ok(support < roadSurface.asphalt)
})

test('the barrow gait sweeps a planted shoe backward at the crew’s travel speed', () => {
  const start = barrowLegPose(0.1, 0, 1)
  const end = barrowLegPose(0.2, 0, 1)
  assert.equal(start.knee, 0)
  assert.equal(end.knee, 0)
  near(0.66 * (Math.sin(end.hip) - Math.sin(start.hip)), 0.1 * barrowWalk.cycleMetres)
  assert.ok(barrowLegPose(0.2, 1, 1).knee > 0, 'the other foot lifts')
  assert.deepEqual(barrowLegPose(0.2, 0, 0), { hip: -0, knee: 0 })
})
