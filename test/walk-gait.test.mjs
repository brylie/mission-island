import assert from 'node:assert/strict'
import test from 'node:test'
import { walkGait } from '../src/island-render-pose.ts'
import { crewCarrySpeed, crewHipHeight, crewSprintMultiplier, crewWalkSpeed } from '../src/world.ts'

test('the supporting foot moves back at the pace the crew cover the ground', () => {
  const frame = 1 / 60, stroll = 2.4
  for (const pace of [stroll, crewCarrySpeed, crewWalkSpeed, crewWalkSpeed * crewSprintMultiplier]) {
    const { cycles, stride } = walkGait(pace * frame, frame, false)
    // The leg swings as stride * sin(phase), so the sole is fastest under the hip.
    const footSpeed = crewHipHeight * stride * 2 * Math.PI * cycles / frame
    assert.ok(Math.abs(footSpeed - pace) < 1e-9)
  }
  assert.equal(walkGait(0, frame, false).cycles, 0)
  assert.equal(walkGait(0, 0, false).stride, 0)
})
