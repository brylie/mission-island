import type { Point } from './world.ts'
import type { Weather } from './protocol.ts'
import { smoothRange } from './simulation/motion-easing.ts'

export { smoothRange }

export function schoolAvoidance(origin: Point, threats: readonly Point[], escape: Point): Point {
  let pushX = 0, pushZ = 0
  for (const threat of threats) {
    const x = origin.x - threat.x, z = origin.z - threat.z
    const range = Math.hypot(x, z)
    const strength = 1 - smoothRange(1, 7.5, range)
    const length = Math.max(.001, range)
    pushX += (x / length + escape.x * .55) * strength
    pushZ += (z / length + escape.z * .55) * strength
  }
  const length = Math.hypot(pushX, pushZ)
  const scale = 4.8 / Math.max(1, length)
  return { x: pushX * scale, z: pushZ * scale }
}

export function birdActivity(time: number, weather: Weather) {
  const h = weather.hour
  const day = smoothRange(5.4, 6.7, h) * (1 - smoothRange(17.2, 19.2, h))
  const sheltered = smoothRange(.55, .96, weather.rain) * .9
  const roost = Math.max(1 - day, sheltered)
  const landing = smoothRange(.64, .79, (time % 48) / 48) * (1 - smoothRange(.90, .99, (time % 48) / 48))
  const bat = (1 - smoothRange(.03, .77, day)) * (1 - smoothRange(.25, .83, weather.rain))
  return { roost, landing: landing * (1 - roost), bat }
}

export function phenomenonStrength(kind: 'mist' | 'spray' | 'glow', weather: Weather) {
  const { hour, rain } = weather
  if (kind === 'mist') return smoothRange(4.4, 6.2, hour) * (1 - smoothRange(7.2, 9.4, hour)) * (1 - rain * .69)
  if (kind === 'spray') return .32 + .58 * rain + .1 * smoothRange(6, 10, hour) * (1 - smoothRange(16, 19, hour))
  const dark = 1 - smoothRange(4.7, 6.3, hour) * (1 - smoothRange(17.8, 20, hour))
  return dark * (1 - smoothRange(.15, .65, rain))
}
