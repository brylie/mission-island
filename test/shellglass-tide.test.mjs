import assert from 'node:assert/strict'
import test from 'node:test'
import { shellglassPoint, splitstone } from '../src/routes.ts'
import { shellglassCycle, shellglassHigh, shellglassLow, shellglassPockets, shellglassTideAt, shellglassWash } from '../src/shellglass-tide.ts'
import { canWalkAt, stepPlayerOnTerrain } from '../src/simulation/movement.ts'
import { groundHeight, maxWadeDepth, tidePool, walkingHeight, waterDepth, waterLevel } from '../src/terrain.ts'
import { daySeconds } from '../src/weather.ts'
import { beach } from '../src/world.ts'
import { setup, tokens } from './support/game-harness.mjs'

test('Shellglass tides repeat independently of the day with a wet rim after the water falls', () => {
  assert.ok(shellglassCycle > daySeconds)
  assert.equal(shellglassTideAt(0).phase, 'Low water')
  assert.notEqual(shellglassTideAt(daySeconds).phase, 'Low water')
  assert.equal(shellglassTideAt(shellglassCycle * .36).phase, 'Rising')
  assert.equal(shellglassTideAt(shellglassCycle * .5).level, shellglassHigh)
  const retreat = shellglassTideAt(shellglassCycle * .76)
  assert.equal(retreat.phase, 'Retreating')
  assert.ok(retreat.wetRim > retreat.level + .06)
  const repeat = shellglassTideAt(retreat.time + shellglassCycle)
  assert.equal(repeat.phase, retreat.phase)
  assert.ok(Math.abs(repeat.level - retreat.level) < 1e-10)
  assert.ok(shellglassHigh - groundHeight(tidePool) < maxWadeDepth)
  for (const pocket of shellglassPockets) {
    assert.ok(pocket.level > shellglassLow && pocket.level < shellglassHigh)
    assert.ok(pocket.level > groundHeight(pocket))
  }
})

test('clients recover the same tide from the host clock after a seat reconnect', (t) => {
  const host = setup(t, { arrange: save => { save.islandTime = shellglassCycle * .76 } })
  const a = host.join(tokens[0])
  const b = host.join(tokens[1])
  const before = shellglassTideAt(a.state.islandTime)
  b.close()
  host.advance(40)
  const returning = host.join(tokens[1])
  const tide = shellglassTideAt(a.state.islandTime)
  assert.equal(tide.phase, 'Retreating')
  assert.ok(tide.level < before.level)
  assert.deepEqual(shellglassTideAt(returning.state.islandTime), tide)
})

test('the dry walk connects Driftwood Beach to the Shellglass rim and Splitstone', () => {
  const path = [beach, { x: 37.8, z: -32.8 }, shellglassPoint, { x: 44.55, z: -30.8 },
    { x: 45.85, z: -28.25 }, { x: 50.5, z: -25.4 }, { x: 53.5, z: -22.5 }, splitstone]
  const player = { ...beach, y: walkingHeight(beach), heading: 0, grounded: true }
  const motor = { player, verticalSpeed: 0 }
  for (const target of path.slice(1)) {
    for (let frame = 0; frame < 180; frame++) {
      const x = target.x - player.x, z = target.z - player.z, distance = Math.hypot(x, z)
      if (distance < .14) break
      stepPlayerOnTerrain(motor, [], { x: x / distance, z: z / distance }, false, 1 / 60, () => -Infinity)
      assert.ok(canWalkAt(player, .35, waterLevel))
      assert.equal(waterDepth(player), 0)
      assert.equal(player.swimming, false)
      const { cos, sin, rx, rz } = shellglassWash
      const dx = player.x - tidePool.x, dz = player.z - tidePool.z
      if (Math.hypot((dx * cos - dz * sin) / rx, (dx * sin + dz * cos) / rz) < 1) {
        assert.ok(groundHeight(player) > shellglassHigh, 'the high wash stays below the dry route')
      }
    }
    assert.ok(Math.hypot(target.x - player.x, target.z - player.z) < .14, JSON.stringify(target))
  }
})
