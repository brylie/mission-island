import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createLandscapeDraft } from '../src/workbench/landscape-draft.ts'

test('draft history restores placement, movement, and removal in order', () => {
  const existing = { kind: 'rock', x: 0, z: 0 }
  const placed = { kind: 'tree', x: 5.1, z: -2 }
  const moved = { ...placed, x: 6.4, z: 3.5 }
  const draft = createLandscapeDraft(JSON.stringify([existing]))
  assert.equal(draft.canUndo, false)
  const { object: { id } } = draft.place(placed.kind, placed)
  draft.move(1, moved)
  draft.remove(1)
  assert.deepEqual(draft.placements(), [existing])

  draft.undo()
  assert.deepEqual(draft.placements(), [existing, moved])
  assert.equal(draft.objects[1].id, id)
  draft.undo()
  assert.deepEqual(draft.placements(), [existing, placed])
  draft.undo()
  assert.deepEqual(draft.placements(), [existing])
  assert.equal(draft.undo(), undefined)

  draft.redo()
  assert.deepEqual(draft.placements(), [existing, placed])
  assert.equal(draft.objects[1].id, id)
  draft.redo()
  assert.deepEqual(draft.placements(), [existing, moved])
  draft.redo()
  assert.deepEqual(draft.placements(), [existing])
  assert.equal(draft.redo(), undefined)
})

test('undo restores a removed object at its original index, and only a real edit clears redo', () => {
  const placements = [{ kind: 'tree', x: 1, z: 2 }, { kind: 'crate', x: 3, z: 4 }]
  const draft = createLandscapeDraft(JSON.stringify(placements))
  draft.remove(0)
  draft.undo()
  assert.deepEqual(draft.placements(), placements)
  assert.equal(draft.move(0, placements[0]), undefined)
  assert.equal(draft.remove(-1), undefined)
  assert.equal(draft.canRedo, true)

  draft.move(1, { x: -3, z: -4 })
  assert.equal(draft.canRedo, false)
  draft.undo()
  assert.deepEqual(draft.placements(), placements)
  assert.equal(draft.canUndo, false)
})
