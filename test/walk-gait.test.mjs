import assert from 'node:assert/strict'
import test from 'node:test'
import { walkGait } from '../src/island-render-pose.ts'

test('the supporting foot moves back at the pace the crew cover the ground', () => {
  const hipHeight = .68, frame = 1 / 60
  for (const pace of [2.4, 6.5, 8, 12.4]) {
    const { cycles, stride } = walkGait(pace * frame, frame, false)
    // The leg swings as stride * sin(phase), so the sole is fastest under the hip.
    const footSpeed = hipHeight * stride * 2 * Math.PI * cycles / frame
    assert.ok(Math.abs(footSpeed - pace) < 1e-9)
  }
  assert.equal(walkGait(0, frame, false).cycles, 0)
  assert.equal(walkGait(0, 0, false).stride, 0)
})
