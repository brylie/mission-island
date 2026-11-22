import { fullTurnRadians } from '../math/angles.ts'
import { smoothstep } from '../math/smoothstep.ts'
import { coastPoint, waterLevel } from '../terrain.ts'
import type { Point } from '../world.ts'

const arcHalfSampleRadians = 0.005
const arcSampleSpanRadians = arcHalfSampleRadians + arcHalfSampleRadians
const shoreFollowSeconds = 0.8
const angleWrapBiasInHalfTurns = 3
const surfEmitterLiftMetres = 0.3

// Surf comes from three voices placed along the waterline around the listener's nearest shore.
// The voices slide with the listener instead of switching emitters, so no swell ever restarts.

const samples = 720
const coast = Array.from({ length: samples }, (_, i) => coastPoint(i / samples * fullTurnRadians))
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
  return { angle: best / samples * fullTurnRadians, distance: nearest }
}

// Smooth gain from full near the waterline to silence inland, with no corner at either end.
export function surfGain(distance: number) {
  const t = (distance - fullSurfMetres) / (silentSurfMetres - fullSurfMetres)
  return 1 - smoothstep(t)
}

function arcStep(angle: number) {
  const a = coastPoint(angle - arcHalfSampleRadians)
  const b = coastPoint(angle + arcHalfSampleRadians)
  return voiceSpacing / (Math.hypot(b.x - a.x, b.z - a.z) / arcSampleSpanRadians)
}

type SurfVoice = { x: number, y: number, z: number, gain: number }

// Follows the nearest coast angle with a time constant, unwrapping across a full turn.
export function createShoreFollower(seconds = shoreFollowSeconds) {
  let angle: number | undefined
  return {
    update(listener: Point, delta: number): SurfVoice[] {
      const target = nearestCoast(listener).angle
      if (angle === undefined) angle = target
      else {
        const turn = ((target - angle + Math.PI * angleWrapBiasInHalfTurns) % fullTurnRadians) - Math.PI
        angle += turn * (1 - Math.exp(-Math.max(0, delta) / seconds))
      }
      const centre = angle
      const step = arcStep(centre)
      return Array.from({ length: surfVoices }, (_, i) => {
        const point = coastPoint(centre + (i - 1) * step)
        return { x: point.x, y: waterLevel + surfEmitterLiftMetres, z: point.z, gain: surfGain(Math.hypot(point.x - listener.x, point.z - listener.z)) }
      })
    },
  }
}
