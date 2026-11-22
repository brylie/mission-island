import assert from 'node:assert/strict'
import { test } from 'node:test'
import { foliageContact } from '../src/assets/audio/foliage.ts'
import { createFoliageContacts } from '../src/audio/foliage-contact.ts'
import { foliageCue, renderFoliage } from '../src/audio/foliage-recipes.ts'
import { recipeRate } from '../src/audio/dsp.ts'

const fern = { x: 0, z: 0, kind: 'fern' }
const rushes = { x: 10, z: 0, kind: 'rushes' }
const walking = 4

// Walk in a straight line, sampling every frame, and collect the brushes. Time runs on across walks.
let clock = 0
function walkPast(contacts, from, to, speed = walking, id = 0, fps = 60) {
  const brushes = []
  const metres = Math.hypot(to.x - from.x, to.z - from.z)
  const frames = Math.ceil(metres / speed * fps)
  for (let frame = 0; frame <= frames; frame++) {
    const t = frame / frames
    clock += 1 / fps
    const brush = contacts.step(id, { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t }, speed, clock)
    if (brush) brushes.push(brush)
  }
  return brushes
}

test('walking through a plant rustles once, and walking back rustles again', () => {
  const contacts = createFoliageContacts([fern], [])
  assert.equal(walkPast(contacts, { x: -3, z: 0 }, { x: 3, z: 0 }).length, 1)
  assert.equal(walkPast(contacts, { x: 3, z: 0 }, { x: -3, z: 0 }).length, 1)
})

test('standing in a plant or skimming its edge stays quiet', () => {
  const contacts = createFoliageContacts([fern], [])
  const reach = foliageContact.plants.fern.reachMetres
  assert.equal(contacts.step(0, { x: 0, z: 0 }, walking, 0).kind, 'fern')
  for (let frame = 1; frame < 300; frame++) assert.equal(contacts.step(0, { x: 0, z: 0 }, 0, frame / 60), null)
  // Sway back and forth across the edge, never stepping clearly away.
  for (let frame = 0; frame < 600; frame++) {
    const x = reach * (1 + 0.25 * Math.sin(frame / 10))
    assert.equal(contacts.step(0, { x, z: 0 }, walking, 5 + frame / 60), null)
  }
})

test('a slow pass is silent, and stiff rushes rustle harder than soft ferns', () => {
  assert.equal(walkPast(createFoliageContacts([fern], []), { x: -3, z: 0 }, { x: 3, z: 0 }, 0.2).length, 0)
  const contacts = createFoliageContacts([fern, rushes], [])
  const [throughFern] = walkPast(contacts, { x: -3, z: 0 }, { x: 3, z: 0 })
  const [throughRushes] = walkPast(contacts, { x: 7, z: 0 }, { x: 13, z: 0 })
  assert.ok(throughRushes.strength > throughFern.strength)
  const [faster] = walkPast(createFoliageContacts([fern], []), { x: -3, z: 0 }, { x: 3, z: 0 }, 7)
  assert.ok(faster.strength > throughFern.strength, 'a faster pass is firmer')
})

test('bark brushes cool down, and each crewmate is tracked on their own', () => {
  const trunk = { x: 0, z: 5 }
  const contacts = createFoliageContacts([], [trunk])
  const along = (id, time) => contacts.step(id, { x: 0.3, z: 5 }, walking, time)
  assert.equal(along(0, 0).kind, 'trunk')
  contacts.step(0, { x: 3, z: 5 }, walking, 0.2)
  assert.equal(along(0, 0.4), null, 'the same tree does not scrape again at once')
  contacts.step(0, { x: 3, z: 5 }, walking, 1)
  assert.equal(along(0, foliageContact.trunk.cooldownSeconds + 1).kind, 'trunk')
  const plants = createFoliageContacts([fern], [])
  assert.equal(walkPast(plants, { x: -3, z: 0 }, { x: 3, z: 0 }, walking, 0).length, 1)
  assert.equal(walkPast(plants, { x: -3, z: 0 }, { x: 3, z: 0 }, walking, 1).length, 1, 'a second crewmate brushes the same fern')
})

test('a dense patch is a few rustles, not a burst', () => {
  const patch = Array.from({ length: 40 }, (_, i) => ({ x: (i % 8) * 0.4 - 1.6, z: Math.floor(i / 8) * 0.4 - 0.8, kind: 'fern' }))
  const brushes = walkPast(createFoliageContacts(patch, []), { x: -3, z: 0 }, { x: 3, z: 0 })
  const seconds = 6 / walking
  assert.ok(brushes.length <= seconds / foliageContact.walkerCooldownSeconds + 1)
})

test('rustle and bark recipes are bounded, repeatable and keyed by strength', () => {
  for (const kind of ['fern', 'rushes', 'marram', 'trunk']) {
    const sound = renderFoliage({ kind, strength: 0.5 }, 1)
    assert.deepEqual(renderFoliage({ kind, strength: 0.5 }, 1), sound)
    assert.notDeepEqual(renderFoliage({ kind, strength: 0.5 }, 2), sound)
    assert.ok(sound.length <= 0.5 * recipeRate)
    for (const value of sound) assert.ok(Number.isFinite(value) && Math.abs(value) <= 1)
  }
  assert.notEqual(foliageCue({ kind: 'fern', strength: 0.1 }, 1).key, foliageCue({ kind: 'fern', strength: 0.9 }, 1).key)
  assert.ok(foliageCue({ kind: 'fern', strength: 0.9 }, 1).gain > foliageCue({ kind: 'fern', strength: 0.1 }, 1).gain)
})
