import assert from 'node:assert/strict'
import test from 'node:test'
import { createCrewGait, crewFootInHipSpace, crewGaitFrame, crewShin, crewThigh, solveCrewLeg } from '../src/crew-gait.ts'
import { fisherAt } from '../src/harbor-fisher.ts'
import { daySeconds } from '../src/weather.ts'
import { crewCarrySpeed, crewSprintMultiplier, crewWalkSpeed } from '../src/world.ts'

const first = fisherAt(6.05), second = fisherAt(6.1)
const commuteSpeed = Math.hypot(first.x - second.x, first.z - second.z) / (.05 * daySeconds / 24)

test('the walking foot lifts from the heel and reaches toe-up before the next heel strike', () => {
  const { contact, distance } = crewGaitFrame(0, crewWalkSpeed)
  const stance = contact / distance
  const early = crewGaitFrame(stance + (1 - stance) * .25, crewWalkSpeed).feet[0]
  const late = crewGaitFrame(stance + (1 - stance) * .75, crewWalkSpeed).feet[0]
  const plant = crewGaitFrame(1, crewWalkSpeed).feet[0]
  assert.ok(early.pitch > .2)
  assert.ok(late.pitch < -.1)
  assert.ok(late.forward > early.forward)
  assert.ok(plant.planted && plant.pitch < -.2)
  assert.equal(crewGaitFrame(stance * .43, crewWalkSpeed).feet[0].pitch, 0)
  assert.ok(crewGaitFrame(stance * .98, crewWalkSpeed).feet[0].pitch > .35)
})

for (const [name, speed] of [['Mara', commuteSpeed], ['carry', crewCarrySpeed], ['walk', crewWalkSpeed],
  ['sprint', crewWalkSpeed * crewSprintMultiplier]]) {
  test(`the ${name} gait plants a sole through stance and advances by rendered distance`, () => {
    const gait = createCrewGait()
    const delta = 1 / 240
    const ground = ({ z }) => z * .08
    let planted, previousCycle, contacts = 0, highest = 0
    for (let i = 0; i < 480; i++) {
      const z = i * delta * speed
      const pose = { x: 0, y: ground({ z }), z, heading: 0 }
      const frame = gait.sample(pose, delta, ground)
      if (i < 240) continue
      if (previousCycle !== undefined) {
        assert.ok(Math.abs(frame.cycle - previousCycle - speed * delta / frame.distance) < 1e-6)
      }
      previousCycle = frame.cycle
      const [foot] = frame.feet
      const expected = crewGaitFrame(frame.cycle, speed)
      const inStance = expected.feet[0].planted
      if (inStance && planted) {
        assert.ok(Math.hypot(foot.x - planted.x, foot.z - planted.z) < 1e-6)
        assert.ok(Math.abs(foot.y - ground(foot)) < 1e-6)
      }
      if (inStance && !planted) contacts++
      planted = inStance ? foot : undefined
      highest = Math.max(highest, foot.y - ground(foot))
    }
    assert.ok(contacts >= 1)
    assert.ok(highest > .01)
  })
}

test('when movement is blocked or the character teleports the feet settle below the hips', () => {
  const gait = createCrewGait()
  const ground = () => 0, delta = 1 / 60
  let frame
  for (let i = 0; i <= 60; i++) frame = gait.sample({ x: 0, y: 0, z: i * .12, heading: 0 }, delta, ground)
  assert.ok(frame.amount > .99)
  const stop = { x: 0, y: 0, z: 7.2, heading: 0 }
  for (let i = 0; i < 45; i++) frame = gait.sample(stop, delta, ground)
  assert.ok(frame.amount < .001)
  assert.ok(frame.feet.every(foot => Math.abs(foot.z - 7.22) < .001 && foot.y < .001))
  frame = gait.sample({ ...stop, z: 35 }, delta, ground)
  assert.equal(frame.amount, 0)
  assert.equal(frame.cycle, 0)
})

test('a sole stays put while the character follows a bend', () => {
  const gait = createCrewGait()
  const ground = () => 0, delta = 1 / 120, speed = 2, radius = 3
  let planted, heldFrames = 0
  for (let i = 0; i < 240; i++) {
    const heading = i * delta * speed / radius
    const frame = gait.sample({ x: radius * (1 - Math.cos(heading)), y: 0, z: radius * Math.sin(heading), heading }, delta, ground)
    const foot = frame.feet[0]
    const contact = i > 120 && crewGaitFrame(frame.cycle, speed).feet[0].planted
    if (contact && planted) {
      assert.ok(Math.hypot(foot.x - planted.x, foot.z - planted.z) < 1e-6)
      assert.ok(Math.abs(foot.heading - planted.heading) < 1e-6)
      heldFrames++
    }
    planted = contact ? foot : undefined
  }
  assert.ok(heldFrames > 25)
})

test('the leg solution reaches a planted sole forward and across a gentle slope', () => {
  const groundPose = { x: 10, y: .1, z: 11, heading: 0.3 }
  const foot = { x: 9.7, y: .07, z: 11.24, heading: 0.2, pitch: 0 }
  const { x, y, z } = crewFootInHipSpace(groundPose, foot, -1, .14)
  const { roll, pitch, bend } = solveCrewLeg(x, y, z)
  const down = crewThigh * Math.cos(pitch) + crewShin * Math.cos(pitch + bend)
  assert.ok(Math.abs(x - down * Math.sin(roll)) < 1e-10)
  assert.ok(Math.abs(y + down * Math.cos(roll)) < 1e-10)
  assert.ok(Math.abs(z + crewThigh * Math.sin(pitch) + crewShin * Math.sin(pitch + bend)) < 1e-10)
  assert.equal(solveCrewLeg(0, -(crewThigh + crewShin), 0).bend, 0)
  assert.equal(solveCrewLeg(0, -.7, 0).bend, 0)
})
