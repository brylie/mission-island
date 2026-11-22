import { smoothstep as smooth } from '../math/smoothstep.ts'
import { cemeteryApproachGrade, coastline, picnicShelf, reedwater, tarnstep, terrainJunctions, upland } from '../worlds/saltwind/layout/terrain.ts'
import { accessLanes, ferryTrack, fishingPier, islandLoop, routes } from './routes.ts'
import type { RoadSample, Route } from './routes.ts'
import { landBounds, lowerLake, picnicLedge, pavedYards, roundYards, runway, seaLevel, sites, tarn, wadeDepth, waterBounds } from './sites.ts'
import type { MapPoint } from './sites.ts'

export const gridStep = 2.5
const { minX, maxX, minZ, maxZ } = waterBounds
export const cols = (maxX - minX) / gridStep + 1
export const rows = (maxZ - minZ) / gridStep + 1

const quadraticPower = 2
const halves = 2
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const clamp = (v: number) => Math.min(1, Math.max(0, v))
const radius = (x: number, z: number, cx: number, cz: number, rx: number, rz: number) => Math.hypot((x - cx) / rx, (z - cz) / rz)
const mound = (x: number, z: number, landform: typeof upland.mounds[number]) =>
  landform.height * Math.max(0, 1 - radius(x, z, landform.x, landform.z, landform.radiusX, landform.radiusZ) ** quadraticPower) ** quadraticPower

export function shoreDistance(x: number, z: number) {
  const { radiusX, radiusZ, broadSwell, headlands, coves, ferryBay } = coastline
  const u = x / radiusX, v = z / radiusZ
  const angle = Math.atan2(v, u)
  const coast = 1 + broadSwell.amplitude * Math.sin(broadSwell.frequency * angle + broadSwell.phase)
    + headlands.amplitude * Math.cos(headlands.frequency * angle - headlands.phase) + coves.amplitude * Math.sin(coves.frequency * angle)
  const bay = ferryBay.depth * Math.exp(-(((x - ferryBay.x) / ferryBay.radiusX) ** quadraticPower + ((z - ferryBay.z) / ferryBay.radiusZ) ** quadraticPower))
  return (coast - Math.hypot(u, v)) * coastline.distanceScale - bay
}

export function riverZ(x: number) {
  const { baseZ, slope, bendOriginX, bendSize, bendFrequency } = reedwater.centreline
  return baseZ + slope * x + bendSize * Math.sin((x - bendOriginX) * bendFrequency)
}

export function riverY(x: number) {
  return Math.max(0, Math.min(lowerLake.y, (x - reedwater.waterGrade.originX) * reedwater.waterGrade.slope))
}

export function fallsX(z: number) {
  const { baseX, bendOriginZ, bendSize, bendFrequency } = tarnstep.centreline
  return baseX + bendSize * Math.sin((z - bendOriginZ) * bendFrequency)
}
export function fallsWidth(z: number) {
  const { base, lowerRipple, upperRipple } = tarnstep.halfWidth
  return base + lowerRipple.size * Math.cos((z - lowerRipple.originZ) * lowerRipple.frequency) + upperRipple.size * Math.sin(z * upperRipple.frequency)
}
export function fallsY(z: number) {
  let height = lowerLake.y
  for (const rise of tarnstep.rises) height += rise.height * smooth((z - rise.startZ) / rise.length)
  return height
}

export function waterHeight(x: number, z: number) {
  if (radius(x, z, tarn.x, tarn.z, tarn.rx, tarn.rz) <= 1) return tarn.y
  if (radius(x, z, lowerLake.x, lowerLake.z, lowerLake.rx, lowerLake.rz) <= 1) return lowerLake.y
  if (z >= tarnstep.waterMinZ && z <= tarnstep.waterMaxZ && Math.abs(x - fallsX(z)) <= fallsWidth(z)) return fallsY(z)
  if (x <= reedwater.lakeEndX && x > reedwater.waterStartX && Math.abs(z - riverZ(x)) <= reedwater.halfWidth) return riverY(x)
  return seaLevel
}

