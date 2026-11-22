import assert from 'node:assert/strict'
import { test } from 'node:test'
import { carrierShift, countFootfalls, groundTravel } from '../src/audio/gait.ts'
import { walkGait } from '../src/island-render-pose.ts'
import { footSurface } from '../src/audio/surface.ts'
import { coastPoint, coastalSurface } from '../src/terrain.ts'
import { dockEndZ, harbor, harborDock } from '../src/world.ts'

const walker = { seat: null, grounded: true, swimming: false }

function walk(speed, seconds, fps = 60) {
  let cycle = 0
  let footfalls = 0
  for (let frame = 0; frame < seconds * fps; frame++) {
    const next = cycle + walkGait(speed / fps, 1 / fps, false).cycles
    footfalls += countFootfalls(cycle, next)
    cycle = next
  }
  return { footfalls, cycle }
}

test('a foot lands every half walk cycle, matching the visible legs', () => {
  const { footfalls, cycle } = walk(8, 10)
  assert.equal(footfalls, Math.floor(cycle * 2))
  const perSecond = footfalls / 10
  assert.ok(perSecond > 5 && perSecond < 8, `${perSecond} steps per second at walking pace`)
  assert.equal(walk(0, 5).footfalls, 0, 'standing still is silent')
})

test('a crewmate riding the moving truck bed does not walk', () => {
  const carrier = { x: 0.2, z: 0.05 }
  assert.equal(groundTravel({ x: 0, z: 0 }, { x: 0.2, z: 0.05 }, carrier), 0)
  assert.ok(groundTravel({ x: 0, z: 0 }, { x: 0.3, z: 0.05 }, carrier) > 0.09)
  assert.equal(groundTravel({ x: 0, z: 0 }, { x: 5, z: 0 }), 0, 'a snap to a new pose is not a stride')
  assert.equal(carrierShift({ onBed: true }, carrier), carrier)
  assert.equal(carrierShift({ onBed: false, truckSurface: 'roof' }, carrier), carrier)
  assert.equal(carrierShift({ onBed: false }, carrier), undefined)
  assert.equal(countFootfalls(0.4, 1.1), 2, 'any cycle rate, such as pushing a barrow, lands feet at half cycles')
})

test('dock boards win over terrain and the harbor trail is gravel', () => {
  const plank = { x: harborDock.x, z: (harborDock.firstZ + dockEndZ) / 2 }
  assert.equal(footSurface(plank, walker), 'boards')
  assert.equal(footSurface({ x: plank.x + harborDock.width, z: plank.z }, walker) === 'boards', false)
  assert.equal(footSurface(harbor, walker), 'gravel')
  assert.equal(footSurface(harbor, { ...walker, truckSurface: 'bed' }), 'boards')
})

test('footsteps follow the local beach cover through meadow, broad sand, dunes and exposed rock', () => {
  const meadow = coastPoint(5.28, 0.83)
  const broadBeach = coastPoint(5.2, 0.88)
  const dune = { x: 39.5, z: -25.7 }
  const exposed = coastPoint(5.78, 0.985)
  assert.ok(coastalSurface(broadBeach).sand > 0.6)
  assert.ok(coastalSurface(dune).sand > 0.8)
  assert.ok(coastalSurface(exposed).rock > 0.65)
  for (const point of [broadBeach, dune]) assert.equal(footSurface(point, walker), 'sand')
  for (const point of [meadow, exposed]) assert.equal(footSurface(point, walker), 'fallback')
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
