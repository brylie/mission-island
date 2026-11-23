import { readStorage, writeStorage } from '../browser-storage.ts'
import type { Point } from '../world.ts'
import { starterRoads, type StarterRoadLayout } from '../worlds/starter/layout/roads.ts'

// The road designer's working copy: every road being edited, which road and dot
// are selected, and an undo history. It is kept in this browser until it is saved
// to the source tree, so a reload never loses work.

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

const copy = (roads: readonly StarterRoadLayout[]): RoadDraftRoad[] => roads.map((road) => ({
  id: road.id,
  name: road.name,
  kind: road.kind,
  points: road.points.map(({ x, z }) => ({ x, z })),
  bends: [...road.bends],
  ...(road.maxGrade && { maxGrade: [...road.maxGrade] }),
}))

function readSaved(): RoadDraftRoad[] | undefined {
  try {
    const raw = readStorage('localStorage', storageKey)
    const parsed: unknown = raw ? JSON.parse(raw) : undefined
    return Array.isArray(parsed) ? parsed as RoadDraftRoad[] : undefined
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

export function createRoadDraft() {
  let roads = readSaved() ?? copy(starterRoads)
  const undo: string[] = [], redo: string[] = []
  let selectedRoad: string | undefined = roads[0]?.id
  let selectedDot: number | undefined

  const snapshot = () => JSON.stringify(roads)
  const persist = () => writeStorage('localStorage', storageKey, snapshot())
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
        else {
          current.points.splice(i, 1)
          const stretch = Math.min(i, current.bends.length - 1)
          current.bends.splice(stretch, 1)
          current.maxGrade?.splice(stretch, 1)
        }
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
    undo() {
      const previous = undo.pop()
      if (!previous) return
      redo.push(snapshot())
      roads = JSON.parse(previous) as RoadDraftRoad[]
      persist()
    },
    redo() {
      const next = redo.pop()
      if (!next) return
      undo.push(snapshot())
      roads = JSON.parse(next) as RoadDraftRoad[]
      persist()
    },
    // Back to the roads in the source tree.
    discard() {
      edit(() => {
        roads = copy(starterRoads)
      })
      selectedRoad = roads[0]?.id
    },
  }
}
