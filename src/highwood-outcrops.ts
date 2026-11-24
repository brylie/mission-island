import { graniteOutcropShape as shape } from './assets/geometry/granite-outcrops.ts'
import { highwoodGroundFinish, starterShoreFinish } from './assets/geometry/starter-landscape.ts'
import { highwoodHeightmap } from './assets/geometry/highwood-heightmap.ts'
import type { TreeTemplateOptions } from './assets/trees/tree-catalog.ts'
import { treeCollision } from './assets/trees/tree-collision.ts'
import { fbm } from './math/gradient-noise.ts'
import { seededRandom } from './seeded-random.ts'
import { groundHeight, originalCoastRadius, waterLevel } from './terrain.ts'
import type { Point } from './world.ts'
import { authoredShare } from './worlds/starter/generation/protection.ts'
import { clearOfRoutes, inSightline } from './worlds/starter/highwood-clearings.ts'
import { highwoodPlanting, plantTemplateOptions } from './worlds/starter/highwood-planting.ts'
import { highwoodOutcropPlacement as placement } from './worlds/starter/layout/highwood-outcrops.ts'
import { highwoodAuthoredLimit } from './worlds/starter/layout/highwood-planting.ts'
import { highwoodGeneration, highwoodPlaces } from './worlds/starter/layout/island-generation.ts'
import { starterRoads } from './worlds/starter/layout/roads.ts'

// Highwood's granite outcrops and the clitter boulders below them, worked out once
// from the terrain, so the host's walking solids and every screen's meshes agree.
// Outcrops stand where the ground shader draws bedrock, and on granite crests.

export interface GraniteSlab {
  // Offset of the slab's centre from the rock's, and its base above the rock's base.
  dx: number
  dz: number
  base: number
  width: number
  length: number
  height: number
  // Turn about the vertical: the long side runs along (cos heading, sin heading).
  heading: number
}

export interface GraniteRock extends Point {
  kind: 'outcrop' | 'clitter'
  // The ground the slabs stand from: for an outcrop, part way up the slope under it,
  // so the uphill side is buried and the downhill face stands a little taller.
  ground: number
  slabs: GraniteSlab[]
  // How far the farthest slab corner reaches from the centre, and the rock's highest point.
  reach: number
  top: number
  // A per-rock number from 0 to 1 for colour.
  tone: number
  // For clitter, the outcrop it fell from.
  source?: GraniteRock
}

const half = 0.5
const square = 2
const noiseRange = 0.7
const { rock } = highwoodGroundFinish
const { granite } = starterShoreFinish
// Joints, and so the long side of each block, follow Cairn Summit's granite core.
const [cairnCore] = highwoodGeneration.uplift.cores
const grain = Math.atan2(cairnCore.to.z - cairnCore.from.z, cairnCore.to.x - cairnCore.from.x)
// The summit spur ends at the turning pad by Cairn Summit.
const summitPad = starterRoads.find((road) => road.id === 'summit-spur')?.points.at(-1) ?? highwoodPlaces.cairnCrown
const rectangleCorners = [[1, 1], [-1, 1], [-1, -1], [1, -1]] as const

const ramp = (value: number, start: number, full: number) => Math.max(0, Math.min(1, (value - start) / (full - start)))
const between = (random: () => number, [least, most]: readonly [number, number]) => least + random() * (most - least)

function gradient({ x, z }: Point) {
  const span = placement.slopeSpanM
  return {
    x: (groundHeight({ x: x + span, z }) - groundHeight({ x: x - span, z })) / (span + span),
    z: (groundHeight({ x, z: z + span }) - groundHeight({ x, z: z - span })) / (span + span),
  }
}

// How bare the rock is here, as the terrain tiles reckon it, times how much is granite.
function bedrockAt(point: Point) {
  const height = groundHeight(point)
  if (height <= granite.heightStart) return 0
  const slope = gradient(point)
  return rock.cover * ramp(Math.hypot(slope.x, slope.z), rock.slopeStart, rock.slopeFull) * ramp(height, granite.heightStart, granite.heightFull)
}

// The corners of a slab's footprint, in world x and z.
export function slabCorners(at: Point, slab: GraniteSlab): Point[] {
  const cos = Math.cos(slab.heading), sin = Math.sin(slab.heading)
  return rectangleCorners.map(([u, v]) => {
    const along = u * slab.length * half, across = v * slab.width * half
    return { x: at.x + slab.dx + along * cos - across * sin, z: at.z + slab.dz + along * sin + across * cos }
  })
}

function reachOf(slabs: GraniteSlab[]) {
  return Math.max(...slabs.map((slab) => Math.hypot(slab.dx, slab.dz) + Math.hypot(slab.length, slab.width) * half))
}

function onHighwood(point: Point) {
  return groundHeight(point) > waterLevel && authoredShare(point, originalCoastRadius(point)) < highwoodAuthoredLimit
}

