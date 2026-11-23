import { smoothstep } from '../math/smoothstep.ts'
import { nearestShore, pointAlong, shorelineLoops } from '../shoreline.ts'
import { waterLevel } from '../terrain.ts'
import type { Point } from '../world.ts'

const shoreFollowSeconds = 0.8
const surfEmitterLiftMetres = 0.3
const half = 0.5

// Surf comes from three voices placed along the waterline around the listener's nearest shore.
// The voices slide along the shoreline with the listener instead of switching emitters, so no
// swell ever restarts. The shoreline is traced from the ground, so coves and islets have surf too.

export const surfVoices = 3
// Distance between neighbouring voices along the waterline.
const voiceSpacing = 16
export const fullSurfMetres = 8
export const silentSurfMetres = 55

// Smooth gain from full near the waterline to silence inland, with no corner at either end.
export function surfGain(distance: number) {
  const t = (distance - fullSurfMetres) / (silentSurfMetres - fullSurfMetres)
  return 1 - smoothstep(t)
}

type SurfVoice = { x: number, y: number, z: number, gain: number }

// Follows the nearest point along a shoreline loop with a time constant, wrapping around the
// loop. Moving to another loop (an islet) starts there, which only happens far from both.
export function createShoreFollower(seconds = shoreFollowSeconds) {
  let followed: { loop: number, along: number } | undefined
  return {
    update(listener: Point, delta: number): SurfVoice[] {
      const target = nearestShore(listener)
      const loop = shorelineLoops()[target.loop]
      if (followed?.loop !== target.loop) followed = { loop: target.loop, along: target.along }
      else {
        const gap = ((target.along - followed.along + loop.length * (1 + half)) % loop.length) - loop.length * half
        followed.along += gap * (1 - Math.exp(-Math.max(0, delta) / seconds))
      }
      const centre = followed.along
      return Array.from({ length: surfVoices }, (_, i) => {
        const point = pointAlong(loop, centre + (i - 1) * voiceSpacing)
        return { x: point.x, y: waterLevel + surfEmitterLiftMetres, z: point.z, gain: surfGain(Math.hypot(point.x - listener.x, point.z - listener.z)) }
      })
    },
  }
}