export function bridgeAt(route: Route, point: MapPoint) {
  const { viaduct } = tarnstep
  return route.crossings && ((point.x < reedwater.bridges.eastLimitX && Math.abs(point.z - riverZ(point.x)) < reedwater.bridges.halfWidth)
    || (Math.abs(point.z - viaduct.z) < viaduct.crossingReach && Math.abs(point.x - fallsX(point.z)) < viaduct.crossingReach))
}

interface Segment { route: Route, a: RoadSample, b: RoadSample }
const roadIndexCellSize = 25
const roadIndexOrigin = 32
const roadIndexStride = 128
const roadIndexPadding = 16
const roadIndex = new Map<number, Segment[]>()
const key = (ix: number, iz: number) => (ix + roadIndexOrigin) * roadIndexStride + iz + roadIndexOrigin
for (const route of [...routes, ferryTrack, fishingPier]) {
  for (let i = 1; i < route.samples.length; i++) {
    const a = route.samples[i - 1], b = route.samples[i]
    const segment = { route, a, b }
    const reach = route.width / halves + roadIndexPadding
    for (let ix = Math.floor((Math.min(a.x, b.x) - reach) / roadIndexCellSize); ix <= Math.floor((Math.max(a.x, b.x) + reach) / roadIndexCellSize); ix++) {
      for (let iz = Math.floor((Math.min(a.z, b.z) - reach) / roadIndexCellSize); iz <= Math.floor((Math.max(a.z, b.z) + reach) / roadIndexCellSize); iz++) {
        const cell = key(ix, iz)
        const segments = roadIndex.get(cell) ?? []
        segments.push(segment)
        roadIndex.set(cell, segments)
      }
    }
  }
}

export function nearestRoad(x: number, z: number, landOnly = false, exclude?: Route, only?: Route) {
  let distanceSquared = Infinity, y = 0, road: Route | undefined
  for (const { route, a, b } of roadIndex.get(key(Math.floor(x / roadIndexCellSize), Math.floor(z / roadIndexCellSize))) ?? []) {
    if ((only && route !== only) || route === exclude || (landOnly && ((route === ferryTrack || route === fishingPier) || bridgeAt(route, a) || bridgeAt(route, b)))) continue
    const dx = b.x - a.x, dz = b.z - a.z
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz))
    const distance = (x - mix(a.x, b.x, t)) ** quadraticPower + (z - mix(a.z, b.z, t)) ** quadraticPower
    if (distance >= distanceSquared) continue
    distanceSquared = distance
    road = route
    y = mix(a.y, b.y, t)
  }
  return { road, distance: Math.sqrt(distanceSquared), y }
}

const airfieldGradingHalfWidth = 16

export function airfieldDistance(x: number, z: number) {
  return Math.max(Math.abs(x - runway.x) - runway.length / halves - runway.approach, Math.abs(z - runway.z) - airfieldGradingHalfWidth)
}

export function siteDistance(x: number, z: number, site: typeof sites[number]) {
  return Math.max(Math.abs(x - site.x) - site.width / halves, Math.abs(z - site.z) - site.depth / halves)
}

const junctionGradeReach = 11
const junctionBlendStart = 3.6
const junctionBlendWidth = 6.4

function junctionGrade(x: number, z: number, height: number, route: Route) {
  if (accessLanes.includes(route)) {
    const main = nearestRoad(x, z, false, undefined, islandLoop)
    if (main.distance < junctionGradeReach) return mix(main.y, height, smooth((main.distance - junctionBlendStart) / junctionBlendWidth))
  }
  for (const junction of terrainJunctions) {
    const dx = x - junction.x, dz = z - junction.z
    const distance = Math.hypot(dx, dz)
    if (distance < junction.reach) {
      const grade = junction.y + junction.xSlope * dx + junction.zSlope * dz
      return mix(grade, height, smooth((distance - junction.blendStart) / junction.blendWidth))
    }
  }
  return height
}