const compassPoints = 8
// An outcrop on a crest: full granite, near the highest ground round it. (Real tors are
// larger and fewer; see docs/field-guide/places/granite-uplands.md.)
function onCrest(point: Point) {
  const { crest } = placement
  const height = groundHeight(point)
  if (height < granite.heightFull) return false
  for (let k = 0; k < compassPoints; k++) {
    const a = k / compassPoints * Math.PI * square
    if (groundHeight({ x: point.x + Math.cos(a) * crest.radiusM, z: point.z + Math.sin(a) * crest.radiusM }) > height + crest.toleranceM) return false
  }
  return true
}

// Tree trunks and every metre along fallen logs, in a grid, so rocks don't stand on wood.
const woodCellM = 8
function woodGrid() {
  const grid = new Map<string, Point[]>()
  const add = (point: Point) => {
    const key = `${Math.floor(point.x / woodCellM)},${Math.floor(point.z / woodCellM)}`
    grid.set(key, [...grid.get(key) ?? [], point])
  }
  for (const plant of highwoodPlanting()) {
    if (plant.layer === 'understory') continue
    const collision = treeCollision(plantTemplateOptions(plant, 'near') as TreeTemplateOptions)
    if (collision.shape !== 'lying') {
      add(plant)
      continue
    }
    // A lying log runs along (cos heading, -sin heading) from its root.
    const length = collision.length * plant.scale
    for (let along = 0; along <= length; along++) add({ x: plant.x + Math.cos(plant.heading) * along, z: plant.z - Math.sin(plant.heading) * along })
  }
  return grid
}

function clearOf(point: Point, reach: number, wood: Map<string, Point[]>, placed: GraniteRock[]) {
  const crown = highwoodPlaces.cairnCrown
  if (Math.hypot(point.x - crown.x, point.z - crown.z) < placement.keepClear.crownM + reach) return false
  if (Math.hypot(point.x - summitPad.x, point.z - summitPad.z) < placement.keepClear.padM + reach) return false
  // Rocks stay out of the kept-open sight lines, as the canopy does, and off routes.
  if (inSightline(point, reach)) return false
  if (!clearOfRoutes(point, placement.routeClearanceM + reach)) return false
  const i = Math.floor(point.x / woodCellM), j = Math.floor(point.z / woodCellM), span = Math.ceil((reach + placement.trunkClearanceM) / woodCellM)
  for (let di = -span; di <= span; di++) {
    for (let dj = -span; dj <= span; dj++) {
      for (const log of wood.get(`${i + di},${j + dj}`) ?? []) {
        if (Math.hypot(log.x - point.x, log.z - point.z) < reach + placement.trunkClearanceM) return false
      }
    }
  }
  return placed.every((other) => Math.hypot(other.x - point.x, other.z - point.z) > other.reach + reach + placement.gapM)
}

// How a stack is built: crest outcrops follow the shape table; a steep face's crag uses its own
// longer blocks, only a little smaller up the stack. `intoSlope` sets each upper slab back
// into the hill (across the slab, toward its uphill side) rather than in a random direction.
interface StackForm {
  widthM: readonly [number, number]
  lengthRatio: readonly [number, number]
  shrink: readonly [number, number]
  slip: readonly [number, number]
  twistRad: number
  intoSlope?: boolean
}

function slabStack(random: () => number, count: number, heading: number, form: StackForm) {
  const { outcrop } = shape
  const slabs: GraniteSlab[] = []
  let width = Math.min(between(random, form.widthM), count > 1 ? Infinity : outcrop.loneWidthM)
  let length = width * between(random, form.lengthRatio)
  let base = 0, dx = 0, dz = 0
  for (let k = 0; k < count; k++) {
    const height = between(random, outcrop.slabHeightM)
    slabs.push({ dx, dz, base, width, length, height, heading: heading + (random() - half) * (form.twistRad + form.twistRad) })
    base += height
    const shrink = between(random, form.shrink)
    const nextWidth = width * shrink, nextLength = length * shrink
    // The slip, in the slab's own frame: u along its length, v across it (+v is downhill
    // on a steep face). The upper slab never overhangs the one below, except into the slope,
    // where the rising ground meets it, so no block reads as a roofed box.
    const slip = between(random, form.slip) * width
    const angle = form.intoSlope ? Math.PI * (half + half + half) + (random() - half) : random() * Math.PI * square
    const roomU = (length - nextLength) * half, roomV = (width - nextWidth) * half
    const u = Math.max(-roomU, Math.min(roomU, Math.cos(angle) * slip))
    const v = Math.max(form.intoSlope ? -Infinity : -roomV, Math.min(roomV, Math.sin(angle) * slip))
    const turn = slabs[k].heading
    dx += u * Math.cos(turn) - v * Math.sin(turn)
    dz += u * Math.sin(turn) + v * Math.cos(turn)
    width = nextWidth
    length = nextLength
  }
  return slabs
}

