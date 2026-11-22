import type { Player } from '../protocol.ts'
import { distanceToRoads, distanceToRoute, footpaths } from '../routes.ts'
import { coastalSurface } from '../terrain.ts'
import { beachHasSand } from '../worlds/starter/beach-landforms.ts'
import { onDock, type Point } from '../world.ts'
import type { FootSurface } from './recipes.ts'

const halfWidthDivisor = 2
const roadSurfaceHalfWidthMetres = 3.3

const onPath = (point: Point, surface: string) =>
  footpaths.some((path) => path.surface === surface && distanceToRoute(point, path.points) < path.width / halfWidthDivisor)

// The surface a grounded crewmate is standing on, or null when no footstep should sound.
export function footSurface(point: Point, player: Pick<Player, 'seat' | 'grounded' | 'swimming' | 'truckSurface'>): FootSurface | null {
  if (player.seat || !player.grounded || player.swimming) return null
  // Supporting boards win over the terrain beneath them.
  if (onDock(point) || player.truckSurface) return 'boards'
  if (onPath(point, 'gravel')) return 'gravel'
  if (onPath(point, 'pavement') || distanceToRoads(point) < roadSurfaceHalfWidthMetres) return 'fallback'
  if (beachHasSand(coastalSurface(point))) return 'sand'
  return 'fallback'
}
