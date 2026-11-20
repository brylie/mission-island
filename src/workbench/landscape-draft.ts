import type { Point } from '../world'

export const draftStorageKey = 'mission-island-landscape-layout'
export const draftLabels = { player: 'Test player', crate: 'Crate', rock: 'Rock', tree: 'Tree', truck: 'Flatbed' } as const
const maxObjects = 60

type Placement = Point & { kind: keyof typeof draftLabels }
type DraftObject = Placement & { id: number }
type Edit = { type: 'place' | 'remove'; index: number; object: DraftObject } |
  { type: 'move'; index: number; before: Point; after: Point }

function loadPlacements(saved: string | null): Placement[] {
  try {
    const parsed: unknown = JSON.parse(saved ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.slice(0, maxObjects).filter((item: unknown): item is Placement => {
      if (typeof item !== 'object' || item === null) return false
      const point = item as Partial<Placement>
      return typeof point.kind === 'string' && Object.hasOwn(draftLabels, point.kind) &&
        typeof point.x === 'number' && Number.isFinite(point.x) && typeof point.z === 'number' && Number.isFinite(point.z)
    })
  } catch {
    return []
  }
}

export function createLandscapeDraft(saved: string | null) {
  let nextId = 1
  const objects = loadPlacements(saved).map(({ kind, x, z }) => ({ id: nextId++, kind, x, z }))
  const edits: Edit[] = []
  let cursor = 0

  function apply(edit: Edit, undo: boolean) {
    const { index, type } = edit
    if (type === 'move') {
      const object = objects[index]
      Object.assign(object, undo ? edit.before : edit.after)
      return { action: 'move', index, object, type } as const
    }
    if ((type === 'place') !== undo) {
      const object = { ...edit.object }
      objects.splice(index, 0, object)
      return { action: 'insert', index, object, type } as const
    }
    const [object] = objects.splice(index, 1)
    return { action: 'remove', index, object, type } as const
  }

  function record(edit: Edit) {
    edits.splice(cursor, edits.length - cursor, edit)
    cursor++
    return apply(edit, false)
  }

  return {
    objects: objects as readonly DraftObject[],
    get canUndo() { return cursor > 0 },
    get canRedo() { return cursor < edits.length },
    place(kind: string, { x, z }: Point) {
      if (objects.length >= maxObjects || !Object.hasOwn(draftLabels, kind)) return
      const object = { id: nextId++, kind: kind as Placement['kind'], x, z }
      return record({ type: 'place', index: objects.length, object })
    },
    move(index: number, { x, z }: Point) {
      const object = objects[index]
      if (!object || (object.x === x && object.z === z)) return
      return record({ type: 'move', index, before: { x: object.x, z: object.z }, after: { x, z } })
    },
    remove(index: number) {
      const object = objects[index]
      if (object) return record({ type: 'remove', index, object: { ...object } })
    },
    undo() {
      if (cursor > 0) return apply(edits[--cursor], true)
    },
    redo() {
      if (cursor < edits.length) return apply(edits[cursor++], false)
    },
    placements: (): Placement[] => objects.map(({ kind, x, z }) => ({ kind, x, z })),
  }
}
