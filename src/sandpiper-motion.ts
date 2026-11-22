import { blend, hash } from './math/noise.ts'
import { smoothstep } from './math/smoothstep.ts'
import { coastPoint, groundHeight } from './terrain.ts'
import type { Point } from './world.ts'
import { driftwoodSandpipers as flock } from './worlds/starter/layout/wildlife.ts'

const signedRange = 2
const cycleSeconds = 2.8
const cycleStaggerSeconds = 0.64
const nextCycleOffset = 2
const runEnd = 0.42
const turnStart = 0.81
const forageLanes = 2
const retreatReachM = 2.4
const retreatSidestepM = 0.8

function homeBearing(bird: number) {
  return flock.firstBearing + bird * flock.bearingSpacing
}

function foragePoint(bird: number, cycle: number) {
  const along = signedRange * hash(bird, cycle, flock.seed) - 1
  const wash = signedRange * hash(bird, cycle, flock.seed + 1) - 1
  return {
    angle: homeBearing(bird) + along * flock.bearingWander,
    radius: flock.inlandRadius + bird % forageLanes * flock.crossShoreSpacing + wash * flock.crossShoreWander,
  }
}

function heading(from: Point, to: Point) {
  return Math.atan2(to.x - from.x, to.z - from.z)
}

function retreat(point: Point, tangent: Point, walkers: readonly Point[]) {
  let away = 0
  let alert = 0
  for (const walker of walkers) {
    const dx = point.x - walker.x, dz = point.z - walker.z
    const distance = Math.hypot(dx, dz)
    const weight = 1 - smoothstep(distance / retreatReachM)
    alert = Math.max(alert, weight)
    away += weight * Math.tanh((dx * tangent.x + dz * tangent.z) / retreatSidestepM)
  }
  return { away: Math.max(-1, Math.min(1, away)), alert }
}

export function sandpiperPose(time: number, bird: number, walkers: readonly Point[] = []) {
  const progress = (time + cycleStaggerSeconds * bird) / cycleSeconds
  const cycle = Math.floor(progress), phase = progress - cycle
  const start = foragePoint(bird, cycle)
  const end = foragePoint(bird, cycle + 1)
  const after = foragePoint(bird, cycle + nextCycleOffset)
  const move = smoothstep(phase / runEnd)
  const angle = blend(start.angle, end.angle, move)
  const radius = blend(start.radius, end.radius, move)
  const a = coastPoint(start.angle, start.radius), b = coastPoint(end.angle, end.radius)
  const turn = heading(b, coastPoint(after.angle, after.radius)) - heading(a, b)
  const facing = heading(a, b) + Math.atan2(Math.sin(turn), Math.cos(turn)) * smoothstep((phase - turnStart) / (1 - turnStart))
  const { away, alert } = retreat(coastPoint(angle, radius), { x: -Math.sin(angle), z: Math.cos(angle) }, walkers)
  const laneEdge = homeBearing(bird) + Math.sign(away) * flock.bearingWander
  const point = coastPoint(blend(angle, laneEdge, Math.abs(away)), radius)
  const stride = phase < runEnd ? Math.sin(Math.PI * phase / runEnd) : 0
  return {
    ...point,
    y: groundHeight(point),
    heading: facing,
    stride,
    feeding: phase >= runEnd && phase < turnStart && alert === 0,
  }
}
