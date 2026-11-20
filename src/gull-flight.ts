import type { Weather } from './protocol.ts'
import { smoothRange } from './wildlife-motion.ts'
import type { Point } from './world.ts'

type Position = Point & { y: number }
export interface GullPerch extends Position { heading: number }
type GullPhase = 'Resting' | 'Push-off' | 'Climb' | 'Glide' | 'Approach' | 'Flare' | 'Settling'
type Knot = readonly [x: number, y: number, z: number]

const circuit = [
  { end: .105, phase: 'Push-off', knots: [[0, 0, 0], [0, .03, 1.23], [.47, 1.65, 4.71], [2.4, 3.35, 7.6]] },
  { end: .295, phase: 'Climb', knots: [[2.4, 3.35, 7.6], [5.87, 6.41, 12.80], [14, 7.3, 13], [20, 7.1, 8]] },
  { end: .675, phase: 'Glide', knots: [[20, 7.1, 8], [27, 6.87, 2.17], [22, 6.1, -12], [13, 5.25, -14]] },
  { end: .925, phase: 'Approach', knots: [[13, 5.25, -14], [4, 4.4, -16], [0, 1.70, -9], [0, .66, -3.4]] },
  { end: 1, phase: 'Flare', knots: [[0, .66, -3.4], [0, .46, -2.34], [0, .012, -.74], [0, 0, 0]] },
] as const satisfies readonly { end: number; phase: GullPhase; knots: readonly [Knot, Knot, Knot, Knot] }[]

export function gullCycle(index: number) {
  return { period: 48 + index % 3 * 1.6, offset: index * 2.37 + (index % 2) * 1.41 }
}

function positionAt([a, b, c, d]: readonly [Knot, Knot, Knot, Knot], t: number, axis: number) {
  const s = 1 - t
  return a[axis] * s ** 3 + 3 * b[axis] * s * s * t + 3 * c[axis] * s * t * t + d[axis] * t ** 3
}

function tangentAt([a, b, c, d]: readonly [Knot, Knot, Knot, Knot], t: number, axis: number) {
  const s = 1 - t
  return (b[axis] - a[axis]) * s * s + 2 * (c[axis] - b[axis]) * s * t + (d[axis] - c[axis]) * t * t
}

export function gullAt(time: number, index: number, perch: GullPerch, weather: Weather, weatherAt?: (time: number) => Weather) {
  const { period, offset } = gullCycle(index)
  const start = Math.floor((time + offset) / period) * period - offset
  const age = time - start
  // A launched gull finishes its circuit. Only the next departure reads new weather.
  const sky = weatherAt?.(start) ?? weather
  const dark = sky.hour < 6 || sky.hour >= 19.25
  const sheltered = sky.rain >= .65 || sky.hour < 7 || sky.hour >= 17.5
  const launch = sheltered ? 13.4 + index % 3 * .29 : 3.1 + index % 3 * .32
  const arrival = sheltered ? 38.2 + index % 3 * .59 : 37.8 + index % 3 * .59
  if (dark || age < launch || age >= arrival) {
    const after = age - arrival
    const settling = !dark && after >= 0 && after < .56
    const fold = dark ? 1 : age >= arrival ? smoothRange(0, .56, after) : 1 - smoothRange(launch - .85, launch, age)
    const phase: GullPhase = settling ? 'Settling' : 'Resting'
    return { ...perch, phase, grounded: true, fold, sweep: 0, flap: 0, bank: 0, pitch: 0, tuck: 0,
      crouch: settling ? .047 * Math.sin(after / .56 * Math.PI) : 0 }
  }

  const progress = (age - launch) / (arrival - launch)
  const leg = circuit.findIndex(({ end }) => progress <= end)
  const { knots, end, phase } = circuit[leg]
  const from = circuit[leg - 1]?.end ?? 0
  const u = (progress - from) / (end - from)
  const t = phase === 'Push-off' ? u ** 1.2 : phase === 'Flare' ? 1 - (1 - u) ** 1.3 : u
  const reach = (sheltered ? .72 : 1) * (1 + (index % 3 - 1) * .065)
  const vertical = sheltered ? .72 : 1
  const x = positionAt(knots, t, 0) * reach, z = positionAt(knots, t, 2) * reach
  const tx = tangentAt(knots, t, 0), tz = tangentAt(knots, t, 2)
  const heading = Math.atan2(tx, tz)
  const next = Math.min(1, t + .025)
  const nx = tangentAt(knots, next, 0), nz = tangentAt(knots, next, 2)
  const turn = Math.atan2(nx * tz - nz * tx, nx * tx + nz * tz)
  const bank = Math.max(-.27, Math.min(.27, -turn * 4.2)) * (1 - smoothRange(.87, 1, progress))
  const pitch = Math.max(-.27, Math.min(.18, -Math.atan2(tangentAt(knots, t, 1) * vertical, Math.hypot(tx, tz) * reach)))
    - .24 * smoothRange(.925, .972, progress) * (1 - smoothRange(.975, 1, progress))
  const beats = .09 + .91 * (1 - smoothRange(.21, .295, progress))
  const flap = Math.sin((time - launch + offset) * 11.2) * .55 * beats * smoothRange(0, .013, progress)
  const tuck = smoothRange(.006, .085, progress) * (1 - smoothRange(.87, .97, progress))
  const sweep = .13 * (1 - beats) + .18 * smoothRange(.91, .98, progress)
  const separation = index * .48 * smoothRange(.035, .24, progress) * (1 - smoothRange(.70, .96, progress))
  const sin = Math.sin(perch.heading), cos = Math.cos(perch.heading)
  return {
    x: perch.x + x * cos + z * sin, y: perch.y + positionAt(knots, t, 1) * vertical + separation, z: perch.z - x * sin + z * cos,
    heading: perch.heading + heading, phase, grounded: false, fold: 0, flap, bank, pitch, tuck, crouch: 0, sweep,
  }
}
