import assert from 'node:assert/strict'
import { test } from 'node:test'
import { advanceGait, groundTravel, metresPerCycle } from '../src/audio/gait.ts'
import { footSurface, sandRadius } from '../src/audio/surface.ts'
import { coastPoint, coastRadius } from '../src/terrain.ts'
import { dockEndZ, harbor, harborDock } from '../src/world.ts'

const walker = { seat: null, grounded: true, swimming: false }

function walk(speed, seconds, fps = 60) {
  let cycle = 0
  let footfalls = 0
  for (let frame = 0; frame < seconds * fps; frame++) {
    const gait = advanceGait(cycle, speed / fps)
    cycle = gait.cycle
    footfalls += gait.footfalls
  }
  return footfalls
}

test('a foot lands every half walk cycle, matching the visible legs', () => {
  assert.equal(walk(metresPerCycle / 2, 10), 10)
  const perSecond = walk(8, 10) / 10
  assert.ok(perSecond > 3 && perSecond < 3.6, `${perSecond} steps per second at walking pace`)
  assert.equal(walk(0, 5), 0, 'standing still is silent')
})

test('a crewmate riding the moving truck bed does not walk', () => {
  const carrier = { x: 0.2, z: 0.05 }
  assert.equal(groundTravel({ x: 0, z: 0 }, { x: 0.2, z: 0.05 }, carrier), 0)
  assert.ok(groundTravel({ x: 0, z: 0 }, { x: 0.3, z: 0.05 }, carrier) > 0.09)
  assert.equal(groundTravel({ x: 0, z: 0 }, { x: 5, z: 0 }), 0, 'a snap to a new pose is not a stride')
})

test('dock boards win over terrain and the harbor trail is gravel', () => {
  const plank = { x: harborDock.x, z: (harborDock.firstZ + dockEndZ) / 2 }
  assert.equal(footSurface(plank, walker), 'boards')
  assert.equal(footSurface({ x: plank.x + harborDock.width, z: plank.z }, walker) === 'boards', false)
  assert.equal(footSurface(harbor, walker), 'gravel')
  assert.equal(footSurface(harbor, { ...walker, truckSurface: 'bed' }), 'boards')
})

test('sand starts where the rendered beach does', () => {
  const angle = 5.3
  const meadowEdge = coastPoint(angle, sandRadius - 0.006)
  const beachEdge = coastPoint(angle, sandRadius + 0.006)
  assert.ok(coastRadius(meadowEdge) < sandRadius && coastRadius(beachEdge) >= sandRadius)
  assert.notEqual(footSurface(meadowEdge, walker), 'sand')
  assert.equal(footSurface(beachEdge, walker), 'sand')
})

test('no footstep sounds when airborne, seated or swimming', () => {
  assert.equal(footSurface(harbor, { ...walker, grounded: false }), null)
  assert.equal(footSurface(harbor, { ...walker, seat: 'driver' }), null)
  assert.equal(footSurface(harbor, { ...walker, swimming: true }), null)
})

test('surf fades smoothly inland and its voices glide along the shore', async () => {
  const { createShoreFollower, surfGain, surfVoices, fullSurfMetres, silentSurfMetres } = await import('../src/audio/shore.ts')
  assert.equal(surfGain(0), 1)
  assert.equal(surfGain(silentSurfMetres + 1), 0)
  for (let d = 0; d < silentSurfMetres; d += 0.5) assert.ok(surfGain(d + 0.5) <= surfGain(d))
  assert.ok(Math.abs(surfGain(fullSurfMetres + 0.1) - 1) < 0.01)
  const follower = createShoreFollower()
  let previous
  // Walk parallel to the coast, a short way inland, at walking pace.
  for (let angle = 4.6; angle < 6.2; angle += 0.002) {
    const listener = coastPoint(angle, 0.88)
    const voices = follower.update(listener, 1 / 60)
    assert.equal(voices.length, surfVoices)
    if (previous) {
      const walked = Math.hypot(listener.x - previous.listener.x, listener.z - previous.listener.z)
      for (const [i, voice] of voices.entries()) {
        const moved = Math.hypot(voice.x - previous.voices[i].x, voice.z - previous.voices[i].z)
        assert.ok(moved < walked * 4 + 0.05, `voice ${i} jumped ${moved.toFixed(2)} m`)
        assert.ok(Math.abs(voice.gain - previous.voices[i].gain) < 0.05)
      }
    }
    previous = { listener, voices }
  }
})
