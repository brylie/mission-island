import assert from 'node:assert/strict'
import test from 'node:test'
import { goldenHourLight, goldenHourPreset } from '../src/golden-hour.ts'

const warmth = ([r, , b]) => r - b

test('a high sun keeps the noon light, fill and haze unchanged', () => {
  const noon = goldenHourLight(0.97, 0)
  assert.deepEqual(noon.sun, goldenHourPreset.noonSun)
  assert.deepEqual(noon.fill, goldenHourPreset.noonFill)
  assert.equal(noon.fillScale, 1)
  assert.equal(noon.sunScale, 1)
  assert.equal(noon.hazeAmount, 0)
})

test('the sun warms and the fill cools as the sun nears the horizon', () => {
  const afternoon = goldenHourLight(0.3, 0)
  const golden = goldenHourLight(0.12, 0)
  const sunset = goldenHourLight(0.02, 0)
  assert.ok(warmth(golden.sun) > warmth(afternoon.sun))
  assert.ok(warmth(sunset.sun) > warmth(golden.sun))
  assert.ok(warmth(golden.fill) < warmth(afternoon.fill), 'the shadow fill leans blue')
  assert.ok(golden.sunScale > afternoon.sunScale)
  assert.ok(golden.fillScale < afternoon.fillScale)
})

test('night is left to the existing night lighting', () => {
  const night = goldenHourLight(-0.4, 0)
  assert.equal(night.amount, 0)
  assert.deepEqual(night.fill, goldenHourPreset.noonFill)
  assert.equal(night.hazeAmount, 0)
})

test('rain mutes golden hour back toward neutral light', () => {
  const clear = goldenHourLight(0.1, 0)
  const wet = goldenHourLight(0.1, 1)
  assert.equal(wet.amount, 0)
  assert.deepEqual(wet.sun, goldenHourPreset.noonSun)
  assert.ok(clear.amount > 0)
})
