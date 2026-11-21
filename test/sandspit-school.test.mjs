import assert from 'node:assert/strict'
import test from 'node:test'
import { previewSandspit, sandspitShallows } from '../src/second-island/sandspit-school.ts'
import { groundHeight } from '../src/second-island/terrain.ts'

test('the Sandspit school peels away from a swimmer, stays in water, and regroups', () => {
  const update = previewSandspit()
  const { x, z } = sandspitShallows
  let partial = false
  for (let tick = 0; tick <= 600; tick++) {
    const time = tick / 30
    const threats = time > 2 && time < 7 ? [{ x: x - 4 + (time - 2) * 1.65, z: z - 0.5, range: 1.9 }] : []
    const { fish } = update(time, threats)
    const startled = fish.filter((f) => f.startled).length
    if (startled > 0 && startled < fish.length) partial = true
    for (const member of fish) assert.ok(groundHeight(member.x, member.z) <= -0.479)
  }
  assert.ok(partial)
  assert.ok(update(20, []).leader >= 0)
  assert.deepEqual(update(3, [], true), previewSandspit()(3, []))
})
