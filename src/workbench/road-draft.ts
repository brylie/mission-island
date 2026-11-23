import { readStorage, writeStorage } from '../browser-storage.ts'
import type { Point } from '../world.ts'
import { roadSaveDecimals } from '../workbench-save-contract.ts'
import { starterRoads, type StarterRoadLayout } from '../worlds/starter/layout/roads.ts'

// The road designer's working copy: every road being edited, which road and dot
// are selected, and an undo history. It is kept in this browser until it is saved
// to the source tree, so a reload never loses work. Beside it the browser keeps a
// hash of the source roads the draft started from, so Save can warn when roads.ts
// has changed since (another checkout, a pull) and the draft would overwrite it.

export interface RoadDraftRoad {
  id: string
  name: string
  kind: StarterRoadLayout['kind']
  points: Point[]
  bends: number[]
  maxGrade?: (number | null)[]
}

const storageKey = 'mission-island-road-draft'
const historyLimit = 100
const half = 0.5
// A road needs at least two dots; deleting one of the last two deletes the road.
const minimumDots = 2

// FNV-1a, 32 bits: a short, stable fingerprint of the roads, not a security hash.
const fnvOffset = 0x811c9dc5, fnvPrime = 0x01000193, hexBase = 16

const rounded = (value: number) => Number(value.toFixed(roadSaveDecimals))

// A fingerprint of roads as Save writes them: rounded and trimmed as the server does,
// so a draft and the roads.ts saved from it share one.
export function roadsHash(roads: readonly StarterRoadLayout[]) {
  const text = JSON.stringify(roads.map((road) => [
    road.id,
    road.name.trim(),
    road.kind,
    road.points.map(({ x, z }) => [rounded(x), rounded(z)]),
    road.bends.map(rounded),
    road.maxGrade ?? [],
  ]))
  let hash = fnvOffset
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), fnvPrime)
  return (hash >>> 0).toString(hexBase)
}

const copy = (roads: readonly StarterRoadLayout[]): RoadDraftRoad[] => roads.map((road) => ({
  id: road.id,
  name: road.name,
  kind: road.kind,
  points: road.points.map(({ x, z }) => ({ x, z })),
  bends: [...road.bends],
  ...(road.maxGrade && { maxGrade: [...road.maxGrade] }),
}))

// `base` lists the source hashes this draft knows about: the roads.ts it began from and,
// after a save, the roads.ts that save wrote, which the page only loads after the reload.
interface SavedDraft { base: string[], roads: RoadDraftRoad[] }

// The stored draft. A draft from before the hash was kept is a bare list, with no base.
function readSaved(): SavedDraft | undefined {
  try {
    const raw = readStorage('localStorage', storageKey)
    const parsed: unknown = raw ? JSON.parse(raw) : undefined
    if (Array.isArray(parsed)) return { base: [], roads: parsed as RoadDraftRoad[] }
    const saved = parsed as Partial<SavedDraft> | undefined
    const base = Array.isArray(saved?.base) ? saved.base.filter((hash) => typeof hash === 'string') : []
    return Array.isArray(saved?.roads) ? { base, roads: saved.roads } : undefined
  }
  catch {
    return undefined
  }
}

// Adds a dot past whichever end of a road is nearer the point, and returns its index.
function extendRoad(road: RoadDraftRoad, point: Point) {
  const first = road.points[0], last = road.points[road.points.length - 1]
  if (Math.hypot(point.x - first.x, point.z - first.z) < Math.hypot(point.x - last.x, point.z - last.z)) {
    road.points.unshift(point)
    road.bends.unshift(0)
    road.maxGrade?.unshift(null)
    return 0
  }
  road.points.push(point)
  road.bends.push(0)
  road.maxGrade?.push(null)
  return road.points.length - 1
}

// Takes dot `i` out of a road, with the stretch after it (or before it, at the end).
function removeDot(road: RoadDraftRoad, i: number) {
  road.points.splice(i, 1)
  const stretch = Math.min(i, road.bends.length - 1)
  road.bends.splice(stretch, 1)
  road.maxGrade?.splice(stretch, 1)
}

// Moves a road to place `to` in the list.
function reorder(roads: RoadDraftRoad[], road: RoadDraftRoad, to: number) {
  roads.splice(roads.indexOf(road), 1)
  roads.splice(to, 0, road)
}

