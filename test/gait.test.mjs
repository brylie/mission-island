import assert from 'node:assert/strict'
import test from 'node:test'
import { advanceGait, gaitAmount, gaitPhase, restingGait } from '../src/simulation/gait.ts'

const timing = { metresPerCycle: () => .2, speedResponse: 9, fullStrideSpeed: .34 }

test('distance drives gait phase and speed easing agrees across frame rates', () => {
  const single = advanceGait(timing, restingGait, .2, .5)
  let frames = restingGait
  for (let i = 0; i < 10; i++) frames = advanceGait(timing, frames, .02, .05)
  assert.ok(Math.abs(single.cycle - frames.cycle) < 1e-10)
  assert.ok(Math.abs(single.speed - frames.speed) < 1e-10)
  assert.equal(single.cycle, 1)
  assert.equal(gaitPhase(single.cycle), 0)
  assert.equal(gaitPhase(single.cycle, .5), .5)
})

test('a blocked or paused walker cannot accumulate steps and eases to rest', () => {
  const moving = advanceGait(timing, restingGait, .4, 1)
  const firstBlocked = advanceGait(timing, moving, 0, .05)
  const settled = advanceGait(timing, firstBlocked, 0, 1)
  assert.deepEqual(advanceGait(timing, moving, .4, 0), { ...moving, advance: 0 })
  assert.equal(moving.cycle, settled.cycle)
  assert.ok(gaitAmount(timing, settled.speed) < .001)
  assert.ok(gaitAmount(timing, firstBlocked.speed) > gaitAmount(timing, settled.speed))
})
