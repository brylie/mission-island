import { fenceHeight, fenceRuns } from '../../gate-layout.ts'
import { plank } from '../../gate-repair.ts'
import { juniperSolids } from '../../juniper-habitat.ts'
import { jobBoard } from '../../jobs.ts'
import { beachUmbrellas, lampPosts, ridgeLichenRocks, ridgeLichenSite, shellRocks, starterFeatures } from './sites.ts'
import { ridgeHeading, ridgeLandingSign, ridgeRack, ridgeWindsock } from './ridge-scout.ts'
import { flowerBeds, rainBarrel, sawhorse, woodpile } from './wren-garden.ts'
import { walkingHeight } from '../../terrain.ts'
import { localPoint, mendingBench, offset } from '../../world.ts'
import type { Point } from '../../world.ts'

// Local support volumes in metres. Separate surfaces preserve the seat and taller back,
// the individual crate tiers, and the lower of the two farm barrels.
type Solid = [width: number, depth: number, height: number, x?: number, z?: number]
const shapes: Record<typeof starterFeatures[number]['model'], Solid[]> = {
  'splitstone': [[1.72, 2.55, 2.035, -1.72, 0.45], [1.55, 2.29, 1.385, 1.61, -0.22]],
  'bench': [[1.7, 0.54, 0.57], [1.7, 0.105, 1.035, 0, 0.22]],
  'crates': [[0.64, 0.6, 0.54, -0.36, 0.02], [0.64, 0.61, 1.05, 0.33, -0.065]],
  'barrels': [[0.61, 0.61, 0.79, -0.37], [0.43, 0.43, 0.56, 0.34]],
  'rack': [[1.83, 0.16, 1.5]],
  'planter': [[1.66, 0.57, 0.345]],
  'scope': [[0.76, 0.76, 0.16], [0.22, 0.22, 1], [0.48, 0.82, 1.27]],
  'log': [[2.4, 0.45, 0.42], [0.19, 0.2, 0.64, -0.45, 0.09]],
  'cairn': [[0.86, 0.65, 0.225], [0.56, 0.42, 0.405, 0.055], [0.32, 0.24, 0.525, 0.02]],
  'tide-staff': [[0.18, 0.24, 1.35]],
  'gauge': [[0.14, 0.18, 1.35]],
}

function solidsAt(point: Point, pieces: Solid[], heading = 0, scale = 1) {
  const floor = walkingHeight(point)
  return pieces.map(([width, depth, height, x = 0, z = 0]) => ({
    ...offset({ ...point, heading }, x * scale, z * scale),
    halfWidth: width * scale / 2,
    halfDepth: depth * scale / 2,
    floor,
    top: floor + height * scale,
    heading,
    bound: Math.hypot(width, depth) * scale / 2,
    cos: Math.cos(heading),
    sin: Math.sin(heading),
  }))
}

export const starterSolids = [
  ...juniperSolids.flatMap((s) => solidsAt(s, [[s.width, s.depth, s.height]], s.heading)),
  ...starterFeatures.flatMap((feature) => solidsAt(feature, shapes[feature.model], 'heading' in feature ? feature.heading : 0, 'scale' in feature ? feature.scale : 1)),
  ...solidsAt(jobBoard, [[1.75, 0.14, 1.95]]),
  ...lampPosts.flatMap((post) => solidsAt(post, [[0.14, 0.14, 2.74]])),
  ...beachUmbrellas.flatMap((post) => solidsAt(post, [[0.16, 0.16, 2.27]])),
  ...shellRocks.flatMap((rock) => solidsAt(rock, [[rock.size, rock.size * 0.65, 0.17]], rock.heading)),
  ...fenceRuns.map(({ from, to }) => plank(from, to, 0.12, fenceHeight)),
  ...solidsAt(mendingBench, [[1.6, 0.7, mendingBench.top]], mendingBench.heading),
  ...flowerBeds.flatMap((bed) => solidsAt(bed, [[bed.width + 0.1, bed.depth + 0.1, 0.16]])),
  ...solidsAt(woodpile, [[1.05, 0.65, 0.6]], woodpile.heading),
  ...solidsAt(rainBarrel, [[0.55, 0.55, 0.8]]),
  ...solidsAt(sawhorse, [[1.1, 0.4, 0.75]], sawhorse.heading),
  ...solidsAt(ridgeRack, [[1.62, 0.27, 1.16]], ridgeHeading),
  ...solidsAt(ridgeWindsock, [[0.09, 0.09, 2.64]]),
  ...solidsAt(ridgeLandingSign, [[0.15, 0.15, 1.26], [1.44, 0.19, 1.545]], ridgeHeading),
]

const lichenBase = walkingHeight(ridgeLichenSite)
const lichenStones = ridgeLichenRocks.map(([x, z, size]) =>
  ({ x: ridgeLichenSite.x + x, z: ridgeLichenSite.z + z, heading: x * 0.62, size }))

function lichenTop(point: Point, padding: number) {
  if (Math.abs(point.x - ridgeLichenSite.x) > 3 + padding || Math.abs(point.z - ridgeLichenSite.z) > 3 + padding) return -Infinity
  let top = -Infinity
  for (const stone of lichenStones) {
    const { x, z } = localPoint(stone, point)
    const { size } = stone
    const radius = (x / (size * 0.5 + padding)) ** 2 + (z / (size * 0.455 + padding)) ** 2
    if (radius < 1) top = Math.max(top, lichenBase + size * (0.23 + 0.37 * Math.sqrt(1 - radius)))
  }
  return top
}

export function starterPropTop(point: Point, padding: number) {
  let top = lichenTop(point, padding)
  for (const solid of starterSolids) {
    const dx = point.x - solid.x, dz = point.z - solid.z
    if (Math.abs(dz) > solid.bound + 2 * padding || Math.abs(dx) > solid.bound + 2 * padding) continue
    if (Math.abs(dx * solid.cos - dz * solid.sin) <= solid.halfWidth + padding
      && Math.abs(dx * solid.sin + dz * solid.cos) <= solid.halfDepth + padding) top = Math.max(top, solid.top)
  }
  return top
}