// An outcrop, or undefined where the slope under it is too steep for its stack.
function outcropAt(point: Point, random: () => number, slabRange: readonly [number, number], crest: boolean): GraniteRock | undefined {
  // A crest outcrop's blocks follow the joint grain. On a steep face a crag's blocks lie along
  // the contour, long and low, any block above set off along the contour or into the slope,
  // never centred, so it reads as bedrock stepping out of the face, not a built cairn.
  const fall = gradient(point), steep = !crest && Math.hypot(fall.x, fall.z) > rock.slopeFull
  const range = steep ? placement.steep.slabs : slabRange
  const count = Math.max(range[0], Math.round(between(random, [range[0] - half, range[1] + half])))
  const uphill = Math.atan2(fall.z, fall.x)
  const heading = crest ? grain : uphill + Math.PI * half
  const form: StackForm = steep
    ? { ...placement.steep, intoSlope: true }
    : { ...shape.outcrop, slip: [0, shape.outcrop.slip] }
  const slabs = slabStack(random, count, heading, form)
  const [foot] = slabs
  const grounds = [point, ...slabCorners(point, foot)].map(groundHeight)
  const low = Math.min(...grounds), high = Math.max(...grounds)
  // Part way up the slope, but never so low that the uphill corner is buried.
  const ground = Math.max(low + (high - low) * shape.standShare, high - foot.height * (1 - shape.shoulder.outcrop))
  const stack = slabs.reduce((sum, slab) => sum + slab.height, 0)
  if (ground - low > stack * (steep ? placement.steep.faceRatio : placement.faceRatio)) return undefined
  const top = ground + stack
  return { ...point, kind: 'outcrop', ground, slabs, reach: reachOf(slabs), top, tone: random() }
}

// Clitter slides downhill until the ground is gentle enough for a loose block to rest.
function restingPlace(start: Point) {
  const { clitter } = placement
  let spot = start
  for (let moved = 0; moved < clitter.slideMaxM; moved += clitter.slideStepM) {
    const fall = gradient(spot), steep = Math.hypot(fall.x, fall.z)
    if (steep <= clitter.reposeSlope) return spot
    spot = { x: spot.x - fall.x / steep * clitter.slideStepM, z: spot.z - fall.z / steep * clitter.slideStepM }
  }
  return undefined
}

function clitterAt(point: Point, random: () => number): GraniteRock {
  const { clitter } = shape
  const width = between(random, clitter.widthM), length = width * between(random, clitter.lengthRatio)
  const height = width * between(random, clitter.heightRatio)
  const slabs = [{ dx: 0, dz: 0, base: 0, width, length, height, heading: random() * Math.PI }]
  // A boulder settles into the ground at its centre.
  const ground = groundHeight(point)
  return { ...point, kind: 'clitter', ground, slabs, reach: reachOf(slabs), top: ground + height, tone: random() }
}

function placeRocks() {
  const random = seededRandom(placement.seed)
  const wood = woodGrid()
  const placed: GraniteRock[] = []
  const map = highwoodHeightmap
  const east = map.west + (map.columns - 1) * map.cell, north = map.south + (map.rows - 1) * map.cell
  const { cellM, jitter, cluster, clitter } = placement
  for (let z = map.south + cellM * half; z < north; z += cellM) {
    for (let x = map.west + cellM * half; x < east; x += cellM) {
      // Draw every roll up front, so one candidate's checks never shift the next one's numbers.
      const point = { x: x + (random() - half) * jitter * cellM, z: z + (random() - half) * jitter * cellM }
      const roll = random(), seed = random()
      const bedrock = bedrockAt(point)
      const crest = bedrock < placement.bedrockFrom && onCrest(point)
      if ((bedrock < placement.bedrockFrom && !crest) || !onHighwood(point)) continue
      const grouping = ramp((fbm(point.x, point.z, placement.seed, cluster) / noiseRange + 1) * half, cluster.from, cluster.full)
      const chance = crest ? placement.crest.chance : placement.outcropChance * ramp(bedrock, placement.bedrockFrom, placement.bedrockFull) * grouping
      if (roll >= chance) continue
      const own = seededRandom(Math.floor(seed * placement.streamSeeds))
      const crag = outcropAt(point, own, crest ? placement.crest.slabs : shape.outcrop.slabs, crest)
      if (!crag || !clearOf(crag, crag.reach, wood, placed)) continue
      placed.push(crag)
      // Clitter: blocks the frost prised off, fallen below the outcrop.
      const fall = gradient(crag), downhill = Math.atan2(-fall.z, -fall.x)
      const count = Math.floor(between(own, [clitter.min, clitter.max + 1]))
      for (let k = 0; k < count; k++) {
        const angle = downhill + (own() - half) * (clitter.spreadRad + clitter.spreadRad)
        const reach = crag.reach + between(own, [clitter.nearM, clitter.farM])
        const spot = restingPlace({ x: crag.x + Math.cos(angle) * reach, z: crag.z + Math.sin(angle) * reach })
        const boulder = spot && { ...clitterAt(spot, own), source: crag }
        // A block that came to rest no lower than its outcrop would have had to roll uphill.
        if (boulder && boulder.ground < crag.ground && onHighwood(boulder) && clearOf(boulder, boulder.reach, wood, placed)) placed.push(boulder)
      }
    }
  }
  return placed
}

let rocks: readonly GraniteRock[] | undefined

// Highwood's outcrops and clitter, worked out on first use.
export function highwoodGraniteRocks(): readonly GraniteRock[] {
  rocks ??= placeRocks()
  return rocks
}
