import assert from 'node:assert/strict'
import test from 'node:test'
import { dryMarketRainAge, marketRunoffAt, marketRunoffPreview } from '../src/market-runoff.ts'

test('rain reaches the awning before it fills the gutter and the puddle outlasts the drips', () => {
  const dry = { rain: 0, canvas: 0, stream: 0, drip: 0, puddle: 0 }
  assert.deepEqual(marketRunoffAt(0), dry)
  const firstRain = marketRunoffAt(88)
  assert.ok(firstRain.rain > 0)
  assert.equal(firstRain.stream, 0)
  assert.equal(firstRain.puddle, 0)
  assert.deepEqual(marketRunoffAt(115), { rain: 1, canvas: 1, stream: 1, drip: 0, puddle: 1 })
  const after = marketRunoffAt(161.7)
  assert.equal(after.rain, 0)
  assert.equal(after.stream, 0)
  assert.ok(after.drip > 0 && after.canvas > 0 && after.puddle > 0)
  const later = marketRunoffAt(169)
  assert.equal(later.drip, 0)
  assert.ok(later.puddle > 0 && later.canvas < after.canvas)
  assert.deepEqual(marketRunoffAt(190), dry)
})

test('the fixed-camera preview distinguishes a running gutter and residual drips', () => {
  const wet = marketRunoffPreview(0.92, dryMarketRainAge)
  const after = marketRunoffPreview(0, 3.2)
  const dry = marketRunoffPreview(0, dryMarketRainAge)
  assert.ok(wet.stream > 0 && after.drip > 0 && after.puddle > 0)
  assert.equal(after.stream, 0)
  assert.equal(after.rain, 0)
  assert.deepEqual(dry, { rain: 0, canvas: 0, stream: 0, drip: 0, puddle: 0 })
})
