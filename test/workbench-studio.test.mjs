import assert from 'node:assert/strict'
import { URL, URLSearchParams } from 'node:url'
import { test } from 'node:test'
import { libraryResults, workspaceOf, workspaces } from '../src/workbench/library.ts'
import { readSubjectLink, subjectLink } from '../src/workbench/subject-link.ts'
import { defaultPlacement, draftFeatures, readSiteDrafts, saveSiteDraft } from '../src/workbench/site-drafts.ts'
import { starterFeatures } from '../src/worlds/starter/sites.ts'

test('workspace browsing stays scoped and multiword search crosses subject groups', () => {
  const entries = [
    { group: 'Animals', name: 'Woodland hare', description: 'Grazing and flight' },
    { group: 'Materials', name: 'Wood', description: 'Woodland grain' },
    { group: 'Saltwind buildings', name: 'School', description: 'Modular roof' },
  ]
  const groups = Object.values(workspaces).flat()
  assert.equal(groups.length, new Set(groups).size)
  for (const [workspace, groups] of Object.entries(workspaces)) {
    for (const group of groups) assert.equal(workspaceOf(group), workspace)
  }
  assert.deepEqual(libraryResults(entries, 'Ecology', ' '), [entries[0]])
  assert.deepEqual(libraryResults(entries, 'Vehicles', 'woodland'), entries.slice(0, 2))
  assert.deepEqual(libraryResults(entries, 'Vehicles', '  ROOF   construction '), [entries[2]])
  assert.deepEqual(libraryResults(entries, 'Surfaces', 'no match'), [])
})

test('subject setups round-trip isolated and field views, including large orbit radii', () => {
  const shot = { version: 1, name: 'Bench', camera: { target: [39, 1, 17], alpha: .75, beta: 1.12, radius: 510, fov: .63 },
    time: 2.5, options: { scale: 1.25, color: '#da9841' }, grid: true, wireframe: false }
  for (const field of [false, true]) {
    const link = new URL(subjectLink('http://user:pass@localhost:5173/workbench.html?old=1', 'site-town', field, shot, 'golden'))
    assert.equal(link.username + link.password + link.search, '')
    assert.equal(new URLSearchParams(link.hash.split('?')[1]).get('stage'), field ? 'island' : null)
    assert.deepEqual(readSubjectLink(link.hash), { shot, lighting: 'golden' })
  }
  for (const hash of ['#site-town', '#site-town?setup=broken', '#site-town?setup=%7B%7D']) assert.equal(readSubjectLink(hash), undefined)
})

test('furnishing drafts survive reopening and preserve the canonical island placement', (t) => {
  const data = new Map()
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v),
  } } })
  t.after(() => { delete globalThis.window })
  const original = starterFeatures.find(f => f.site === 'town')
  const saved = { ...defaultPlacement(original), east: 1.4, north: -.7, heading: 45 }
  assert.equal(saveSiteDraft('town', saved), true)
  assert.deepEqual(readSiteDrafts().town, saved)
  const edited = draftFeatures().find(f => f.site === 'town')
  assert.equal(edited.x, original.x + 1.4)
  assert.equal(edited.z, original.z - .7)
  assert.equal(edited.heading, Math.PI / 4)
  assert.equal(edited.model, original.model)
  assert.equal(saveSiteDraft('town', { ...saved, scale: -2 }), false)
  assert.equal(saveSiteDraft('unknown', saved), false)
  const key = [...data.keys()][0]
  data.set(key, '{"town":{"color":"broken"}}')
  assert.deepEqual(readSiteDrafts(), {})
  data.set(key, 'broken')
  assert.deepEqual(draftFeatures(), starterFeatures)
})
