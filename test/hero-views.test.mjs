import assert from 'node:assert/strict'
import { test } from 'node:test'
import { groundHeight } from '../src/terrain.ts'
import { highwoodHeroViews } from '../src/worlds/starter/layout/hero-views.ts'
import { studioCamera } from '../src/assets/recipes/workbench-stage.ts'

test('every hero view sees its target within the Workbench orbit range', () => {
  const ids = new Set()
  for (const { id, eye, target } of highwoodHeroViews) {
    assert.ok(!ids.has(id), `${id} is unique`)
    ids.add(id)
    const from = { ...eye, y: groundHeight(eye) + eye.above }, to = { ...target, y: groundHeight(target) + target.above }
    const reach = Math.hypot(from.x - to.x, from.y - to.y, from.z - to.z)
    assert.ok(reach < studioCamera.zoom.range, `${id} is ${reach.toFixed(0)} m from its target`)
    // The Workbench pulls the camera in when terrain blocks the view, so every line must be clear.
    for (let t = 0.03; t < 0.97; t += 0.005) {
      const point = { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t }
      assert.ok(groundHeight(point) < from.y + (to.y - from.y) * t, `${id} is blocked at ${point.x.toFixed(0)}, ${point.z.toFixed(0)}`)
    }
  }
})
