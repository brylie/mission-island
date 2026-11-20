import type { MapPoint } from './sites.ts'

interface RoadPoint extends MapPoint { y: number }
export interface RoadSample extends RoadPoint { distance: number; yaw: number }

type Knot = [x: number, z: number, y: number]
const loopKnots: Knot[] = [
  [-270, -105, 9], [-244, -105, 9], [-185, -87, 11], [-111, -74, 12], [18, -66, 13],
  [109, -65, 13], [162, -65, 13], [205, -55, 13], [233, -26, 14], [235, 7, 15.5],
  [234, 35, 17], [231, 69, 19], [213, 101, 21], [168, 127, 23], [116, 141, 24],
  [20, 150, 28], [-26, 154, 29], [-56, 158, 29], [-108, 153, 31], [-172, 150, 31],
  [-236, 127, 29.7], [-259, 114, 28], [-297, 88, 24], [-337, 55, 18.6], [-351, 15, 14.4],
  [-353, -31, 11.7], [-342, -76, 10], [-315, -99, 9.5], [-296, -105, 9],
]

function cubic(a: number, b: number, c: number, d: number, t: number) {
  return b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * b - 3 * c + d - a)))
}

function sampleKnots(knots: Knot[], closed: boolean): RoadSample[] {
  const samples: RoadSample[] = []
  const get = (i: number) => knots[closed ? (i + knots.length) % knots.length : Math.max(0, Math.min(knots.length - 1, i))]
  const append = (x: number, z: number, y: number) => {
    const last = samples.at(-1)
    samples.push({ x, z, y, yaw: 0, distance: last ? last.distance + Math.hypot(x - last.x, z - last.z) : 0 })
  }
  const count = closed ? knots.length : knots.length - 1
  for (let i = 0; i < count; i++) {
    const a = get(i - 1), b = get(i), c = get(i + 1), d = get(i + 2)
    const steps = Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]))
    for (let j = 0; j < steps; j++) {
      const t = j / steps
      append(cubic(a[0], b[0], c[0], d[0], t), cubic(a[1], b[1], c[1], d[1], t), cubic(a[2], b[2], c[2], d[2], t))
    }
  }
  append(...get(count))
  samples.forEach((sample, i) => {
    const before = samples[i - 1] ?? (closed ? samples[samples.length - 2] : sample)
    const after = samples[i + 1] ?? (closed ? samples[1] : sample)
    sample.yaw = Math.atan2(after.x - before.x, after.z - before.z)
  })
  return samples
}

export interface Route { name: string; width: number; samples: RoadSample[]; crossings: boolean }
const route = (name: string, width: number, knots: Knot[], closed = false, crossings = false): Route =>
  ({ name, width, samples: sampleKnots(knots, closed), crossings })

export const islandLoop = route('Saltwind Loop', 9, loopKnots, true, true)
export const quayRoad = route('Ferry Approach', 9, [
  [-274, -229, 4], [-274, -210, 4], [-274, -177, 6], [-272, -139, 8], [-270, -105, 9],
])
const millRoad = route('Mill Road', 8, [
  [-185, -87, 11], [-174, -57, 13], [-174, -21, 15.6], [-190, 17, 19.2], [-210, 69, 24], [-224, 92, 26.2], [-241, 104, 27.1], [-259, 114, 28],
], false, true)
const mineRoad = route('Slatecliff Road', 8, [
  [213, 101, 21], [233, 112, 23.1], [252, 130, 25.65], [264, 148, 28.1], [271, 165, 29.12], [274, 172, 29.12],
])
const airfieldRoad = route('Airfield Lane', 7, [
  [162, -65, 13], [186, -71, 12.85], [205, -88, 11.2], [215, -108, 9.2], [219, -128, 8],
])
const quaySpurs = [
  route('Fishing Pier Lane', 6, [[-274, -210, 4], [-260, -214, 4.05], [-252, -232, 2.8], [-253, -253, 1.6]]),
  route('Rescue Slip Lane', 7, [[-274, -210, 4], [-290, -209, 4], [-305, -215, 2.8], [-311, -225, 1.6], [-311, -243, -1.8]]),
]
function fromLoop(x: number, z: number): Knot {
  const point = islandLoop.samples.reduce((nearest, p) =>
    Math.hypot(p.x - x, p.z - z) < Math.hypot(nearest.x - x, nearest.z - z) ? p : nearest)
  return [point.x, point.z, point.y]
}

export const accessLanes = [
  route('Fish Market Delivery', 6.4, [fromLoop(-222, -100), [-222, -107, 9.23], [-222, -119, 8.55]]),
  route('Farmers Market Delivery', 6.4, [fromLoop(182, -63), [183, -56, 13.27], [183, -47, 13.51]]),
  route('Hospital West Access', 6.4, [fromLoop(113, 141), [120, 136, 23.67], [130, 129, 23.05]]),
  route('Hospital East Access', 6.4, [fromLoop(161, 130), [153, 128, 23.22], [143, 127, 23.05]]),
  route('Fire Station West Access', 6.2, [fromLoop(-65, 158), [-66, 165, 29.46], [-66, 175, 29.65]]),
  route('Fire Station East Access', 6.2, [fromLoop(-49, 157), [-51, 164, 29.29], [-51, 169, 29.63], [-51, 175, 29.65]]),
]
export const routes = [islandLoop, quayRoad, millRoad, mineRoad, airfieldRoad, ...quaySpurs, ...accessLanes]

export function sampleRoute(route: Route, distance: number): RoadSample {
  const samples = route.samples
  let low = 0, high = samples.length - 1
  const target = Math.max(0, Math.min(distance, samples[high].distance))
  while (high - low > 1) {
    const middle = (low + high) >> 1
    if (samples[middle].distance < target) low = middle
    else high = middle
  }
  const a = samples[low], b = samples[high]
  const t = (target - a.distance) / (b.distance - a.distance)
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t,
    yaw: a.yaw + Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw)) * t, distance: target }
}

export const fishingPier = route('Fishing Pier', 4.5, [[-253, -253, 1.6], [-253, -271, 1.6]])
export const ferryTrack = route('Ferry Deck', 8, [[-274, -266, 1.65], [-274, -254, 1.65], [-274, -246, 2.12], [-274, -236, 3.3], [-274, -229, 4]])
