import { groundSurfaces } from '../assets/audio/ground.ts'
import type { Player } from '../protocol.ts'
import { distanceToRoads, distanceToRoute, footpaths, walkways } from '../routes.ts'
import { islandTrees, northernRegions } from '../scenery.ts'
import { coastalSurface, waterDepth } from '../terrain.ts'
import { beachHasSand } from '../worlds/starter/beach-landforms.ts'
import { onDock, type Point } from '../world.ts'
import type { FootSurface } from './footstep-recipes.ts'

const halfWidthDivisor = 2

type Ground = { surface: FootSurface, damp: boolean }

const within = (point: Point, path: { width: number, points: readonly Point[] }) =>
  distanceToRoute(point, path.points) < path.width / halfWidthDivisor
const onPath = (point: Point, surface: string) => footpaths.some((path) => path.surface === surface && within(point, path))
const paved = (point: Point) =>
  onPath(point, 'pavement') || walkways.some((path) => within(point, path)) || distanceToRoads(point) < groundSurfaces.roadHalfWidthMetres

function wooded(point: Point) {
  const { treeReachMetres, nearbyTrees } = groundSurfaces.litter
  if (northernRegions.some((region) => region.trees && Math.hypot(point.x - region.at.x, point.z - region.at.z) < region.spread)) return true
  let near = 0
  for (const tree of islandTrees) {
    if (Math.hypot(tree.x - point.x, tree.z - point.z) < treeReachMetres && ++near >= nearbyTrees) return true
  }
  return false
}

// The ground surface without people or weather: what a boot lands on at this point.
export function groundSurface(point: Point): FootSurface {
  if (onDock(point)) return 'boards'
  const depth = waterDepth(point)
  if (depth > groundSurfaces.shallows.minDepthMetres && depth < groundSurfaces.shallows.maxDepthMetres) return 'shallows'
  if (onPath(point, 'gravel')) return 'gravel'
  if (paved(point)) return 'pavement'
  // Sand follows the shaped beaches and dunes; exposed shore rock and worn paths are bare ground.
  const coast = coastalSurface(point)
  if (beachHasSand(coast)) return 'sand'
  if (coast.rock > coast.sand || onPath(point, 'desire')) return 'fallback'
  return wooded(point) ? 'litter' : 'grass'
}

// The surface a grounded crewmate is standing on and whether rain or the tide has soaked it,
// or null when no footstep should sound.
export function footGround(point: Point, player: Pick<Player, 'seat' | 'grounded' | 'swimming' | 'truckSurface'>, rain = 0): Ground | null {
  if (player.seat || !player.grounded || player.swimming) return null
  // Supporting boards win over the terrain beneath them.
  if (player.truckSurface) return { surface: 'boards', damp: false }
  const surface = groundSurface(point)
  const { damp } = groundSurfaces
  const soaked = surface === 'pavement' || surface === 'boards' ? rain >= damp.pavingRain : rain >= damp.rain
  return { surface, damp: soaked || (surface === 'sand' && coastalSurface(point).wet >= damp.wetSand) }
}
