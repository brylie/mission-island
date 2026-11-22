import { islandBreeze } from './assets/effects/breeze.ts'
import { smoothstep } from './math/smoothstep.ts'

const half = 0.5

// How much of the breeze is blowing over the coming minutes: near 1 in a windy spell, near the floor in a lull.
export function breezeAt(time: number) {
  const { floor, waves } = islandBreeze.lull
  const wave = waves.reduce((sum, { rate, weight, phase }) => sum + Math.sin(time * rate + phase) * weight, 0)
  return floor + (1 - floor) * smoothstep(half + half * wave)
}

// One gust envelope that both the windblown particles and the wind sounds follow, so leaves lift when the
// wind is heard to rise. Rain flattens the gusts.
export function gustAt(time: number, rain: number) {
  const { floor, swing, rate, sharpness, rainLoss } = islandBreeze.gust
  return (floor + swing * Math.max(0, Math.sin(time * rate)) ** sharpness) * breezeAt(time) * (1 - rain * rainLoss)
}
