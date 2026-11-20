import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createGame } from '../server/game.ts'
import { recordCultivation } from '../server/cultivation-cues.ts'
import { farmPlots } from '../src/farm.ts'
import { biteSeconds, castTravelSeconds } from '../src/charged-actions.ts'
import { fishingFloatDip, snapshotEffectCues } from '../src/starter-effect-cues.ts'
import { crateSize } from '../src/world.ts'
import { groundHeight } from '../src/terrain.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

test('hoe, can and harvest actions publish exact cultivation cues without saving them', t => {
  const { join, click, advance, game } = setup(t, {
    players: [player(0, farmPlots[0], { inventory: ['hoe'], equipped: 'hoe' }),
      player(1, farmPlots[2], { inventory: ['watering-can'], equipped: 'watering-can' })],
    arrange: save => { save.world.farm[2] = 'planted' },
  })
  const left = join(tokens[0]), right = join(tokens[1])
  click(left)
  click(right)
  const cues = left.state.cultivation
  assert.deepEqual(cues, [{ sequence: 1, kind: 'hoe', plot: 0, actor: 0 }, { sequence: 2, kind: 'water', plot: 2, actor: 1 }])
  assert.deepEqual(right.state.cultivation, cues)
  assert.equal(game.snapshotForSave().world.cultivation, undefined)
  advance(2)
  assert.deepEqual(left.state.cultivation, cues)
  const harvest = setup(t, { players: [player(0, farmPlots[0])], arrange: save => { save.world.farm[0] = 'ripe' } })
  const grower = harvest.join(tokens[0])
  grower.request('interact')
  harvest.advance()
  assert.deepEqual(grower.state.cultivation, [{ sequence: 1, kind: 'harvest', plot: 0, actor: 0 }])
})

test('visual cues use transitions and recent sequence numbers', () => {
  const current = globalThis.structuredClone(createGame().tick())
  current.players = [player(0)]
  const before = globalThis.structuredClone(current)
  const cast = { elapsed: castTravelSeconds + biteSeconds + .16, bobber: { x: -44, z: -39 }, power: 1,
    fight: { progress: 0, tension: .24, pulling: false } }
  current.players[0].casting = cast
  assert.ok(fishingFloatDip(cast) > .14)
  assert.equal(fishingFloatDip({ ...cast, elapsed: cast.elapsed + .4 }), 0)
  current.mission = 'complete'
  before.mission = 'fire'
  const crate = current.items[0]
  const contact = groundHeight(crate) + crateSize / 2
  before.items[0].y = contact + .3
  current.items[0].y = contact + .06
  for (let i = 0; i < 12; i++) recordCultivation(current, 'hoe', 0, 0)
  assert.deepEqual(current.cultivation.map(c => c.sequence), [5, 6, 7, 8, 9, 10, 11, 12])
  before.cultivation = current.cultivation.slice(0, 6)
  const changes = snapshotEffectCues(before, current)
  assert.deepEqual(changes.cues.map(cue => cue.id), ['bobber-bite-dip', 'crate-landing-grit', 'wet-ash-steam'])
  assert.deepEqual(changes.cultivation.map(cue => cue.sequence), [11, 12])
  assert.deepEqual(snapshotEffectCues(current, current), { cues: [], cultivation: [] })
})
