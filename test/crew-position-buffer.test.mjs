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
  // With no further updates the walker coasts a short way and holds.
  for (let i = 0; i < 60; i++) track.sample(1 / 60)
  const held = track.sample(1 / 60).x
  assert.ok(held >= tick * 8 && held - tick * 8 < 2)
  assert.ok(Math.abs(track.sample(1 / 60).x - held) < .01)
  track.push({ x: -20, z: 1 }, 0)
  assert.equal(track.sample(1 / 60).x, -20)
  track.reset()
  assert.equal(track.sample(0), undefined)
})

test('a late burst of updates changes the walking pace without halting it', () => {
  const track = createCrewPositionBuffer()
  let previous, slowest = Infinity, fastest = 0, sent = 0
  for (let i = 0; i < 240; i++) {
    // Every second, four ticks are held back and then arrive together.
    const held = i % 60 >= 30 && i % 60 < 38
    for (; !held && sent <= i / 2; sent++) track.push({ x: 8 * sent / 30, z: 0 }, sent / 30)
    const { x } = track.sample(1 / 60)
    if (i > 20) {
      slowest = Math.min(slowest, (x - previous) * 60)
      fastest = Math.max(fastest, (x - previous) * 60)
    }
    previous = x
  }
  assert.ok(slowest > 5, `slowest ${slowest}`)
  assert.ok(fastest < 10.5, `fastest ${fastest}`)
})
