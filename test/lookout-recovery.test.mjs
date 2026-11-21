import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { islandSaveFile } from '../server/save.ts'
import { actionHint } from '../src/actions.ts'
import { lookoutRecoveryAt, recoveryBeds } from '../src/lookout-recovery.ts'
import { distanceToRoute, footpaths } from '../src/routes.ts'
import { canWalkAt } from '../src/simulation/movement.ts'
import { groundHeight, waterLevel } from '../src/terrain.ts'
import { daySeconds } from '../src/weather.ts'
import { distance, extinguisherStarts, lookout } from '../src/world.ts'
import { starterFeatures } from '../src/worlds/starter/sites.ts'
import { door, player, setup, tokens } from './support/game-harness.mjs'

function walkTo(game, client, ...targets) {
  for (const target of targets) {
    for (let tick = 0; tick < 190 && distance(client.player, target) > .17; tick++) {
      const d = distance(client.player, target)
      game.input(client, { x: (target.x - client.player.x) / d, z: (target.z - client.player.z) / d })
      game.advance()
    }
    assert.ok(distance(client.player, target) <= .17)
  }
}

test('lookout recovery follows the dawns crossed and uses the current incident', () => {
  const recovery = (mission, islandTime, lookoutFireClearedAt) => lookoutRecoveryAt({ mission, islandTime, lookoutFireClearedAt })
  assert.equal(recovery('delivery', 100), 'undisturbed')
  assert.equal(recovery('fire', daySeconds * 7, 0), 'undisturbed')
  assert.equal(recovery('complete', 100), 'established') // Pre-recovery save.
  assert.equal(recovery('complete', daySeconds - .001, daySeconds - 1), 'ash')
  assert.equal(recovery('complete', daySeconds + .01, daySeconds - 1), 'shoots')
  assert.equal(recovery('complete', daySeconds * 2, daySeconds - 1), 'shoots')
  assert.equal(recovery('complete', daySeconds * 3, daySeconds - 1), 'established')
})

test('both crew see extinguishing, retain the ash after loading, and see shoots after sleeping', (t) => {
  const h = setup(t, {
    players: [player(0, { x: 21.35, z: 22.03 }), player(1, { x: 7.7, z: 30 })],
    arrange(save) {
      save.islandTime = daySeconds * .73
      save.world.mission = 'fire'
      save.world.lookoutFireClearedAt = 0 // A previous incident never controls an active fire's appearance.
    },
  })
  const a = h.join(tokens[0]), b = h.join(tokens[1])
  assert.equal(lookoutRecoveryAt(a.state), 'undisturbed')
  assert.match(actionHint(a.state, a.player)[1], /extinguisher/i)
  a.request('interact')
  h.advance()
  assert.ok(a.state.items.some(item => item.kind === 'extinguisher' && item.holder === a.player.id))

  // Walk from the stock position to spraying range on the lookout approach.
  walkTo(h, a, { x: 17.5, z: 23.3 }, { x: 13.4, z: 25.6 }, { x: 9.35, z: 27.65 })
  assert.match(actionHint(a.state, a.player)[1], /spray/i)
  a.request('primary', { phase: 'start' })
  h.hold(a, 154)
  assert.equal(a.state.fire, 0)
  assert.equal(lookoutRecoveryAt(a.state), 'ash')
  assert.equal(lookoutRecoveryAt(b.state), 'ash')
  const cleared = a.state.lookoutFireClearedAt
  assert.ok(cleared > daySeconds * .73)
  assert.equal(b.state.lookoutFireClearedAt, cleared)
  assert.equal(h.checkpoint.mock.calls.at(-1).result.world.lookoutFireClearedAt, cleared)
  walkTo(h, b, { x: 6.17, z: 32.22 })

  const folder = mkdtempSync(join(tmpdir(), 'mission-lookout-recovery-'))
  t.after(() => rmSync(folder, { recursive: true, force: true }))
  const file = islandSaveFile(folder, 5173)
  const saved = h.game.snapshotForSave()
  for (const member of saved.crew) {
    const point = door(member.player.id)
    Object.assign(member.player, point, { y: groundHeight(point), grounded: true })
  }
  file.write(saved)
  const morning = setup(t, { saved: file.load() })
  const returningA = morning.join(tokens[0]), returningB = morning.join(tokens[1])
  assert.equal(lookoutRecoveryAt(returningA.state), 'ash')
  returningA.request('interact')
  returningB.request('interact')
  morning.advance()
  assert.equal(returningA.state.islandTime, daySeconds)
  assert.equal(lookoutRecoveryAt(returningA.state), 'shoots')
  assert.equal(lookoutRecoveryAt(returningB.state), 'shoots')
  file.write(morning.game.snapshotForSave())
  const resumed = setup(t, { saved: file.load() }).join(tokens[0])
  assert.equal(resumed.state.lookoutFireClearedAt, cleared)
  assert.equal(lookoutRecoveryAt(resumed.state), 'shoots')

  const thirdNight = file.load()
  thirdNight.islandTime = daySeconds * 2.73
  const later = setup(t, { saved: thirdNight })
  const laterA = later.join(tokens[0]), laterB = later.join(tokens[1])
  assert.equal(lookoutRecoveryAt(laterA.state), 'shoots')
  laterA.request('interact')
  laterB.request('interact')
  later.advance()
  assert.equal(laterA.state.islandTime, daySeconds * 3)
  assert.equal(lookoutRecoveryAt(laterA.state), 'established')
  assert.equal(lookoutRecoveryAt(laterB.state), 'established')

  delete saved.world.lookoutFireClearedAt
  file.write(saved)
  const legacy = setup(t, { saved: file.load() }).join(tokens[0])
  assert.equal(lookoutRecoveryAt(legacy.state), 'established')
})

test('the recovery beds leave the lookout trail, scope, and supplies approach accessible', () => {
  const { points, width } = footpaths.find(path => path.name === 'Lookout trail')
  const scope = starterFeatures.find(feature => feature.site === 'lookout')
  for (const { x, z, rx, rz } of recoveryBeds) {
    for (let i = 0; i < 32; i++) {
      const a = i * Math.PI / 16
      const p = { x: x + rx * Math.cos(a), z: z + rz * Math.sin(a) }
      assert.ok(distanceToRoute(p, points) > width / 2 - .15)
      assert.ok(distance(p, scope) > .65)
    }
  }
  for (const p of [...extinguisherStarts, ...points, lookout, { x: scope.x + .75, z: scope.z - .38 }]) {
    assert.ok(canWalkAt(p, .35, waterLevel))
  }
})