const siteGradeBlend = 16
const runwayGradeBlend = 19
const runwayShoreBlend = 13

function landformHeight(x: number, z: number, coast: number) {
  const { shoreRise, seaFloor, meadow } = upland
  const inland = smooth(coast / upland.inlandBlendDistance)
  let height = Math.max(seaFloor.minimumY, coast * seaFloor.slope)
  if (coast > 0) {
    let interior = meadow.height + meadow.rippleHeight * Math.sin(x * meadow.sineX + z * meadow.sineZ) * Math.cos(z * meadow.cosineZ)
    for (const landform of upland.mounds) interior += mound(x, z, landform)
    height = shoreRise.height * smooth(coast / shoreRise.distance) + inland * interior
  }
  for (const site of sites) {
    const distance = siteDistance(x, z, site)
    if (distance < siteGradeBlend) height = mix(site.y, height, smooth(distance / siteGradeBlend))
  }
  return mix(height, runway.y, (1 - smooth(airfieldDistance(x, z) / runwayGradeBlend)) * smooth(coast / runwayShoreBlend))
}

const lakeBankReach = 1.37
const lakeBankSlope = 14
const lakeBankBlend = 0.37

function shapeWatercourses(x: number, z: number, landform: number) {
  let height = landform
  const { halfWidth, lakeEndX, cutStartX, bank: riverBank, lakeInlet } = reedwater
  if (x < lakeEndX && x > cutStartX) {
    const distance = Math.abs(z - riverZ(x))
    const base = riverY(x) + (distance - halfWidth) * riverBank.slope
    if (distance < riverBank.reach) height = Math.min(height, mix(base, height, smooth((distance - riverBank.blendStart) / riverBank.blendWidth)))
  }
  for (const lake of [lowerLake, tarn]) {
    const r = radius(x, z, lake.x, lake.z, lake.rx, lake.rz)
    if (r < lakeBankReach) height = mix(lake.y + (r - 1) * lakeBankSlope, height, smooth((r - 1) / lakeBankBlend))
  }
  if (x < lakeEndX && x > lakeInlet.startX && Math.abs(z - riverZ(x)) < lakeInlet.reach) {
    const distance = Math.abs(z - riverZ(x))
    height = Math.min(height, mix(riverY(x) + (distance - halfWidth) * riverBank.slope, height, smooth((distance - lakeInlet.blendStart) / lakeInlet.blendWidth)))
  }
  if (z >= tarnstep.cutMinZ && z <= tarnstep.waterMaxZ) {
    const { bank } = tarnstep
    const distance = Math.abs(x - fallsX(z))
    const edge = distance - fallsWidth(z)
    const spread = bank.width + bank.widening * smooth((z - bank.wideningStartZ) / bank.wideningLength)
    if (edge < spread) height = mix(fallsY(z) + edge * bank.slope, height, smooth(edge / spread))
  }
  return height
}

const roadShoulderWidth = 4
const landShoulderBlend = 11
const raisedDeckShoulderWidth = 4
const raisedDeckBlend = 7
const raisedDeckGroundGap = 0.16
const yardEdgeReach = 5
const yardEdgeBlendStart = 1
const yardEdgeBlendWidth = 4
const yardRoadGap = 2
const pavedYardGroundGap = 0.08
const roundYardGroundGap = 0.10

