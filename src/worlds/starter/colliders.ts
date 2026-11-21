import { fixedPropSupportBoxes, flowerBedFrame, lichenStoneProfile, mendingBenchFootprint, shellRockProfile, sitePropSupportBoxes, type SupportBox } from '../../assets/geometry/site-props.ts'
import { fenceHeight, fenceRuns } from '../../gate-layout.ts'
import { plank, solidTop } from '../../gate-repair.ts'
import { juniperSolids } from '../../juniper-habitat.ts'
import { jobBoard } from '../../jobs.ts'
import { beachUmbrellas, lampPosts, ridgeLichenRocks, ridgeLichenSite, shellRocks, starterFeatures } from './sites.ts'
import { ridgeHeading, ridgeLandingSign, ridgeRack, ridgeWindsock } from './ridge-scout.ts'
import { flowerBeds, rainBarrel, sawhorse, woodpile } from './wren-garden.ts'
import { walkingHeight } from '../../terrain.ts'
import { localPoint, mendingBench, offset } from '../../world.ts'
import type { Point } from '../../world.ts'

const half = 0.5
const fenceColliderDepth = 0.12
const lichenSearchRadius = 3

function solidsAt(point: Point, pieces: readonly SupportBox[], heading = 0, scale = 1) {
  const floor = walkingHeight(point)
  return pieces.map(([width, depth, height, x = 0, z = 0]) => ({
    ...offset({ ...point, heading }, x * scale, z * scale),
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
  ...juniperSolids.flatMap((s) => solidsAt(s, [[s.width, s.depth, s.height]], s.heading)),
  ...starterFeatures.flatMap((feature) => solidsAt(feature, sitePropSupportBoxes[feature.model], 'heading' in feature ? feature.heading : 0, 'scale' in feature ? feature.scale : 1)),
  ...solidsAt(jobBoard, fixedPropSupportBoxes.jobBoard),
  ...lampPosts.flatMap((post) => solidsAt(post, fixedPropSupportBoxes.lampPost)),
  ...beachUmbrellas.flatMap((post) => solidsAt(post, fixedPropSupportBoxes.beachUmbrella)),
  ...shellRocks.flatMap((rock) => solidsAt(rock, [[rock.size, rock.size * shellRockProfile.depthRatio, shellRockProfile.supportHeight]], rock.heading)),
  ...fenceRuns.map(({ from, to }) => plank(from, to, fenceColliderDepth, fenceHeight)),
  ...solidsAt(mendingBench, [[mendingBenchFootprint.width, mendingBenchFootprint.depth, mendingBench.top]], mendingBench.heading),
  ...flowerBeds.flatMap((bed) => solidsAt(bed, [[bed.width + flowerBedFrame.overhang, bed.depth + flowerBedFrame.overhang, flowerBedFrame.supportHeight]])),
  ...solidsAt(woodpile, fixedPropSupportBoxes.woodpile, woodpile.heading),
  ...solidsAt(rainBarrel, fixedPropSupportBoxes.rainBarrel),
  ...solidsAt(sawhorse, fixedPropSupportBoxes.sawhorse, sawhorse.heading),
  ...solidsAt(ridgeRack, fixedPropSupportBoxes.ridgeRack, ridgeHeading),
  ...solidsAt(ridgeWindsock, fixedPropSupportBoxes.ridgeWindsock),
  ...solidsAt(ridgeLandingSign, fixedPropSupportBoxes.ridgeLandingSign, ridgeHeading),
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
