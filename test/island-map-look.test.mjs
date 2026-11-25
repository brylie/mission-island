import assert from 'node:assert/strict'
import { test } from 'node:test'
import { starterMapLook } from '../src/assets/geometry/starter-map.ts'

// WCAG relative luminance and contrast ratio of two #rrggbb colours.
const channel = (value) => {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => channel(Number.parseInt(hex.slice(i, i + 2), 16)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

test('the map\'s dirt roads read on every land colour: a dark edge on the land, a light fill on the edge', () => {
  const { dirt } = starterMapLook.paths
  for (const [name, land] of Object.entries(starterMapLook.land).filter(([, value]) => typeof value === 'string')) {
    assert.ok(contrast(dirt.edge.color, land) >= 3, `edge on ${name}: ${contrast(dirt.edge.color, land).toFixed(2)}`)
  }
  assert.ok(contrast(dirt.color, dirt.edge.color) >= 3, `fill on edge: ${contrast(dirt.color, dirt.edge.color).toFixed(2)}`)
  assert.ok(dirt.edge.width > dirt.width, 'the edge shows either side of the fill')
})
