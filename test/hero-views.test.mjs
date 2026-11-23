import assert from 'node:assert/strict'
import { test } from 'node:test'
import { capturePresets } from '../src/assets/recipes/capture-presets.ts'
import { studioCamera } from '../src/assets/recipes/workbench-stage.ts'
import { groundHeight } from '../src/terrain.ts'

const heroes = Object.entries(capturePresets).filter(([id, preset]) => id.startsWith('highwood-') && preset.kind === 'landscape')

test('Highwood\'s five hero views and its landmark view each see their subject within the Workbench orbit range', () => {
  assert.equal(heroes.length, 6)
  for (const [id, { eye, look }] of heroes) {
    const from = { ...eye, y: groundHeight(eye) + eye.height }, to = { ...look, y: groundHeight(look) + look.height }
    const reach = Math.hypot(from.x - to.x, from.y - to.y, from.z - to.z)
    assert.ok(reach < studioCamera.zoom.range, `${id} is ${reach.toFixed(0)} m from its subject`)
    // The Workbench pulls the camera in when terrain blocks the view, so every line must be clear.
    for (let t = 0.03; t < 0.97; t += 0.005) {
      const point = { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t }
      assert.ok(groundHeight(point) < from.y + (to.y - from.y) * t, `${id} is blocked at ${point.x.toFixed(0)}, ${point.z.toFixed(0)}`)
    }
  }
})
