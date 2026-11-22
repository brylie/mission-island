import { harborDockGeometry, harborDockPile } from './assets/geometry/waterfront.ts'
import { fireStationGeometry } from './assets/geometry/fire-station.ts'
import { mendingBenchGeometry } from './assets/geometry/wren-garden.ts'
import {
  crateStarts,
  crewHomes,
  crewSpawnSetback,
  doorApproach,
  extinguisherStarts,
  extinguisherStations,
  harborDockAnchor,
  harborDockPileLayout,
  mendingBenchSite,
  mendingBenchToolboxOffsetZ,
  publicBuildings,
  wrenCottage,
  type StarterBuilding,
} from './worlds/starter/layout/places.ts'

export { beach, ferryTerminal, forest, harbor, island, lookout, skiffStart, town, truckStart } from './worlds/starter/layout/places.ts'
export { crateStarts, crewHomes, extinguisherStarts, extinguisherStations, wrenCottage }
export { crewHipHeight } from './assets/geometry/crew-clothing.ts'

export interface Point {
  x: number
  z: number
}

export interface Pose extends Point {
  heading: number
}

export { houseRoofRise } from './assets/geometry/starter-house.ts'
const crateCoins = 2
const deliveryBonusCoins = 3
const lookoutFireCoins = 4
export const jobPay = { crate: crateCoins, delivery: deliveryBonusCoins, fire: lookoutFireCoins }
export const starterPay = {
  crate: { label: 'Crate delivered', coins: jobPay.crate },
  delivery: { label: 'Harbor delivery complete', coins: jobPay.crate + jobPay.delivery },
  fire: { label: 'Lookout fire out', coins: jobPay.fire },
}
export const crewWalkSpeed = 8
export const crewCarrySpeed = 6.5
export const crewSprintMultiplier = 1.55
export const jumpSpeed = 6.85
export const jumpGravity = 17
export const truckSeatSpeed = 2
export const harborDock = { ...harborDockAnchor, ...harborDockGeometry } as const
const { bottom, top, diameter } = harborDockPile
export const harborDockPiles = harborDockPileLayout.lateralOffsets.flatMap((offset) =>
  harborDockPileLayout.distanceAlongDock.map((distance) => ({ x: harborDock.x + offset, z: harborDock.firstZ - distance, bottom, top, diameter })))
export const dockEndZ = harborDock.firstZ - (harborDock.planks - 1) * harborDock.spacing
export { cargoSlots, truckBed, truckHood, truckRoof, truckSideRails, truckTailLip } from './assets/geometry/flatbed.ts'
export { crateSize } from './assets/geometry/supply-props.ts'

const half = 0.5
export function cottageDoor(home: typeof crewHomes[number]) {
  const { x, z, d } = home.building
  return { x, z: z - d * half - doorApproach }
}
export { chestSize } from './assets/geometry/starter-furniture.ts'
export const spawns: Point[] = crewHomes.map(({ chest }) => ({ x: chest.x, z: chest.z - crewSpawnSetback }))
export const mendingBench = { ...mendingBenchSite, geometry: mendingBenchGeometry }
export const toolboxHome: Point = { x: mendingBench.x, z: mendingBench.z + mendingBenchToolboxOffsetZ }
export const itemStarts = [
  ...crateStarts.map((start) => ({ kind: 'crate' as const, start })),
  ...extinguisherStarts.map((start) => ({ kind: 'extinguisher' as const, start })),
  { kind: 'toolbox' as const, start: toolboxHome, lift: mendingBench.geometry.surface.top },
  // Fire stations come after the toolbox so older saves keep their item IDs.
  ...extinguisherStations.map(({ x, z }) => ({ kind: 'extinguisher' as const, start: { x, z }, lift: fireStationGeometry.restTop })),
]
export const buildings: StarterBuilding[] = [
  ...publicBuildings,
  ...crewHomes.map(({ building }) => building),
  wrenCottage,
]

export function onDock(point: Point) {
  return Math.abs(point.x - harborDock.x) <= harborDock.width * half
    && point.z <= harborDock.firstZ + harborDock.plankDepth * half && point.z >= dockEndZ - harborDock.plankDepth * half
}

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

export function offset(pose: Pose, lateral: number, forward: number): Point {
  return {
    x: pose.x + Math.cos(pose.heading) * lateral + Math.sin(pose.heading) * forward,
    z: pose.z - Math.sin(pose.heading) * lateral + Math.cos(pose.heading) * forward,
  }
}

export function localPoint(pose: Pose, point: Point): Point {
  const x = point.x - pose.x
  const z = point.z - pose.z
  const cosine = Math.cos(pose.heading)
  const sine = Math.sin(pose.heading)
  return { x: x * cosine - z * sine, z: x * sine + z * cosine }
}
