import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { URL } from 'node:url'
import test from 'node:test'
import { libraryResults } from '../src/workbench/library.ts'
import { readSubjectLink, subjectLink } from '../src/workbench/subject-link.ts'
import { bakeSurfaceMaps } from '../src/surface-maps.ts'
import { meadowGroundTone, sampleSurface } from '../src/surface-patterns.ts'
import { surfaceFamilies, surfaceRecipes, surfaceRepeatMeters } from '../src/surface-recipes.ts'

test('the library carries three uniquely named, searchable recipes per surface family', () => {
  const entries = surfaceRecipes.map((recipe) => ({ ...recipe, group: recipe.family }))
  assert.equal(entries.length, 54)
  assert.equal(new Set(entries.map(({ id }) => id)).size, entries.length)
  for (const family of surfaceFamilies) {
    assert.equal(libraryResults(entries, 'Surfaces', family).filter((entry) => entry.group === family).length, 3, family)
  }
  for (const [query, id] of [['salt-worn timber', 'weathered-board'], ['harbor gravel', 'path-gravel'], ['drying cracks', 'estuary-silt'], ['workwear cloth', 'workwear-twill'], ['compass iron ore', 'magnetite-seam'], ['tesserae submerged', 'drowned-mosaic'], ['hedgerow hindprints', 'hare-crossings']]) {
    assert.deepEqual(libraryResults(entries, 'Surfaces', query).map(({ id }) => id), [id])
  }
})

test('the repeat measures the intended number of physical features and joins in both directions', () => {
  for (const recipe of surfaceRecipes) {
    const repeat = surfaceRepeatMeters(recipe, {})
    assert.equal(repeat, recipe.spacing.cells * recipe.spacing.mm / 1000, recipe.id)
    assert.equal(surfaceRepeatMeters(recipe, { spacingMm: recipe.spacing.mm * 2 }), repeat * 2, recipe.id)
    const sample = sampleSurface(recipe, {})
    for (const [u, v] of [[0, 0], [0.037, 0.38], [0.231, 0.9375], [0.71, 0.419]]) {
      const base = sample(u, v)
      for (const [x, y] of [[u + 1, v], [u, v - 1]]) {
        assert.ok(sample(x, y).every((value, index) => Math.abs(value - base[index]) < 1e-8), recipe.id)
      }
    }
  }
})

test('every preset has distinct deterministic relief and wear alters the surface structure', () => {
  const signatures = new Set()
  for (const recipe of surfaceRecipes) {
    const base = bakeSurfaceMaps(recipe, {}, 64)
    assert.deepEqual(base, bakeSurfaceMaps(recipe, {}, 64), recipe.id)
    const changed = bakeSurfaceMaps(recipe, { wear: recipe.wear.amount < 0.5 ? 1 : 0 }, 64)
    assert.ok(changed.normals.some((value, index) => value !== base.normals[index]), recipe.id)
    signatures.add(Buffer.from(base.normals).toString('base64'))
  }
  assert.equal(signatures.size, surfaceRecipes.length)
  const [meadow] = surfaceRecipes
  const first = meadowGroundTone(18.5, 23.8, 0.27)
  assert.notEqual(first, meadowGroundTone(18.5 + surfaceRepeatMeters(meadow, {}), 23.8, 0.27))
  assert.ok(meadowGroundTone(18.5, 23.8, 0.8) > first)
})

test('setup links retain a close cloth camera and grazing light', () => {
  const shot = {
    version: 1,
    name: 'Canvas weave',
    time: 0,
    options: { spacing: 1.6, wear: 0.31 },
    camera: { alpha: 0.8, beta: 0.95, radius: 0.18, target: [0, 0.005, 0] },
    grid: false,
    wireframe: false,
  }
  const url = new URL(subjectLink('http://localhost:5173/', 'canvas', false, shot, 'grazing'))
  assert.deepEqual(readSubjectLink(url.hash), { shot, lighting: 'grazing' })
})

test('glow algae has a patchy emission map that thins with exposure and shares dusk lighting', () => {
  const recipe = surfaceRecipes.find((entry) => entry.id === 'glow-algae-film')
  const { emissive } = bakeSurfaceMaps(recipe, { wear: 0 }, 64)
  const unlitControl = bakeSurfaceMaps(surfaceRecipes[0], {}, 64)
  const exposed = bakeSurfaceMaps(recipe, { wear: 1 }, 64).emissive
  const green = emissive.filter((_, i) => i % 4 === 1)
  assert.ok(green.some((value) => value === 0))
  assert.ok(green.some((value) => value > 100))
  assert.equal(unlitControl.emissive, null)
  assert.ok(exposed.reduce((sum, value) => sum + value, 0) < emissive.reduce((sum, value) => sum + value, 0))
  const shot = {
    version: 1,
    name: 'Glow algae at dusk',
    time: 0,
    options: {},
    camera: { alpha: 0.8, beta: 0.95, radius: 2.5, target: [0, 0.05, 0] },
    grid: false,
    wireframe: false,
  }
  const url = new URL(subjectLink('http://localhost:5173/', recipe.id, false, shot, 'dusk'))
  assert.deepEqual(readSubjectLink(url.hash), { shot, lighting: 'dusk' })
})
