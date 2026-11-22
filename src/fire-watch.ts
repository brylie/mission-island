import { fireWatchGeometry, type FireWatchArea } from './assets/geometry/fire-watch.ts'
import { fireWatchSite } from './worlds/starter/layout/places.ts'
import { distance, localPoint, offset, type Point } from './world.ts'

const half = 0.5
const deckReach = 0.05
// Trees and rocks keep this far from the tower's footprint.
const sceneryClearanceM = 3

export const fireWatch = { ...fireWatchSite, geometry: fireWatchGeometry }
const { deck, flights, landings, rail, rails, stairOuter } = fireWatchGeometry

export function fireWatchPoint(x: number, z: number): Point {
  return offset(fireWatch, x, z)
}

export const fireWatchEntrance = fireWatchPoint(fireWatchGeometry.entrance.x, fireWatchGeometry.entrance.z)
export const fireFinder = fireWatchPoint(0, 0)
const footprintRadius = Math.hypot(deck.area[1], stairOuter[2])

function inside([minX, maxX, minZ, maxZ]: FireWatchArea, { x, z }: Point, margin = 0) {
  return x >= minX - margin && x <= maxX + margin && z >= minZ - margin && z <= maxZ + margin
}

// Height of the tower's walking surface above its base, or undefined off the tower.
export function fireWatchFloor(point: Point): number | undefined {
  if (Math.abs(point.x - fireWatch.x) > footprintRadius || Math.abs(point.z - fireWatch.z) > footprintRadius) return undefined
  const local = localPoint(fireWatch, point)
  if (inside(deck.area, local)) return deck.top
  for (const landing of landings) if (inside(landing.area, local)) return landing.top
  for (const { area, rise: [low, high] } of flights) {
    if (!inside(area, local)) continue
    const [, , minZ, maxZ] = area
    return low + (high - low) * (local.z - minZ) / (maxZ - minZ)
  }
  return undefined
}

export function onFireWatchDeck(point: Point & { y: number }, base: number) {
  return inside(deck.area, localPoint(fireWatch, point)) && point.y >= base + deck.top - deckReach
}

export function nearFireWatch(point: Point, clearance = sceneryClearanceM) {
  const local = localPoint(fireWatch, point)
  return inside(deck.area, local, clearance) || inside(stairOuter, local, clearance)
}

// The rails as collision boxes. Each stands above the higher floor beside it.
export function fireWatchRails(base: number) {
  return rails.map(([x1, z1, x2, z2]) => {
    const from = fireWatchPoint(x1, z1), to = fireWatchPoint(x2, z2)
    const x = (from.x + to.x) * half, z = (from.z + to.z) * half
    const heading = -Math.atan2(to.z - from.z, to.x - from.x)
    const halfWidth = distance(from, to) * half, halfDepth = rail.collisionThickness * half
    const guarded = Math.max(...[from, to, { x, z }].flatMap((end) => [-rail.thickness, rail.thickness].map((side) =>
      fireWatchFloor({ x: end.x + Math.sin(heading) * side, z: end.z + Math.cos(heading) * side }) ?? 0)))
    const top = base + guarded + rail.collisionHeight
    return { x, z, halfWidth, halfDepth, floor: base, top, bound: Math.hypot(halfWidth, halfDepth), cos: Math.cos(heading), sin: Math.sin(heading), heading }
  })
}

// The cab roof as an axis-aligned box, so a follow camera on the deck stays under it and looks out.
export function fireWatchRoofBounds(base: number, padding: number) {
  const { cab } = fireWatchGeometry
  const reach = deck.area[1] + cab.roofOverhang + padding
  const corners = [-reach, reach].flatMap((x) => [-reach, reach].map((z) => fireWatchPoint(x, z)))
  const roofBase = base + deck.top + cab.roofHeight - cab.lintel
  return {
    min: [Math.min(...corners.map(({ x }) => x)), roofBase - padding, Math.min(...corners.map(({ z }) => z))],
    max: [Math.max(...corners.map(({ x }) => x)), roofBase + cab.lintel + cab.roofRise + padding, Math.max(...corners.map(({ z }) => z))],
  }
}

const flightSegments = 6

// The tower as solid columns under each walking surface, for cargo physics. Flights become short steps.
export function fireWatchColumns() {
  const areas = [
    { area: deck.area, top: deck.top },
    ...landings,
    ...flights.flatMap(({ area: [minX, maxX, minZ, maxZ], rise: [low, high] }) =>
      Array.from({ length: flightSegments }, (_, index) => {
        const from = minZ + (maxZ - minZ) * index / flightSegments, to = minZ + (maxZ - minZ) * (index + 1) / flightSegments
        return { area: [minX, maxX, from, to] as const, top: low + (high - low) * (index + half) / flightSegments }
      })),
  ]
  return areas.filter(({ top }) => top > 0).map(({ area: [minX, maxX, minZ, maxZ], top }) => ({
    ...fireWatchPoint((minX + maxX) * half, (minZ + maxZ) * half),
    heading: fireWatch.heading,
    halfWidth: (maxX - minX) * half,
    halfDepth: (maxZ - minZ) * half,
    top,
  }))
}
