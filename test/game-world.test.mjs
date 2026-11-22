import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canWalkAt } from '../src/simulation/movement.ts'
import { juniperCenter, juniperLayout } from '../src/juniper-habitat.ts'
import { actionHint } from '../src/actions.ts'
import { footpaths, shellglassPoint } from '../src/routes.ts'
import { northernRegions } from '../src/scenery.ts'
import { groundHeight, maxWadeDepth, waterDepth, waterLevel, withinSkiffBoundary } from '../src/terrain.ts'
import { skiffStart, spawns } from '../src/world.ts'
import { tokens, player, setup } from './support/game-harness.mjs'

test('a player who resumes in deep water can swim or respawn without losing progress', (t) => {
  const deep = { x: -47, z: -38 }
  const h = setup(t, {
    players: [player(0, deep, { y: groundHeight(deep), seeds: 1, inventory: ['fishing-rod'], equipped: 'fishing-rod', goods: { carrots: 1, fish: 2 } })],
    arrange: (save) => {
      save.world.items[0].holder = 0
      save.crewCoins = 3
    },
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

test('pre-coastline crew and skiff positions recover through normal save and reconnect', (t) => {
  // Fixed positions off the south-west shore, which the Highwood backcountry did
  // not move. One is swimming water inside the buoys, the other is beyond them.
  // The north-west points this test used before are now Highwood's dry land.
  // The skiff was afloat south of the island.
  const oldShore = { x: -81, z: -24 }
  const oldLimit = { x: -150, z: -50 }
  assert.ok(waterDepth(oldShore) > maxWadeDepth && withinSkiffBoundary(oldShore))
  assert.equal(withinSkiffBoundary(oldLimit), false)
  const host = setup(t, {
    players: [player(0, oldShore, { y: -0.065, goods: { fish: 2, carrots: 1 } }), player(1, oldLimit, { y: waterLevel - 0.52, swimming: true, discoveries: ['shellglass'] })],
    arrange(save) {
      save.crewCoins = 11
      save.world.skiff = { x: 6, z: -47, heading: Math.PI / 2, speed: 0 }
    },
  })
  const a = host.join(tokens[0])
  const b = host.join(tokens[1])
  assert.equal(a.player.swimming, true)
  assert.equal(a.player.x, oldShore.x)
  assert.equal(b.player.swimming, false)
  assert.equal(b.player.x, spawns[1].x)
  assert.equal(b.player.z, spawns[1].z)
  assert.deepEqual(a.state.skiff, { ...skiffStart, speed: 0 })
  assert.deepEqual(a.player.goods, { fish: 2, carrots: 1 })
  assert.deepEqual(b.player.discoveries, ['shellglass'])
  assert.equal(b.state.crewCoins, 11)

  const restarted = setup(t, { saved: host.game.snapshotForSave() })
  const rejoined = restarted.join(tokens[1])
  assert.equal(rejoined.player.x, spawns[1].x)
  assert.deepEqual(rejoined.player.discoveries, ['shellglass'])
  assert.equal(rejoined.state.crewCoins, 11)
  assert.deepEqual(rejoined.state.skiff, a.state.skiff)
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

test('a second player disturbs the shared Juniper habitat and reconnects to its current state', (t) => {
  const fox = juniperLayout.foxes[0]
  const nearby = { x: juniperCenter.x + fox.x, z: juniperCenter.z + fox.z + 0.55 }
  const { join, advance } = setup(t, { players: [player(0), player(1, nearby)] })
  const observer = join(tokens[0]), walker = join(tokens[1])
  advance(4)
  assert.equal(observer.state.juniper.foxes[0].behavior, 'fleeing')
  assert.ok(observer.state.juniper.hares.some((h) => h.behavior === 'fleeing'))
  assert.deepEqual(observer.state.juniper, walker.state.juniper)
  walker.close()
  advance(150)
  assert.notEqual(observer.state.juniper.foxes[0].behavior, 'fleeing')
  const returned = join(tokens[1])
  assert.deepEqual(returned.state.juniper, observer.state.juniper)
})

test('a save made mid-jump inside the relocated market restores to walkable ground', (t) => {
  const wall = { x: 39, z: 1.7 }
  assert.equal(canWalkAt(wall, 0.4, waterLevel), false)
  const h = setup(t, { players: [player(0, wall, { grounded: false, y: 1.2 })] })
  const restored = h.join(tokens[0]).player
  assert.ok(canWalkAt(restored, 0.4, waterLevel))
  assert.equal(restored.grounded, true)
  assert.equal(restored.y, groundHeight(restored))
})
