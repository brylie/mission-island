import { accessLanes, ferryTrack, fishingPier, islandLoop, routes } from './routes.ts'
import type { RoadSample, Route } from './routes.ts'
import { landBounds, lowerLake, picnicLedge, pavedYards, roundYards, runway, seaLevel, sites, tarn, wadeDepth, waterBounds } from './sites.ts'
import type { MapPoint } from './sites.ts'

export const gridStep = 2.5
const { minX, maxX, minZ, maxZ } = waterBounds
export const cols = (maxX - minX) / gridStep + 1
export const rows = (maxZ - minZ) / gridStep + 1

const mix = (a: number, b: number, t: number) => a + (b - a) * t
const clamp = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (v: number) => { const t = clamp(v); return t * t * (3 - 2 * t) }
const radius = (x: number, z: number, cx: number, cz: number, rx: number, rz: number) => Math.hypot((x - cx) / rx, (z - cz) / rz)
const mound = (x: number, z: number, cx: number, cz: number, rx: number, rz: number, height: number) =>
  height * Math.max(0, 1 - radius(x, z, cx, cz, rx, rz) ** 2) ** 2

export function shoreDistance(x: number, z: number) {
  const u = x / 450, v = z / 312
  const angle = Math.atan2(v, u)
  const coast = 1 + 0.061 * Math.sin(3 * angle + 0.8) + 0.041 * Math.cos(5 * angle - 0.6) + 0.022 * Math.sin(9 * angle)
  const ferryBay = 17 * Math.exp(-(((x + 278) / 48) ** 2 + ((z + 251) / 63) ** 2))
  return (coast - Math.hypot(u, v)) * 325 - ferryBay
}

export function riverZ(x: number) {
  return 125 + 0.32 * x + 9 * Math.sin((x + 350) * 0.028)
}

export function riverY(x: number) {
  return Math.max(0, Math.min(lowerLake.y, (x + 440) * 0.0165))
}

export function fallsX(z: number) { return -120 + 5 * Math.sin((z - 186) * 0.065) }
export function fallsWidth(z: number) {
  return 3.2 + .83 * Math.cos((z - 169) * .29) + .48 * Math.sin(z * .51)
}
export function fallsY(z: number) {
  return lowerLake.y + 7.1 * smooth((z - 125) / 30) + 10.8 * smooth((z - 171) / 8.5)
    + 2.4 * smooth((z - 179) / 5) + 12.9 * smooth((z - 184) / 7.5) + 3 * smooth((z - 192) / 5.5)
}

export function waterHeight(x: number, z: number) {
  if (radius(x, z, tarn.x, tarn.z, tarn.rx, tarn.rz) <= 1) return tarn.y
  if (radius(x, z, lowerLake.x, lowerLake.z, lowerLake.rx, lowerLake.rz) <= 1) return lowerLake.y
  if (z >= 123 && z <= 199 && Math.abs(x - fallsX(z)) <= fallsWidth(z)) return fallsY(z)
  if (x <= -87 && x > -465 && Math.abs(z - riverZ(x)) <= 9) return riverY(x)
  return seaLevel
}

export function bridgeAt(route: Route, point: MapPoint) {
  return route.crossings && ((point.x < -132 && Math.abs(point.z - riverZ(point.x)) < 21)
    || (Math.abs(point.z - 153) < 11 && Math.abs(point.x - fallsX(point.z)) < 11))
}

