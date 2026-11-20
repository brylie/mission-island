import assert from 'node:assert/strict'
import test from 'node:test'
import { interactiveStudies, shaderGroups } from '../src/interactive-shaders/catalog.ts'
import { skiffStudyPose, wakeStrength } from '../src/interactive-shaders/skiff-wake.ts'
import { coastPoint, coastRadius, maxWadeDepth, waterDepth } from '../src/terrain.ts'
import { offset } from '../src/world.ts'
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

test('the skiff wake needs speed and a wet source even if the boat still has momentum', () => {
  const offshore = { ...coastPoint(-Math.PI / 2, 1.18), heading: Math.PI, speed: 3 }
  assert.ok(wakeStrength(offshore) > 0)
  for (const speed of [0, .01, -.01]) assert.equal(wakeStrength({ ...offshore, speed }), 0)
  const sand = { ...coastPoint(-Math.PI / 2, .98), heading: Math.PI, speed: 3 }
  assert.equal(waterDepth(sand), 0)
  assert.equal(wakeStrength(sand), 0)
  assert.equal(wakeStrength(offshore, sand), 0)
  const onShore = { ...coastPoint(-Math.PI / 2, 1.02), heading: Math.PI, speed: 3 }
  assert.ok(waterDepth(onShore) > 0)
  assert.equal(waterDepth(offset(onShore, 0, -2.1)), 0)
  assert.equal(wakeStrength(onShore), 0)
})

test('the field skiff starts at rest and its moving preset generates wake on the water', () => {
  const { field, fieldDefault, value } = interactiveStudies.find(study => study.id === 'skiff-wake')
  assert.equal(fieldDefault, 0)
  assert.deepEqual(skiffStudyPose(field.point, 0, fieldDefault), skiffStudyPose(field.point, 2, fieldDefault))
  assert.equal(wakeStrength(skiffStudyPose(field.point, 2, fieldDefault)), 0)
  assert.equal(wakeStrength(skiffStudyPose(field.point, 0, value)), 0)
  assert.ok(skiffStudyPose(field.point, 2, value).x < skiffStudyPose(field.point, 1, value).x)
  assert.ok(wakeStrength(skiffStudyPose(field.point, 2, value)) > 0)
})
