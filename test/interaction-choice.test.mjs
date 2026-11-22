import assert from 'node:assert/strict'
import test from 'node:test'
import { interactRequest } from '../src/actions.ts'
import { interactions } from '../src/interaction-options.ts'
import { aimedInteraction } from '../src/reticle-target.ts'
import { crateStarts } from '../src/world.ts'
import { player, setup, tokens } from './support/game-harness.mjs'

const ray = (origin, toward, reach = 18) => {
  const d = { x: toward.x - origin.x, y: toward.y - origin.y, z: toward.z - origin.z }
  const length = Math.hypot(d.x, d.y, d.z)
  return { origin, direction: { x: d.x / length, y: d.y / length, z: d.z / length }, reach }
}

test('the reticle picks the nearest target its ray passes through, before any wall', () => {
  const near = { action: 'pick-up', subject: 0, key: 'E', label: 'Pick up crate', name: 'Crate', at: { x: 0, y: 1, z: 3 }, radius: 0.6 }
  const far = { ...near, subject: 1, at: { x: 0, y: 1, z: 6 } }
  const aside = { ...near, subject: 2, at: { x: 2, y: 1, z: 4 } }
  const unplaced = { action: 'put-down', key: 'E', label: 'Set crate down', name: 'Ground' }
  const eye = { x: 0, y: 1, z: 0 }
  assert.equal(aimedInteraction([far, near, aside, unplaced], ray(eye, { x: 0, y: 1, z: 1 })), near)
  assert.equal(aimedInteraction([far, aside], ray(eye, { x: 0, y: 1, z: 1 })), far)
  assert.equal(aimedInteraction([far], ray(eye, { x: 0, y: 1, z: 1 }, 4)), undefined, 'a wall cuts the ray short')
  assert.equal(aimedInteraction([near], ray(eye, { x: 0, y: 1, z: -1 })), undefined, 'nothing behind the camera')
  assert.equal(aimedInteraction([unplaced], ray(eye, { x: 0, y: 1, z: 1 })), undefined)
  assert.equal(aimedInteraction([near], undefined), undefined, 'no reticle, no focus')
  const edge = ray(eye, { x: 0.68, y: 1, z: 3 })
  assert.equal(aimedInteraction([near], edge), undefined)
  assert.equal(aimedInteraction([near], edge, near), near, 'a held focus is a little sticky')
})

test('E acts on the crate the player aims at, and the host refuses a choice that is not open', (t) => {
  const between = { x: (crateStarts[0].x + crateStarts[1].x) / 2, z: (crateStarts[0].z + crateStarts[1].z) / 2 }
  const h = setup(t, { players: [player(0, between)] })
  const a = h.join(tokens[0])
  const options = interactions(a.state, a.player).filter(({ action }) => action === 'pick-up')
  assert.ok(options.length >= 2, 'two crates in reach')
  const aimed = options.at(-1)
  assert.deepEqual(interactRequest(a.state, a.player, aimed), { type: 'interact', choice: { action: 'pick-up', subject: aimed.subject } })
  a.request('interact', { choice: { action: 'chest' } })
  h.advance()
  assert.equal(a.state.items.some(({ holder }) => holder === 0), false, 'not at the chest')
  a.request('interact', { choice: { action: 'pick-up', subject: aimed.subject } })
  h.advance()
  assert.equal(a.state.items[aimed.subject].holder, 0, 'the aimed crate, not the nearest one')
})
