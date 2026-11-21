import type { Point } from './world.ts'
import type { Weather } from './protocol.ts'

export function smoothRange(start: number, end: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)))
  return t * t * (3 - 2 * t)
}

export function schoolAvoidance(origin: Point, threats: readonly Point[], escape: Point): Point {
  let pushX = 0, pushZ = 0
  for (const threat of threats) {
    const x = origin.x - threat.x, z = origin.z - threat.z
    const range = Math.hypot(x, z)
    const strength = 1 - smoothRange(1, 7.5, range)
    const length = Math.max(0.001, range)
    pushX += (x / length + escape.x * 0.55) * strength
    pushZ += (z / length + escape.z * 0.55) * strength
  }
  const length = Math.hypot(pushX, pushZ)
  const scale = 4.8 / Math.max(1, length)
  return { x: pushX * scale, z: pushZ * scale }
}

export function birdActivity(time: number, weather: Weather) {
  const h = weather.hour
  const day = smoothRange(5.4, 6.7, h) * (1 - smoothRange(17.2, 19.2, h))
  const sheltered = smoothRange(0.55, 0.96, weather.rain) * 0.9
  const roost = Math.max(1 - day, sheltered)
  const landing = smoothRange(0.64, 0.79, (time % 48) / 48) * (1 - smoothRange(0.90, 0.99, (time % 48) / 48))
  const bat = (1 - smoothRange(0.03, 0.77, day)) * (1 - smoothRange(0.25, 0.83, weather.rain))
  return { roost, landing: landing * (1 - roost), bat }
}

export function phenomenonStrength(kind: 'mist' | 'spray' | 'glow', weather: Weather) {
  const { hour, rain } = weather
  if (kind === 'mist') return smoothRange(4.4, 6.2, hour) * (1 - smoothRange(7.2, 9.4, hour)) * (1 - rain * 0.69)
  if (kind === 'spray') return 0.32 + 0.58 * rain + 0.1 * smoothRange(6, 10, hour) * (1 - smoothRange(16, 19, hour))
  const dark = 1 - smoothRange(4.7, 6.3, hour) * (1 - smoothRange(17.8, 20, hour))
  return dark * (1 - smoothRange(0.15, 0.65, rain))
}