interface Segment { route: Route; a: RoadSample; b: RoadSample }
const indexSize = 25
const roadIndex = new Map<number, Segment[]>()
const key = (ix: number, iz: number) => (ix + 32) * 128 + iz + 32
for (const route of [...routes, ferryTrack, fishingPier]) {
  for (let i = 1; i < route.samples.length; i++) {
    const a = route.samples[i - 1], b = route.samples[i]
    const segment = { route, a, b }
    const reach = route.width / 2 + 16
    for (let ix = Math.floor((Math.min(a.x, b.x) - reach) / indexSize); ix <= Math.floor((Math.max(a.x, b.x) + reach) / indexSize); ix++) {
      for (let iz = Math.floor((Math.min(a.z, b.z) - reach) / indexSize); iz <= Math.floor((Math.max(a.z, b.z) + reach) / indexSize); iz++) {
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
  for (const { route, a, b } of roadIndex.get(key(Math.floor(x / indexSize), Math.floor(z / indexSize))) ?? []) {
    if ((only && route !== only) || route === exclude || (landOnly && ((route === ferryTrack || route === fishingPier) || bridgeAt(route, a) || bridgeAt(route, b)))) continue
    const dx = b.x - a.x, dz = b.z - a.z
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz))
    const distance = (x - mix(a.x, b.x, t)) ** 2 + (z - mix(a.z, b.z, t)) ** 2
    if (distance >= distanceSquared) continue
    distanceSquared = distance
    road = route
    y = mix(a.y, b.y, t)
  }
  return { road, distance: Math.sqrt(distanceSquared), y }
}

export function airfieldDistance(x: number, z: number) {
  return Math.max(Math.abs(x - runway.x) - runway.length / 2 - runway.approach, Math.abs(z - runway.z) - 16)
}

export function siteDistance(x: number, z: number, site: typeof sites[number]) {
  return Math.max(Math.abs(x - site.x) - site.width / 2, Math.abs(z - site.z) - site.depth / 2)
}

function junctionGrade(x: number, z: number, height: number, route: Route) {
  if (accessLanes.includes(route)) {
    const main = nearestRoad(x, z, false, undefined, islandLoop)
    if (main.distance < 11) return mix(main.y, height, smooth((main.distance - 3.6) / 6.4))
  }
  const mill = Math.hypot(x + 259, z - 114)
  if (mill < 22) return mix(28 + .014 * (x + 259) + .036 * (z - 114), height, smooth((mill - 5) / 17))
  const mine = Math.hypot(x - 213, z - 101)
  if (mine < 25) return mix(21 + .016 * (x - 213) + .054 * (z - 101), height, smooth((mine - 8) / 17))
  return height
}

function terrainShape(x: number, z: number) {
  const coast = shoreDistance(x, z)
  const inland = smooth(coast / 85)
  let height = Math.max(-19, coast * 0.36)
  if (coast > 0) {
    height = 9 * smooth(coast / 35) + inland * (3.8 + 1.8 * Math.sin(x * 0.031 + z * 0.012) * Math.cos(z * 0.032)
      + mound(x, z, -135, 233, 164, 139, 55) + mound(x, z, 112, 247, 124, 100, 38)
      + mound(x, z, 275, 135, 122, 155, 37) + mound(x, z, -330, 55, 104, 123, 20)
      + mound(x, z, -13, 8, 104, 72, 16) + mound(x, z, -202, -110, 67, 88, 5))
  }
  for (const site of sites) {
    const distance = siteDistance(x, z, site)
    if (distance < 16) height = mix(site.y, height, smooth(distance / 16))
  }
  height = mix(height, runway.y, (1 - smooth(airfieldDistance(x, z) / 19)) * smooth(coast / 13))

  if (x < -87 && x > -495) {
    const distance = Math.abs(z - riverZ(x))
    const base = riverY(x) + (distance - 9) * 0.48
    if (distance < 26) height = Math.min(height, mix(base, height, smooth((distance - 11) / 15)))
  }
  for (const lake of [lowerLake, tarn]) {
    const r = radius(x, z, lake.x, lake.z, lake.rx, lake.rz)
    if (r < 1.37) height = mix(lake.y + (r - 1) * 14, height, smooth((r - 1) / 0.37))
  }
  if (x < -87 && x > -155 && Math.abs(z - riverZ(x)) < 12) {
    const distance = Math.abs(z - riverZ(x))
    height = Math.min(height, mix(riverY(x) + (distance - 9) * .48, height, smooth((distance - 8) / 4)))
  }
  if (z >= 121 && z <= 199) {
    const distance = Math.abs(x - fallsX(z))
    const width = fallsWidth(z)
    const bank = distance - width
    const spread = 11 + 5 * smooth((z - 163) / 12)
    if (bank < spread) height = mix(fallsY(z) + bank * .67, height, smooth(bank / spread))
  }
  const ungraded = height
  const nearest = nearestRoad(x, z, true)
  if (nearest.road) {
    const shoulder = nearest.distance - nearest.road.width / 2 - 4
    const grade = junctionGrade(x, z, nearest.y, nearest.road)
    height = mix(grade, height, smooth(shoulder / 11))
  }
  if (z >= 123 && z <= 199) {
    // Leave the watercourse open underneath the viaduct and its shoulders.
    const distance = Math.abs(x - fallsX(z))
    height = mix(ungraded, height, smooth((distance - 5) / 5))
  }
  const deck = nearestRoad(x, z)
  if (deck.road && (bridgeAt(deck.road, { x, z }) || deck.road === ferryTrack || deck.road === fishingPier)) {
    const blend = smooth((deck.distance - deck.road.width / 2 - 4) / 7)
    height = mix(Math.min(height, deck.y - 0.16), height, blend)
  }
  for (const pad of pavedYards) {
    const edge = Math.max(Math.abs(x - pad.x) - pad.width / 2, Math.abs(z - pad.z) - pad.depth / 2)
    if (edge < 5 && nearest.distance > (nearest.road?.width ?? 0) * .5 + 2) {
      height = mix(Math.min(height, pad.y - .08), height, smooth((edge - 1) / 4))
    }
  }
  for (const pad of roundYards) {
    const edge = Math.hypot(x - pad.x, z - pad.z) - pad.radius
    if (edge < 5) height = mix(Math.min(height, pad.y - .10), height, smooth((edge - 1) / 4))
  }
  // An exposed bed of slate forms a level picnic shelf above the steeper shore.
  const ledge = radius(x, z, picnicLedge.x, picnicLedge.z, 6.8, 3.8)
  if (ledge < 1.6) height = mix(30.85 + .027 * (z - picnicLedge.z), height, smooth((ledge - .65) / .95))
  // The cemetery gate and loop sit on two graded pads. Carry the walk across
  // the shallow hollow between them, feathering the fill into the hillside.
  if (z > 153 && z < 176 && Math.abs(x - 19) < 9) {
    const t = clamp((z - 155) / 18)
    const grade = mix(28.1, 30, t)
    const blend = (1 - smooth((Math.abs(x - 19) - 2) / 7)) * smooth((z - 153) / 3) * smooth((176 - z) / 3)
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

// The diagonal and interpolants match the rendered grid triangles exactly.
export function groundHeight(x: number, z: number) {
  const gx = Math.max(0, Math.min(cols - 1, (x - minX) / gridStep))
  const gz = Math.max(0, Math.min(rows - 1, (z - minZ) / gridStep))
  const ix = Math.min(cols - 2, Math.floor(gx)), iz = Math.min(rows - 2, Math.floor(gz))
  const u = gx - ix, v = gz - iz, i = iz * cols + ix
  const heights = heightGrid()
  const a = heights[i], b = heights[i + 1], c = heights[i + cols], d = heights[i + cols + 1]
  return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v)
}

const deckLift = 0.13
export function deckPoint(p: RoadSample, offset: number, route: Route) {
  const x = p.x + Math.cos(p.yaw) * offset, z = p.z - Math.sin(p.yaw) * offset
  const ground = groundHeight(x, z)
  const design = junctionGrade(x, z, p.y, route)
  const stack = accessLanes.includes(route) ? .02 : Math.max(0, routes.indexOf(route)) * .009
  return { x, z, y: Math.max(design + deckLift, ground + .095) + stack }
}

type DeckPoint = ReturnType<typeof deckPoint>
const deckSections = new WeakMap<RoadSample, [DeckPoint, DeckPoint, DeckPoint]>()
export function deckSection(sample: RoadSample, route: Route) {
  const stored = deckSections.get(sample)
  if (stored) return stored
  const w = route.width / 2
  const section: [DeckPoint, DeckPoint, DeckPoint] = [deckPoint(sample, -w, route), deckPoint(sample, 0, route), deckPoint(sample, w, route)]
  deckSections.set(sample, section)
  return section
}

function triangleHeight(point: MapPoint, a: ReturnType<typeof deckPoint>, b: typeof a, c: typeof a) {
  const area = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z)
  const u = ((b.z - c.z) * (point.x - c.x) + (c.x - b.x) * (point.z - c.z)) / area
  const v = ((c.z - a.z) * (point.x - c.x) + (a.x - c.x) * (point.z - c.z)) / area
  return u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6 ? u * a.y + v * b.y + (1 - u - v) * c.y : -Infinity
}

export function surfaceHeight(x: number, z: number, maxDeck = Infinity) {
  let height = groundHeight(x, z)
  const point = { x, z }
  for (const { route, a, b } of roadIndex.get(key(Math.floor(x / indexSize), Math.floor(z / indexSize))) ?? []) {
    if (Math.abs(a.x - x) > 7 || Math.abs(a.z - z) > 7) continue
    const first = deckSection(a, route), next = deckSection(b, route)
    for (const lane of [0, 1]) {
      const deck = Math.max(triangleHeight(point, first[lane], first[lane + 1], next[lane]),
        triangleHeight(point, first[lane + 1], next[lane + 1], next[lane]))
      if (deck <= maxDeck) height = Math.max(height, deck)
    }
  }
  for (const pad of pavedYards) if (Math.abs(x - pad.x) <= pad.width / 2 && Math.abs(z - pad.z) <= pad.depth / 2) height = Math.max(height, pad.y)
  for (const pad of roundYards) if (Math.hypot(x - pad.x, z - pad.z) <= pad.radius) height = Math.max(height, pad.y)
  return height
}

function waterDepth(x: number, z: number) {
  return Math.max(0, waterHeight(x, z) - groundHeight(x, z))
}

export function shoreAccess(x: number, z: number) {
  const depth = waterDepth(x, z)
  return { depth, wade: depth > 0 && depth <= wadeDepth, boat: depth >= 0.70 && waterHeight(x, z) === seaLevel }
}

export function dryLandKm2(step = 2) {
  let dry = 0
  for (let z = landBounds.minZ + step / 2; z < landBounds.maxZ; z += step) {
    for (let x = landBounds.minX + step / 2; x < landBounds.maxX; x += step) {
      if (groundHeight(x, z) > waterHeight(x, z)) dry++
    }
  }
  return dry * step * step / 1e6
}
