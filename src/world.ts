export interface Point {
  x: number
  z: number
}

export interface Pose extends Point {
  heading: number
}

export const island = { width: 134, length: 92 }
export const harbor = { x: -46, z: -16 }
export const town = { x: 40, z: 13 }
export const lookout = { x: 7, z: 29 }
export const beach = { x: 29, z: -24 }
export const forest = { x: -27, z: 22 }
export const houseRoofRise = 1.65
export const jobPay = { crate: 2, delivery: 3, fire: 4 }
export const jumpSpeed = 6.85
export const jumpGravity = 17
export const truckStart: Pose = { x: -41, z: -11, heading: Math.PI / 2 }
export const truckSeatSpeed = 2
export const skiffStart: Pose = { x: -48.5, z: -35.8, heading: -2.5 }
export const harborDock = { x: -44, firstZ: -29, planks: 18, spacing: 0.49, width: 3.45, plankDepth: 0.45, top: 0.23 }
export const dockEndZ = harborDock.firstZ - (harborDock.planks - 1) * harborDock.spacing
export const truckBed = { width: 2.28, length: 3.12, center: -1.39, top: 1.12 }
export const truckRoof = { width: 2.36, length: 1.52, center: 1.03, top: 2.3 }
export const truckHood = { width: 2.46, length: 1.07, center: 2.325, top: 1.43 }
const railThickness = 0.14
export const truckSideRails = { thickness: railThickness, height: 0.62, x: (truckBed.width - railThickness) / 2 }
const tailLipThickness = 0.12
export const truckTailLip = {
  thickness: tailLipThickness, height: 0.28, z: truckBed.center - (truckBed.length + tailLipThickness) / 2,
}
export const cargoSlots = [-0.46, -1.46, -2.46]
export const crateSize = 0.89
export const crewHomes = [
  { building: { x: -52, z: -4.65, w: 4.5, d: 3.9, h: 3.4, wall: '#f2d5a4', roof: '#a85d36' }, chest: { x: -50.65, z: -7.52 } },
  { building: { x: -45, z: -4.65, w: 4.5, d: 3.9, h: 3.4, wall: '#d5e9dc', roof: '#477986' }, chest: { x: -43.65, z: -7.52 } },
]
export const chestSize = { width: 0.92, depth: 0.64, height: 0.66 }
export const spawns: Point[] = crewHomes.map(({ chest }) => ({ x: chest.x, z: chest.z - 1.34 }))
export const crateStarts: Point[] = [
  { x: -49, z: -15 }, { x: -47, z: -17 }, { x: -45, z: -15 },
]
export const extinguisherStarts: Point[] = [{ x: 20, z: 22 }, { x: 22, z: 22 }]

export const buildings = [
  { x: -50, z: -22, w: 8, d: 5, h: 4.65, wall: '#f3c78e', roof: '#a84632' },
  { x: -38, z: -20, w: 6, d: 5, h: 4.1, wall: '#f7e3a1', roof: '#1b7773' },
  { x: 35, z: 19, w: 6, d: 5, h: 4.8, wall: '#f4ce91', roof: '#b74635' },
  { x: 43, z: 19, w: 6, d: 5, h: 5.25, wall: '#eb9973', roof: '#9e3c39' },
  { x: 49, z: 18.25, w: 4, d: 4, h: 4.1, wall: '#ffe8b7', roof: '#236b75' },
  { x: 39, z: 5, w: 6, d: 5, h: 4.9, wall: '#f5e3b2', roof: '#b74e36' },
  { x: 48, z: 5, w: 5, d: 5, h: 4.35, wall: '#76b7a3', roof: '#25585f' },
  { x: 25, z: 18, w: 4, d: 4, h: 4.1, wall: '#e47c63', roof: '#a02e30' },
  { x: 10, z: 33, w: 3, d: 3, h: 4.65, wall: '#d6b188', roof: '#12605b' },
  ...crewHomes.map(({ building }) => building),
]

export function onDock(point: Point) {
  return Math.abs(point.x - harborDock.x) <= harborDock.width / 2 &&
    point.z <= harborDock.firstZ + harborDock.plankDepth / 2 && point.z >= dockEndZ - harborDock.plankDepth / 2
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
