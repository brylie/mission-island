import { smoothstep } from './math/smoothstep.ts'
import { weatherAt } from './weather.ts'

const historyStep = 0.75
const retainedSamples = 36
const midpoint = 0.5
const roofSampleCount = 4
const gutterSampleCount = 13
const roofStreamStart = 0.12
const roofStreamFull = 0.55
const gutterStreamStart = 0.20
const gutterStreamFull = 0.68
const canvasWetStart = 0.02
const canvasWetFull = 0.72
const gutterCanvasContribution = 0.83
const groundCanvasContribution = 0.53
const gutterDripStart = 0.025
const gutterDripFull = 0.59
const puddleStart = 0.01
const puddleFull = 0.57

export const dryMarketRainAge = historyStep * retainedSamples

export interface MarketRunoff {
  rain: number
  canvas: number
  stream: number
  drip: number
  puddle: number
}

function ease(from: number, to: number, value: number) {
  return smoothstep((value - from) / (to - from))
}

// The roof, gutter and ground store water for different lengths of time. Sampling the
// shared weather history lets a late observer start with the same water as everyone else.
function sampleRunoff(time: number, rainAt: (at: number) => number): MarketRunoff {
  let roofSupply = 0
  let gutterSupply = 0
  let retained = 0
  for (let sample = 0; sample < retainedSamples; sample++) {
    const rain = rainAt(time - (sample + midpoint) * historyStep)
    retained += rain
    if (sample < roofSampleCount) roofSupply += rain
    if (sample < gutterSampleCount) gutterSupply += rain
  }
  const roof = roofSupply / roofSampleCount
  const gutter = gutterSupply / gutterSampleCount
  const ground = retained / retainedSamples
  const stream = ease(roofStreamStart, roofStreamFull, roof) * ease(gutterStreamStart, gutterStreamFull, gutter)
  return {
    rain: rainAt(time),
    canvas: ease(canvasWetStart, canvasWetFull, Math.max(roof, gutter * gutterCanvasContribution, ground * groundCanvasContribution)),
    stream,
    drip: ease(gutterDripStart, gutterDripFull, gutter) * (1 - stream),
    puddle: ease(puddleStart, puddleFull, ground),
  }
}

export function marketRunoffAt(islandTime: number) {
  return sampleRunoff(islandTime, (at) => at < 0 ? 0 : weatherAt(at).rain)
}

export function marketRunoffPreview(rain: number, rainAge: number) {
  return rain > 0
    ? sampleRunoff(0, () => rain)
    : sampleRunoff(rainAge, (at) => Number(at < 0))
}
