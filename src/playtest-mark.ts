// Playtest marks: a tester looks at something on the island, presses M, and the dev server saves
// a screenshot with what the reticle was on and where, so a code agent can open the same thing.
// This module has no browser or Node imports; the game page, the server and the tests share it.

export const playtestMarkPath = '/api/playtest-mark'
export const playtestMarkVersion = 1
// Each of the two notes: what is wrong, and what the tester expected or wants.
const noteChars = 2000
// A JPEG of a large window plus the record.
const bodyBytes = 8_000_000
const recordBytes = 200_000
const slugChars = 48
export const markLimits = { noteChars, bodyBytes, recordBytes, slugChars }
// How far from the picked point authored layout entries count as nearby, and how many to list.
const nearbyRadiusM = 15
const nearbyLimit = 8
// Layout objects nest exports inside exports; deeper than this is data, not places.
const maximumDepth = 6
const coordinateDecimals = 2

// A merged batch keeps its source parts in merge order; `faces` is how many triangles each one adds.
export interface MergedPart { name: string, parents: string[], faces: number }
type Point2 = { x: number, z: number }
type Point3 = { x: number, y: number, z: number }

// What the reticle was on when the mark was made.
export interface MarkTarget {
  point: Point3
  distance: number
  mesh: string
  parents: string[]
  material?: string
  // For a merged scenery batch, the part the point belongs to.
  part?: { name: string, parents: string[] }
  thinInstance?: number
  metadata?: Record<string, unknown>
}

export interface MarkNotes {
  wrong: string
  wanted: string
}

const round = (value: number) => Number(value.toFixed(coordinateDecimals))
export const roundPoint = (point: Point3) => ({ x: round(point.x), y: round(point.y), z: round(point.z) })

// Which part of a merged batch a picked triangle came from. Merging appends each source's
// triangles in order, so the picked face index falls in exactly one part's range.
export function partAt(parts: readonly MergedPart[], faceId: number) {
  let first = 0
  for (const part of parts) {
    if (faceId >= first && faceId < first + part.faces) return part
    first += part.faces
  }
}

export interface AuthoredEntry {
  // The layout file and the export path inside it, such as `places.ts` and `crewHomes[1]`.
  source: string
  path: string
  name?: string
  x: number
  z: number
  distance: number
}

// Layout files mix map points with offsets from another point. Offsets named `…Offset` are skipped,
// and these, which predate that convention, are listed so a mark never reports them as places.
// The shader sites listed here are added to an anchor by `beside()` in interactive-shaders/catalog.ts.
const relativePoints = new Set([
  'ridgeCourseLayout.rack',
  'ridgeCourseLayout.windsock',
  'ridgeCourseLayout.landingSign',
  'starterEffectSites.jobBoardLantern',
  ...['caustics', 'poolRain', 'canopy', 'reeds', 'flowers', 'awning', 'embers', 'pollen'].map((site) => `starterShaderSites.${site}`),
])
const isOffset = (path: string) => /offsets?$/i.test(path.split('.').pop() ?? '') || relativePoints.has(path)

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

function ownName(value: Record<string, unknown>) {
  for (const key of ['name', 'label', 'id'] as const) {
    const text = value[key]
    if (typeof text === 'string') return text
  }
}

function visit(value: unknown, path: string, name: string | undefined, depth: number, found: (entry: { path: string, name?: string, x: number, z: number }) => void) {
  if (!isRecord(value) || depth > maximumDepth || isOffset(path)) return
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) visit(item, `${path}[${index}]`, name, depth + 1, found)
    return
  }
  const named = ownName(value) ?? name
  const { x, z } = value
  if (typeof x === 'number' && typeof z === 'number' && Number.isFinite(x) && Number.isFinite(z)) found({ path, ...(named && { name: named }), x, z })
  for (const [key, child] of Object.entries(value)) visit(child, `${path}.${key}`, named, depth + 1, found)
}

// Authored places near a point, found by walking layout modules' exports for anything with an
// `x` and a `z`, taken as map metres. New layout data shows up without a catalog to keep in step.
export function authoredNear(modules: Record<string, Record<string, unknown>>, point: Point2, radius = nearbyRadiusM, limit = nearbyLimit): AuthoredEntry[] {
  const near: AuthoredEntry[] = []
  for (const [source, exports] of Object.entries(modules)) {
    for (const [name, value] of Object.entries(exports)) {
      visit(value, name, undefined, 0, (entry) => {
        const distance = Math.hypot(entry.x - point.x, entry.z - point.z)
        if (distance <= radius) near.push({ source, ...entry, distance: round(distance) })
      })
    }
  }
  return near.sort((a, b) => a.distance - b.distance).slice(0, limit)
}

// A short name for the folder and the log line: lower-case words joined by hyphens.
export function markSlug(text: string) {
  const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, markLimits.slugChars).replace(/-+$/, '')
  return slug || 'mark'
}

// Folders sort by time: `2026-11-26T09-41-03-wren-cottage`.
export function markFolderName(date: Date, label: string) {
  const stamp = date.toISOString().slice(0, 'YYYY-MM-DDTHH:MM:SS'.length).replace(/:/g, '-')
  return `${stamp}-${markSlug(label)}`
}

// The record fields a mark keeps; anything else the page sends is dropped.
const recordFields = ['label', 'version', 'page', 'mode', 'checkpoint', 'target', 'interaction', 'nearby', 'player', 'camera', 'island', 'links'] as const

export interface MarkUpload {
  record: Record<string, unknown> & { label: string }
  notes: MarkNotes
  // Base64 JPEG without the data URL prefix.
  jpeg: string
}

const jpegPrefix = 'data:image/jpeg;base64,'
const base64 = /^[A-Za-z0-9+/]*={0,2}$/

const cleanNote = (value: unknown) => typeof value === 'string' ? value.trim() : undefined

// Checks a mark the game page sent. Returns the reason as text when it is refused.
export function readMarkUpload(body: string): MarkUpload | string {
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  }
  catch {
    return 'The mark is not JSON.'
  }
  if (!isRecord(parsed)) return 'The mark is not an object.'
  const { record, notes, image } = parsed
  if (!isRecord(record) || typeof record.label !== 'string') return 'The mark has no record.'
  if (JSON.stringify(record).length > markLimits.recordBytes) return 'The mark record is too large.'
  if (!isRecord(notes)) return 'The mark has no notes.'
  const wrong = cleanNote(notes.wrong)
  const wanted = cleanNote(notes.wanted)
  if (wrong === undefined || wanted === undefined) return 'Notes must be text.'
  if (wrong.length > markLimits.noteChars || wanted.length > markLimits.noteChars) return `Each note can be up to ${markLimits.noteChars} characters.`
  if (typeof image !== 'string' || !image.startsWith(jpegPrefix)) return 'The screenshot must be a JPEG data URL.'
  const jpeg = image.slice(jpegPrefix.length)
  if (!jpeg || !base64.test(jpeg)) return 'The screenshot is not valid base64.'
  const kept = Object.fromEntries(recordFields.flatMap((key) => key in record ? [[key, record[key]]] : []))
  return { record: { ...kept, label: record.label }, notes: { wrong, wanted }, jpeg }
}

// The upload the game page sends.
export function markBody(record: Record<string, unknown> & { label: string }, notes: MarkNotes, image: string) {
  return JSON.stringify({ record, notes, image })
}