export function createRoadDraft() {
  const source = () => roadsHash(starterRoads)
  const saved = readSaved()
  let roads = saved?.roads ?? copy(starterRoads)
  let base = saved ? saved.base : [source()]
  const undo: string[] = [], redo: string[] = []
  let selectedRoad: string | undefined = roads[0]?.id
  let selectedDot: number | undefined

  // Undo steps hold the base too, so undoing Discard brings back the older draft's warning.
  const snapshot = () => JSON.stringify({ base, roads } satisfies SavedDraft)
  const restore = (step: string) => {
    ({ base, roads } = JSON.parse(step) as SavedDraft)
  }
  const persist = () => writeStorage('localStorage', storageKey, snapshot())
  // Undo takes a step off one history and puts the present on the other; redo the reverse.
  function travel(from: string[], to: string[]) {
    const step = from.pop()
    if (!step) return
    to.push(snapshot())
    restore(step)
    persist()
  }
  function edit(change: () => void) {
    undo.push(snapshot())
    if (undo.length > historyLimit) undo.shift()
    redo.length = 0
    change()
    persist()
  }
  const road = () => roads.find((entry) => entry.id === selectedRoad)

  return {
    roads: () => roads,
    road,
    canUndo: () => undo.length > 0,
    canRedo: () => redo.length > 0,
    // True when roads.ts has changed since this draft began from it, and the draft
    // differs from it: saving would overwrite roads someone else saved.
    sourceChanged: () => !base.includes(source()) && roadsHash(roads) !== source(),
    // After a save, the draft is the source, before and after the page reloads it.
    markSaved() {
      base = [source(), roadsHash(roads)]
      persist()
    },
    selectedDot: () => selectedDot,
    select(id: string | undefined, dot?: number) {
      selectedRoad = id
      selectedDot = dot
    },
    // Changes while dragging: the history step was taken when the drag began.
    begin: () => edit(() => {}),
    moveDot(i: number, point: Point) {
      const current = road()
      if (current) current.points[i] = point
      persist()
    },
    setBend(i: number, bend: number) {
      const current = road()
      if (current) current.bends[i] = bend
      persist()
    },
    addRoad(start: Point, end: Point, kind: RoadDraftRoad['kind']) {
      const taken = new Set(roads.map((entry) => entry.id))
      let n = roads.length + 1
      while (taken.has(`road-${n}`)) n++
      edit(() => roads.push({ id: `road-${n}`, name: `Road ${n}`, kind, points: [start, end], bends: [0] }))
      selectedRoad = `road-${n}`
      selectedDot = 1
    },
    // Adds a dot past whichever end of the selected road is nearer the point.
    extend(point: Point) {
      const current = road()
      if (!current) return
      edit(() => {
        selectedDot = extendRoad(current, point)
      })
    },
    // Splits a stretch at a point, keeping half its bend on each side.
    insertDot(stretch: number, point: Point) {
      const current = road()
      if (!current) return
      edit(() => {
        const bend = current.bends[stretch] * half
        current.points.splice(stretch + 1, 0, point)
        current.bends.splice(stretch, 1, bend, bend)
        current.maxGrade?.splice(stretch + 1, 0, current.maxGrade[stretch] ?? null)
      })
      selectedDot = stretch + 1
    },
    // Replaces the dots between two dots of the selected road, and their stretches' bends, for Suggest route.
    replaceBetween(from: number, to: number, points: Point[], bends: number[]) {
      const current = road()
      if (!current || to <= from) return
      edit(() => {
        current.points.splice(from + 1, to - from - 1, ...points)
        current.bends.splice(from, to - from, ...bends)
        if (current.maxGrade) current.maxGrade.splice(from, to - from, ...new Array<number | null>(points.length + 1).fill(current.maxGrade[from] ?? null))
      })
    },
    deleteDot() {
      const current = road()
      if (!current || selectedDot === undefined) return
      const i = selectedDot
      edit(() => {
        if (current.points.length <= minimumDots) roads = roads.filter((entry) => entry !== current)
        else removeDot(current, i)
      })
      selectedDot = undefined
      if (!roads.includes(current)) selectedRoad = roads[0]?.id
    },
    deleteRoad() {
      const current = road()
      if (!current) return
      edit(() => {
        roads = roads.filter((entry) => entry !== current)
      })
      selectedRoad = roads[0]?.id
      selectedDot = undefined
    },
    // Moves the selected road up (-1) or down (+1) the list, which is the order roads are graded in.
    moveRoad(step: number) {
      const current = road()
      const to = current ? roads.indexOf(current) + step : -1
      if (current && to >= 0 && to < roads.length) edit(() => reorder(roads, current, to))
    },
    setRoad(changes: Partial<Pick<RoadDraftRoad, 'name' | 'kind'>>) {
      const current = road()
      if (current) edit(() => Object.assign(current, changes))
    },
    // The grade limit of one stretch, or null for the kind's own.
    setStretchGrade(stretch: number, grade: number | null) {
      const current = road()
      if (!current) return
      edit(() => {
        current.maxGrade ??= current.bends.map(() => null)
        current.maxGrade[stretch] = grade
        if (current.maxGrade.every((entry) => entry === null)) delete current.maxGrade
      })
    },
    undo: () => travel(undo, redo),
    redo: () => travel(redo, undo),
    // Back to the roads in the source tree.
    discard() {
      edit(() => {
        roads = copy(starterRoads)
        base = [source()]
      })
      selectedRoad = roads[0]?.id
    },
  }
}
