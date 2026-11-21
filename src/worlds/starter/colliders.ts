import { lichenStoneProfile, sitePropGeometry, type SupportBox } from '../../assets/geometry/site-props.ts'
import { fenceHeight, fenceRuns } from '../../gate-layout.ts'
import { plank, solidTop } from '../../gate-repair.ts'
import { juniperSolids } from '../../juniper-habitat.ts'
import { jobBoard } from '../../jobs.ts'
import { beachUmbrellas, lampPosts, ridgeLichenRocks, ridgeLichenSite, shellRocks, starterFeatures } from './sites.ts'
import { ridgeLandingSign, ridgeRack, ridgeWindsock } from './ridge-scout.ts'
import { flowerBeds, rainBarrel, sawhorse, woodpile } from './wren-garden.ts'
import { walkingHeight } from '../../terrain.ts'
import { localPoint, mendingBench, offset } from '../../world.ts'
import type { Point } from '../../world.ts'

const half = 0.5
const fenceColliderDepth = 0.12
const lichenSearchRadius = 3

interface SupportedProp extends Point {
  geometry: { supportBoxes: readonly SupportBox[] }
  heading?: number
  scale?: number
}

function solidsAt({ x, z, geometry, heading = 0, scale = 1 }: SupportedProp) {
  const point = { x, z, heading }
  const floor = walkingHeight(point)
  return geometry.supportBoxes.map(([width, depth, height, localX = 0, localZ = 0]) => ({
    ...offset(point, localX * scale, localZ * scale),
    halfWidth: width * scale * half,
    halfDepth: depth * scale * half,
    floor,
    top: floor + height * scale,
    heading,
    bound: Math.hypot(width, depth) * scale * half,
    cos: Math.cos(heading),
    sin: Math.sin(heading),
  }))
}

export const starterSolids = [
  ...juniperSolids.flatMap((s) => solidsAt({ ...s, geometry: { supportBoxes: [[s.width, s.depth, s.height]] } })),
  ...starterFeatures.flatMap((feature) => solidsAt({ ...feature, geometry: sitePropGeometry[feature.model] })),
  ...solidsAt(jobBoard),
  ...lampPosts.flatMap(solidsAt),
  ...beachUmbrellas.flatMap(solidsAt),
  ...shellRocks.flatMap(solidsAt),
  ...fenceRuns.map(({ from, to }) => plank(from, to, fenceColliderDepth, fenceHeight)),
  ...solidsAt(mendingBench),
  ...flowerBeds.flatMap(solidsAt),
  ...solidsAt(woodpile),
  ...solidsAt(rainBarrel),
  ...solidsAt(sawhorse),
  ...solidsAt(ridgeRack),
  ...solidsAt(ridgeWindsock),
  ...solidsAt(ridgeLandingSign),
]

const lichenBase = walkingHeight(ridgeLichenSite)
const lichenStones = ridgeLichenRocks.map(([x, z, size]) =>
  ({ x: ridgeLichenSite.x + x, z: ridgeLichenSite.z + z, heading: x * lichenStoneProfile.headingPerMetre, size }))
const lichenDepthRadius = lichenStoneProfile.depthRatio * half
const lichenHeightRadius = lichenStoneProfile.heightRatio * half

function lichenTop(point: Point, padding: number) {
  if (Math.abs(point.x - ridgeLichenSite.x) > lichenSearchRadius + padding || Math.abs(point.z - ridgeLichenSite.z) > lichenSearchRadius + padding) return -Infinity
  let top = -Infinity
  for (const stone of lichenStones) {
    const { x, z } = localPoint(stone, point)
    const { size } = stone
    const widthFraction = x / (size * half + padding)
    const depthFraction = z / (size * lichenDepthRadius + padding)
    const radius = widthFraction * widthFraction + depthFraction * depthFraction
    if (radius < 1) top = Math.max(top, lichenBase + size * (lichenStoneProfile.centreHeightRatio + lichenHeightRadius * Math.sqrt(1 - radius)))
  }
  return top
}

export function starterPropTop(point: Point, padding: number) {
  return Math.max(lichenTop(point, padding), solidTop(starterSolids, point, padding))
}
