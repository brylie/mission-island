import { coastPoint, waterLevel } from '../terrain.ts'
import type { Point } from '../world.ts'

// Surf comes from three voices placed along the waterline around the listener's nearest shore.
// The voices slide with the listener instead of switching emitters, so no swell ever restarts.

const samples = 720
const coast = Array.from({ length: samples }, (_, i) => coastPoint(i / samples * Math.PI * 2))
const tau = Math.PI * 2
export const surfVoices = 3
// Distance between neighbouring voices along the waterline.
const voiceSpacing = 16
export const fullSurfMetres = 8
export const silentSurfMetres = 55

function nearestCoast(listener: Point) {
  let best = 0
  let nearest = Infinity
  for (let i = 0; i < samples; i++) {
    const d = Math.hypot(coast[i].x - listener.x, coast[i].z - listener.z)
    if (d < nearest) {
      nearest = d
      best = i
    }
  }
  return { angle: best / samples * tau, distance: nearest }
}

// Smooth gain from full near the waterline to silence inland, with no corner at either end.
export function surfGain(distance: number) {
  const t = Math.min(1, Math.max(0, (distance - fullSurfMetres) / (silentSurfMetres - fullSurfMetres)))
  return 1 - t * t * (3 - 2 * t)
}

function arcStep(angle: number) {
  const a = coastPoint(angle - 0.005)
  const b = coastPoint(angle + 0.005)
  return voiceSpacing / (Math.hypot(b.x - a.x, b.z - a.z) / 0.01)
}

type SurfVoice = { x: number, y: number, z: number, gain: number }

// Follows the nearest coast angle with a time constant, unwrapping across a full turn.
export function createShoreFollower(seconds = 0.8) {
  let angle: number | undefined
  return {
    update(listener: Point, delta: number): SurfVoice[] {
      const target = nearestCoast(listener).angle
      if (angle === undefined) angle = target
      else {
        const turn = ((target - angle + Math.PI * 3) % tau) - Math.PI
        angle += turn * (1 - Math.exp(-Math.max(0, delta) / seconds))
      }
      const centre = angle
      const step = arcStep(centre)
      return Array.from({ length: surfVoices }, (_, i) => {
        const point = coastPoint(centre + (i - 1) * step)
        return { x: point.x, y: waterLevel + 0.3, z: point.z, gain: surfGain(Math.hypot(point.x - listener.x, point.z - listener.z)) }
      })
    },
  }
}
