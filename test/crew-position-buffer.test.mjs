import assert from 'node:assert/strict'
import test from 'node:test'
import { createCrewPositionBuffer } from '../src/crew-position-buffer.ts'

test('walking stays even between snapshots and stops at the last known position', () => {
  const track = createCrewPositionBuffer()
  let previous, tick = 0
  for (let i = 0; i < 150; i++) {
    // Omit occasional packets and deliver the next authoritative position.
    if (!(i % 2) && i % 14 !== 6) {
      tick = i / 60
      track.push({ x: 8 * tick, z: 0 }, tick)
    }
    const { x } = track.sample(1 / 60)
    if (i > 50) assert.ok(Math.abs((x - previous) * 60 - 8) < 1)
    previous = x
  }
  for (let i = 0; i < 60; i++) track.sample(1 / 60)
  assert.equal(track.sample(1 / 60).x, tick * 8)
  track.push({ x: -20, z: 1 }, 0)
  assert.equal(track.sample(1 / 60).x, -20)
  track.reset()
  assert.equal(track.sample(0), undefined)
})
