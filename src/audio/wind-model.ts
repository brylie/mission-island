import { windMix } from '../assets/audio/wind.ts'
import { islandTreeGeometry } from '../assets/geometry/starter-scenery.ts'
import { smoothstep } from '../math/smoothstep.ts'
import { islandTrees } from '../scenery.ts'
import { coastRadius, groundHeight } from '../terrain.ts'
import type { Point } from '../world.ts'
import { clamp01 } from './recipe-kit.ts'

export type CanopyTree = { x: number, z: number, height: number, leafy: boolean }

const easeBetween = (from: number, to: number, value: number) => smoothstep((value - from) / (to - from))

const treesWithin = (point: Point, reach: number) =>
  islandTrees.filter((tree) => Math.hypot(tree.x - point.x, tree.z - point.z) < reach)

// How open a spot is to the wind: near the shore and on high ground it is exposed; among trees it is sheltered.
export function windExposure(point: Point) {
  const e = windMix.exposure
  const coast = easeBetween(e.coastFrom, e.coastTo, coastRadius(point))
  const height = clamp01(groundHeight(point) / e.heightForFullMetres)
  const shelter = clamp01(treesWithin(point, e.shelterReachMetres).length / e.treesForFullShelter)
  return clamp01(e.base + coast * e.coastShare + height * e.heightShare) * (1 - shelter * e.shelterLoss)
}

// The nearest crowns within earshot, nearest first. Every third island tree is broadleaf; the rest are conifers.
export function nearestCanopies(point: Point, count: number): CanopyTree[] {
  return treesWithin(point, windMix.canopy.reachMetres)
    .sort((a, b) => Math.hypot(a.x - point.x, a.z - point.z) - Math.hypot(b.x - point.x, b.z - point.z))
    .slice(0, count)
    .map((tree) => ({ x: tree.x, z: tree.z, height: tree.height, leafy: tree.variant % islandTreeGeometry.canopy.broadleafEvery === 0 }))
}

// A canopy is heard at full level close by and fades smoothly to nothing at the edge of earshot.
export function canopyGain(distance: number) {
  const { fullMetres, reachMetres } = windMix.canopy
  return 1 - easeBetween(fullMetres, reachMetres, distance)
}
