import assert from 'node:assert/strict'
import { test } from 'node:test'
import { restingHeight } from '../server/items.ts'
import { gradedRoads, groundHeight, naturalGroundHeight } from '../src/terrain.ts'
import { setup } from './support/game-harness.mjs'

const toleranceM = 0.05

test('gear saved on Highwood ground that a road has since cut away settles onto the cut', (t) => {
  // The deepest cut on the fire road: the natural ground there stands well above the road.
  const fireRoad = gradedRoads().find((road) => road.id === 'fire-road')
  const deepest = fireRoad.profile.reduce((best, sample) => (sample.cut > best.cut ? sample : best))
  const spot = { x: deepest.x, z: deepest.z }
  assert.ok(naturalGroundHeight(spot) - groundHeight(spot) > 1, 'the road cuts at least a metre here')
  let id
  const { game } = setup(t, {
    arrange: (save) => {
      const item = save.world.items.find((candidate) => candidate.kind !== 'crate' && !candidate.stowed)
      id = item.id
      Object.assign(item, spot, { y: naturalGroundHeight(spot) + 0.1, holder: null, onBed: false })
    },
  })
  const restored = game.snapshotForSave().world.items.find((item) => item.id === id)
  assert.ok(Math.abs(restored.y - restingHeight(restored)) < toleranceM, `restored at ${restored.y.toFixed(2)} m, ground rests at ${restingHeight(restored).toFixed(2)} m`)
})
