import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import test from 'node:test'
import { dyeHues, dyeRows, dyeSwatchesSource, generateDyeSwatches } from '../src/dye-palette.ts'
import { dyeSwatches } from '../src/assets/recipes/dye-swatches.ts'
import { uniforms } from '../src/crew-appearance.ts'

const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
function oklab(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]
}
const distance = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
const chroma = ([, a, b]) => Math.hypot(a, b)

test('the committed swatches are exactly what the generator writes', () => {
  const committed = readFileSync(new URL('../src/assets/recipes/dye-swatches.ts', import.meta.url), 'utf8')
  assert.equal(committed, dyeSwatchesSource(), 'Run npm run dyes:generate instead of editing src/assets/recipes/dye-swatches.ts')
  assert.deepEqual(JSON.parse(JSON.stringify(dyeSwatches)), generateDyeSwatches())
})

test('every row keeps its lightness, so rows read apart', () => {
  for (const { row, lightness } of dyeRows) {
    for (const hue of dyeHues) assert.ok(Math.abs(oklab(dyeSwatches[`${row}-${hue}`].color)[0] - lightness) < 0.01, `${row}-${hue}`)
  }
})

test('trim comes from the opposite end of the same hue', () => {
  for (const hue of dyeHues) {
    assert.equal(dyeSwatches[`pale-${hue}`].trim, dyeSwatches[`deep-${hue}`].color)
    assert.equal(dyeSwatches[`mid-${hue}`].trim, dyeSwatches[`deep-${hue}`].color)
    assert.equal(dyeSwatches[`deep-${hue}`].trim, dyeSwatches[`pale-${hue}`].color)
  }
  for (const swatch of Object.values(dyeSwatches)) assert.ok(distance(oklab(swatch.color), oklab(swatch.trim)) > 0.15, swatch.name)
})

test('no dye is as saturated as the fire crew or reproduces an earned uniform', () => {
  const fireCrew = chroma(oklab(uniforms.rescue.color))
  const earned = Object.values(uniforms).filter((uniform) => uniform.unlock)
  for (const swatch of Object.values(dyeSwatches)) {
    assert.ok(chroma(oklab(swatch.color)) < fireCrew, swatch.name)
    for (const uniform of earned) {
      const pair = distance(oklab(swatch.color), oklab(uniform.color)) + distance(oklab(swatch.trim), oklab(uniform.trim))
      assert.ok(pair > 0.1, `${swatch.name} copies ${uniform.name}`)
    }
  }
})
