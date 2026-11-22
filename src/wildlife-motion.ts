import { phenomenonActivityStyle } from './assets/effects/phenomena.ts'
import { birdActivityStyle } from './assets/recipes/ambient-wildlife.ts'
import { smoothstep } from './math/smoothstep.ts'
import type { Point } from './world.ts'
import type { Weather } from './protocol.ts'

const strongestAvoidanceRadiusM = 1
const threatRadiusM = 7.5
const overlappingThreatEpsilonM = 0.001
const deepWaterBias = 0.55
const maximumAvoidanceM = 4.8

export function smoothRange(start: number, end: number, value: number) {
  return smoothstep((value - start) / (end - start))
}

export function schoolAvoidance(origin: Point, threats: readonly Point[], escape: Point): Point {
  let pushX = 0, pushZ = 0
  for (const threat of threats) {
    const x = origin.x - threat.x, z = origin.z - threat.z
    const range = Math.hypot(x, z)
    const strength = 1 - smoothRange(strongestAvoidanceRadiusM, threatRadiusM, range)
    const length = Math.max(overlappingThreatEpsilonM, range)
    pushX += (x / length + escape.x * deepWaterBias) * strength
    pushZ += (z / length + escape.z * deepWaterBias) * strength
  }
  const length = Math.hypot(pushX, pushZ)
  const scale = maximumAvoidanceM / Math.max(1, length)
  return { x: pushX * scale, z: pushZ * scale }
}

type FadeRange = readonly [start: number, end: number]
function dailyEnvelope({ rise, fall }: { rise: FadeRange, fall: FadeRange }, hour: number) {
  return smoothRange(...rise, hour) * (1 - smoothRange(...fall, hour))
}

export function birdActivity(time: number, weather: Weather) {
  const { daylight, birdRainShelter, landing: circuit, batActivity } = birdActivityStyle
  const day = dailyEnvelope(daylight, weather.hour)
  const sheltered = smoothRange(...birdRainShelter.ramp, weather.rain) * birdRainShelter.maximum
  const roost = Math.max(1 - day, sheltered)
  const progress = (time % circuit.periodS) / circuit.periodS
  const landing = smoothRange(...circuit.settle, progress) * (1 - smoothRange(...circuit.takeoff, progress))
  const bat = (1 - smoothRange(...batActivity.daylight, day)) * (1 - smoothRange(...batActivity.rain, weather.rain))
  return { roost, landing: landing * (1 - roost), bat }
}

export function phenomenonStrength(kind: 'mist' | 'spray' | 'glow', weather: Weather) {
  const { hour, rain } = weather
  const { mist, spray, glow } = phenomenonActivityStyle
  if (kind === 'mist') return dailyEnvelope(mist.morning, hour) * (1 - rain * mist.rainLoss)
  if (kind === 'spray') {
    // Apply the daytime gain during the rising edge before fading it at dusk.
    const { rise, fall } = spray.daytime
    return spray.base + spray.rainGain * rain + spray.daytimeGain * smoothRange(...rise, hour) * (1 - smoothRange(...fall, hour))
  }
  const dark = 1 - dailyEnvelope(glow.daylight, hour)
  return dark * (1 - smoothRange(...glow.rainFade, rain))
}
