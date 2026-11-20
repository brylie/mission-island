import assert from 'node:assert/strict'
import test from 'node:test'
import { interactiveStudies, shaderGroups } from '../src/interactive-shaders/catalog.ts'
import { coastRadius, maxWadeDepth, waterDepth } from '../src/terrain.ts'
import { onBeachTowel } from '../src/worlds/starter/sites.ts'
import { workspaceOf } from '../src/workbench/library.ts'

test('twenty shader studies have distinct share IDs, editable responses, and field views', () => {
  assert.equal(interactiveStudies.length, 20)
  assert.equal(new Set(interactiveStudies.map(study => study.id)).size, 20)
  for (const group of shaderGroups) {
    assert.equal(workspaceOf(group), 'Surfaces')
    assert.equal(interactiveStudies.filter(study => study.group === group).length, 5)
  }
  for (const { id, baseline, preset, value, field } of interactiveStudies) {
    assert.ok(id.includes('-') && id.split('-').every(word => /^[a-z]+$/.test(word)))
    assert.notEqual(baseline, preset, id)
    assert.ok(value > 0 && value <= 1, id)
    assert.ok(field.radius > 1.5 && field.beta > 0 && field.beta < Math.PI / 2, id)
    assert.ok(field.hour >= 0 && field.hour < 24 && field.rain >= 0 && field.rain <= 1, id)
  }
})

test('shore review subjects sit on traversable sand, wadeable shallows, and open water as appropriate', () => {
  const at = id => interactiveStudies.find(study => study.id === id).field.point
  const sand = at('sand-footprints')
  assert.equal(waterDepth(sand), 0)
  assert.ok(coastRadius(sand) > .925 && coastRadius(sand) < 1)
  assert.equal(onBeachTowel(sand), false)
  for (const id of ['wading-rings', 'seabed-caustics']) {
    assert.ok(waterDepth(at(id)) > .15 && waterDepth(at(id)) < maxWadeDepth, id)
  }
  for (const id of ['water-rain-rings', 'skiff-wake', 'moon-glitter']) {
    assert.ok(waterDepth(at(id)) > maxWadeDepth, id)
  }
})
