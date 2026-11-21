import type { Player } from '../protocol.ts'
import { distanceToRoads, distanceToRoute, footpaths } from '../routes.ts'
import { coastRadius, shoreProfile } from '../terrain.ts'
import { onDock, type Point } from '../world.ts'
import type { FootSurface } from './recipes.ts'

// The rendered beach band begins where the meadow blend ends.
export const sandRadius = shoreProfile[2].radius

const onPath = (point: Point, surface: string) =>
  footpaths.some((path) => path.surface === surface && distanceToRoute(point, path.points) < path.width / 2)

// The surface a grounded crewmate is standing on, or null when no footstep should sound.
export function footSurface(point: Point, player: Pick<Player, 'seat' | 'grounded' | 'swimming' | 'truckSurface'>): FootSurface | null {
  if (player.seat || !player.grounded || player.swimming) return null
  // Supporting boards win over the terrain beneath them.
  if (onDock(point) || player.truckSurface) return 'boards'
  if (onPath(point, 'gravel')) return 'gravel'
  if (onPath(point, 'pavement') || distanceToRoads(point) < 3.3) return 'fallback'
  if (coastRadius(point) >= sandRadius) return 'sand'
  return 'fallback'
}
