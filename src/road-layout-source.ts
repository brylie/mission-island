import { gradedRoadKinds } from './assets/geometry/road-kinds.ts'
import { roadSaveDecimals as decimals } from './workbench-save-contract.ts'
import type { StarterRoadLayout } from './worlds/starter/layout/roads.ts'

// The road layout file's schema, shared by the dev server, which writes
// src/worlds/starter/layout/roads.ts from a Workbench save, and the road designer, which checks a
// draft the same way before it sends it. A layout is read from JSON with every value checked,
// and written back as the TypeScript source the game imports.

const maxRoads = 32
const maxPoints = 400
const minPoints = 2
const islandReachM = 2000
const maxBendM = 200
const maxGrade = 0.4
const idPattern = /^[a-z0-9][a-z0-9-]{0,47}$/
const maxNameLength = 80

type RoadKind = typeof gradedRoadKinds[number]

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const within = (value: unknown, limit: number) => finite(value) && Math.abs(value) <= limit

// `position` names a road in errors until its own name has been read.
function readRoad(raw: unknown, position: number): StarterRoadLayout | string {
  if (!raw || typeof raw !== 'object') return `road ${position} is not a road`
  const { id, name, kind, points, bends, maxGrade: grades } = raw as Record<string, unknown>
  if (typeof name !== 'string' || !name.trim() || name.length > maxNameLength) return `road ${position} needs a name of up to ${maxNameLength} characters`
  const label = name.trim()
  if (typeof id !== 'string' || !idPattern.test(id)) return `${label} needs an id of lowercase letters, digits and hyphens`
  if (!gradedRoadKinds.some((graded) => graded === kind)) return `${label} has an unknown kind`
  if (!Array.isArray(points) || points.length < minPoints || points.length > maxPoints) return `${label} needs ${minPoints} to ${maxPoints} dots`
  const dots = points.map((point: unknown) => point && typeof point === 'object' ? point as Record<string, unknown> : {})
  const offIsland = dots.findIndex((point) => !(within(point.x, islandReachM) && within(point.z, islandReachM)))
  if (offIsland >= 0) return `${label} has dot ${offIsland + 1} off the island`
  if (!Array.isArray(bends) || bends.length !== points.length - 1 || !bends.every((bend) => within(bend, maxBendM))) return `${label} needs one bend per stretch`
  if (grades !== undefined && (!Array.isArray(grades) || grades.length !== bends.length || !grades.every((grade) => grade === null || (finite(grade) && grade > 0 && grade <= maxGrade)))) return `${label} has a bad grade limit`
  const rounded = dots.map(({ x, z }) => ({ x: Number((x as number).toFixed(decimals)), z: Number((z as number).toFixed(decimals)) }))
  // A road whose dots all round to one spot has no length to sample.
  if (rounded.every((point) => point.x === rounded[0].x && point.z === rounded[0].z)) return `${label} has no length: its dots are all in one place`
  return {
    id,
    name: label,
    kind: kind as RoadKind,
    points: rounded,
    bends: bends.map((bend: number) => Number(bend.toFixed(decimals))),
    ...(grades && { maxGrade: grades as (number | null)[] }),
  }
}

// The road layouts in a request body, or why they were refused.
export function readRoadLayouts(body: string): StarterRoadLayout[] | string {
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  }
  catch {
    return 'the body is not JSON'
  }
  if (!Array.isArray(parsed) || parsed.length > maxRoads) return `send a list of up to ${maxRoads} roads`
  const roads: StarterRoadLayout[] = []
  for (const [i, raw] of parsed.entries()) {
    const road = readRoad(raw, i + 1)
    if (typeof road === 'string') return road
    const twin = roads.find((other) => other.id === road.id)
    if (twin) return `road ids must be unique: ${twin.name} and ${road.name} are both ${road.id}`
    roads.push(road)
  }
  return roads
}

// roads.ts is authored data and may not import, so its kind type is written out from
// the road kinds at each save. The type check catches a checked-in file that falls
// behind: `readRoad` returns a `RoadKind` as a layout kind, and the designer looks a
// layout kind up in `roadKinds`. Only graded kinds are saved: paved roads are authored elsewhere.
const kindUnion = gradedRoadKinds.map((kind) => `'${kind}'`).join(' | ')

const point = ({ x, z }: { x: number, z: number }) => `{ x: ${x}, z: ${z} }`

// The road layout as the TypeScript source file the game reads.
export function roadsSource(roads: readonly StarterRoadLayout[]) {
  const body = roads.map((road) => [
    '  {',
    `    id: '${road.id}',`,
    `    name: ${JSON.stringify(road.name).replaceAll('\'', '\\\'').replace(/^"|"$/g, '\'')},`,
    `    kind: '${road.kind}',`,
    `    points: [${road.points.map(point).join(', ')}],`,
    `    bends: [${road.bends.join(', ')}],`,
    ...(road.maxGrade ? [`    maxGrade: [${road.maxGrade.map((grade) => grade ?? 'null').join(', ')}],`] : []),
    '  },',
  ].join('\n')).join('\n')
  return `// Generated by the Workbench road designer (workbench.html#road-designer).
// Edit the roads there and save; hand edits are overwritten on the next save.
// Each road runs through its dots; a stretch's bend moves its middle sideways in metres
// (+ left of travel). \`maxGrade\` optionally overrides the kind's grade limit per stretch.

export interface StarterRoadLayout {
  id: string
  name: string
  kind: ${kindUnion}
  points: readonly { x: number, z: number }[]
  bends: readonly number[]
  maxGrade?: readonly (number | null)[]
}

export const starterRoads: readonly StarterRoadLayout[] = [${roads.length ? `\n${body}\n` : ''}]
`
}