function gradeRoadsAndYards(x: number, z: number, ungraded: number) {
  let height = ungraded
  const nearest = nearestRoad(x, z, true)
  if (nearest.road) {
    const shoulder = nearest.distance - nearest.road.width / halves - roadShoulderWidth
    const grade = junctionGrade(x, z, nearest.y, nearest.road)
    height = mix(grade, height, smooth(shoulder / landShoulderBlend))
  }
  if (z >= tarnstep.waterMinZ && z <= tarnstep.waterMaxZ) {
    // Leave the watercourse open underneath the viaduct and its shoulders.
    const distance = Math.abs(x - fallsX(z))
    height = mix(ungraded, height, smooth((distance - tarnstep.viaduct.openHalfWidth) / tarnstep.viaduct.shoulderBlend))
  }
  const deck = nearestRoad(x, z)
  if (deck.road && (bridgeAt(deck.road, { x, z }) || deck.road === ferryTrack || deck.road === fishingPier)) {
    const blend = smooth((deck.distance - deck.road.width / halves - raisedDeckShoulderWidth) / raisedDeckBlend)
    height = mix(Math.min(height, deck.y - raisedDeckGroundGap), height, blend)
  }
  for (const pad of pavedYards) {
    const edge = Math.max(Math.abs(x - pad.x) - pad.width / halves, Math.abs(z - pad.z) - pad.depth / halves)
    if (edge < yardEdgeReach && nearest.distance > (nearest.road?.width ?? 0) / halves + yardRoadGap) {
      height = mix(Math.min(height, pad.y - pavedYardGroundGap), height, smooth((edge - yardEdgeBlendStart) / yardEdgeBlendWidth))
    }
  }
  for (const pad of roundYards) {
    const edge = Math.hypot(x - pad.x, z - pad.z) - pad.radius
    if (edge < yardEdgeReach) height = mix(Math.min(height, pad.y - roundYardGroundGap), height, smooth((edge - yardEdgeBlendStart) / yardEdgeBlendWidth))
  }
  return height
}

function terrainShape(x: number, z: number) {
  const coast = shoreDistance(x, z)
  const landform = landformHeight(x, z, coast)
  let height = gradeRoadsAndYards(x, z, shapeWatercourses(x, z, landform))
  // An exposed bed of slate forms a level picnic shelf above the steeper shore.
  const ledge = radius(x, z, picnicLedge.x, picnicLedge.z, picnicShelf.radiusX, picnicShelf.radiusZ)
  if (ledge < picnicShelf.reach) height = mix(picnicShelf.y + picnicShelf.zSlope * (z - picnicLedge.z), height, smooth((ledge - picnicShelf.blendStart) / picnicShelf.blendWidth))
  // Carry the cemetery walk across the hollow between its two graded pads.
  const approach = cemeteryApproachGrade
  if (z > approach.minZ && z < approach.maxZ && Math.abs(x - approach.x) < approach.halfWidth) {
    const t = clamp((z - approach.riseStartZ) / approach.riseLength)
    const grade = mix(approach.lowY, approach.highY, t)
    const blend = (1 - smooth((Math.abs(x - approach.x) - approach.levelHalfWidth) / approach.sideBlend))
      * smooth((z - approach.minZ) / approach.endBlend) * smooth((approach.maxZ - z) / approach.endBlend)
    height = mix(height, grade, blend)
  }
  return height
}

let grid: Float32Array | undefined
export function heightGrid() {
  if (!grid) {
    grid = new Float32Array(rows * cols)
    for (let iz = 0; iz < rows; iz++) for (let ix = 0; ix < cols; ix++) {
      grid[iz * cols + ix] = terrainShape(minX + ix * gridStep, minZ + iz * gridStep)
    }
  }
  return grid
}

const gridCornersPerAxis = 2

// The diagonal and interpolants match the rendered grid triangles exactly.
export function groundHeight(x: number, z: number) {
  const gx = Math.max(0, Math.min(cols - 1, (x - minX) / gridStep))
  const gz = Math.max(0, Math.min(rows - 1, (z - minZ) / gridStep))
  const ix = Math.min(cols - gridCornersPerAxis, Math.floor(gx)), iz = Math.min(rows - gridCornersPerAxis, Math.floor(gz))
  const u = gx - ix, v = gz - iz, i = iz * cols + ix
  const heights = heightGrid()
  const a = heights[i], b = heights[i + 1], c = heights[i + cols], d = heights[i + cols + 1]
  return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v)
}

