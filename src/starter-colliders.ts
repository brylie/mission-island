import { juniperSolids } from './juniper-habitat.ts'
import { jobBoard } from './jobs.ts'
import { beachUmbrellas, lampPosts, shellRocks, starterFeatures } from './starter-sites.ts'
import { walkingHeight } from './terrain.ts'
import { offset } from './world.ts'
import type { Point } from './world.ts'

// Local support volumes in metres. Separate surfaces preserve the seat and taller back,
// the individual crate tiers, and the lower of the two farm barrels.
type Solid = [width: number, depth: number, height: number, x?: number, z?: number]
const shapes: Record<typeof starterFeatures[number]['model'], Solid[]> = {
  splitstone: [[1.72, 2.55, 2.035, -1.72, .45], [1.55, 2.29, 1.385, 1.61, -.22]],
  bench: [[1.7, .54, .57], [1.7, .105, 1.035, 0, .22]],
  crates: [[.64, .6, .54, -.36, .02], [.64, .61, 1.05, .33, -.065]],
  barrels: [[.61, .61, .79, -.37], [.43, .43, .56, .34]],
  rack: [[1.83, .16, 1.5]],
  planter: [[1.66, .57, .345]],
  scope: [[.76, .76, .16], [.22, .22, 1], [.48, .82, 1.27]],
  log: [[2.4, .45, .42], [.19, .2, .64, -.45, .09]],
  cairn: [[.86, .65, .225], [.56, .42, .405, .055], [.32, .24, .525, .02]],
  'tide-staff': [[.18, .24, 1.35]],
  gauge: [[.14, .18, 1.35]],
}

function solidsAt(point: Point, pieces: Solid[], heading = 0, scale = 1) {
  const floor = walkingHeight(point)
  return pieces.map(([width, depth, height, x = 0, z = 0]) => ({
    ...offset({ ...point, heading }, x * scale, z * scale),
    halfWidth: width * scale / 2, halfDepth: depth * scale / 2,
    floor, top: floor + height * scale, heading, bound: Math.hypot(width, depth) * scale / 2,
    cos: Math.cos(heading), sin: Math.sin(heading),
  }))
}

export const starterSolids = [
  ...juniperSolids.flatMap(s => solidsAt(s, [[s.width, s.depth, s.height]], s.heading)),
  ...starterFeatures.flatMap((feature) => solidsAt(feature, shapes[feature.model],
    'heading' in feature ? feature.heading : 0, 'scale' in feature ? feature.scale : 1)),
  ...solidsAt(jobBoard, [[1.75, .14, 1.95]]),
  ...lampPosts.flatMap((post) => solidsAt(post, [[.14, .14, 2.74]])),
  ...beachUmbrellas.flatMap((post) => solidsAt(post, [[.16, .16, 2.27]])),
  ...shellRocks.flatMap((rock) => solidsAt(rock, [[rock.size, rock.size * .65, .17]], rock.heading)),
]

export function starterPropTop(point: Point, padding: number) {
  let top = -Infinity
  for (const solid of starterSolids) {
    const dx = point.x - solid.x, dz = point.z - solid.z
    if (Math.abs(dz) > solid.bound + 2 * padding || Math.abs(dx) > solid.bound + 2 * padding) continue
    if (Math.abs(dx * solid.cos - dz * solid.sin) <= solid.halfWidth + padding &&
      Math.abs(dx * solid.sin + dz * solid.cos) <= solid.halfDepth + padding) top = Math.max(top, solid.top)
  }
  return top
}