const deckLift = 0.13
const deckGroundClearance = 0.095
const accessLaneStack = 0.02
const routeStackStep = 0.009
export function deckPoint(p: RoadSample, offset: number, route: Route) {
  const x = p.x + Math.cos(p.yaw) * offset, z = p.z - Math.sin(p.yaw) * offset
  const ground = groundHeight(x, z)
  const design = junctionGrade(x, z, p.y, route)
  const stack = accessLanes.includes(route) ? accessLaneStack : Math.max(0, routes.indexOf(route)) * routeStackStep
  return { x, z, y: Math.max(design + deckLift, ground + deckGroundClearance) + stack }
}

type DeckPoint = ReturnType<typeof deckPoint>
const deckSections = new WeakMap<RoadSample, [DeckPoint, DeckPoint, DeckPoint]>()
export function deckSection(sample: RoadSample, route: Route) {
  const stored = deckSections.get(sample)
  if (stored) return stored
  const w = route.width / halves
  const section: [DeckPoint, DeckPoint, DeckPoint] = [deckPoint(sample, -w, route), deckPoint(sample, 0, route), deckPoint(sample, w, route)]
  deckSections.set(sample, section)
  return section
}

const deckEdgeTolerance = 1e-6

function triangleHeight(point: MapPoint, a: ReturnType<typeof deckPoint>, b: typeof a, c: typeof a) {
  const area = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z)
  const u = ((b.z - c.z) * (point.x - c.x) + (c.x - b.x) * (point.z - c.z)) / area
  const v = ((c.z - a.z) * (point.x - c.x) + (a.x - c.x) * (point.z - c.z)) / area
  return u >= -deckEdgeTolerance && v >= -deckEdgeTolerance && u + v <= 1 + deckEdgeTolerance ? u * a.y + v * b.y + (1 - u - v) * c.y : -Infinity
}

const deckSegmentSearchReach = 7

export function surfaceHeight(x: number, z: number, maxDeck = Infinity) {
  let height = groundHeight(x, z)
  const point = { x, z }
  for (const { route, a, b } of roadIndex.get(key(Math.floor(x / roadIndexCellSize), Math.floor(z / roadIndexCellSize))) ?? []) {
    if (Math.abs(a.x - x) > deckSegmentSearchReach || Math.abs(a.z - z) > deckSegmentSearchReach) continue
    const first = deckSection(a, route), next = deckSection(b, route)
    for (const lane of [0, 1]) {
      const deck = Math.max(triangleHeight(point, first[lane], first[lane + 1], next[lane]), triangleHeight(point, first[lane + 1], next[lane + 1], next[lane]))
      if (deck <= maxDeck) height = Math.max(height, deck)
    }
  }
  for (const pad of pavedYards) if (Math.abs(x - pad.x) <= pad.width / halves && Math.abs(z - pad.z) <= pad.depth / halves) height = Math.max(height, pad.y)
  for (const pad of roundYards) if (Math.hypot(x - pad.x, z - pad.z) <= pad.radius) height = Math.max(height, pad.y)
  return height
}

function waterDepth(x: number, z: number) {
  return Math.max(0, waterHeight(x, z) - groundHeight(x, z))
}

const boatDraft = 0.70

export function shoreAccess(x: number, z: number) {
  const depth = waterDepth(x, z)
  return { depth, wade: depth > 0 && depth <= wadeDepth, boat: depth >= boatDraft && waterHeight(x, z) === seaLevel }
}

const dryLandSurveyStep = 2
const squareMetresPerSquareKm = 1e6

export function dryLandKm2(step = dryLandSurveyStep) {
  let dry = 0
  for (let z = landBounds.minZ + step / halves; z < landBounds.maxZ; z += step) {
    for (let x = landBounds.minX + step / halves; x < landBounds.maxX; x += step) {
      if (groundHeight(x, z) > waterHeight(x, z)) dry++
    }
  }
  return dry * step * step / squareMetresPerSquareKm
}
