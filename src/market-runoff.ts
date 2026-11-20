import { weatherAt } from './weather.ts'

const historyStep = .75
const retainedSamples = 36
export const dryMarketRainAge = historyStep * retainedSamples

export interface MarketRunoff {
  rain: number
  canvas: number
  stream: number
  drip: number
  puddle: number
}

function ease(from: number, to: number, value: number) {
  const fraction = Math.max(0, Math.min(1, (value - from) / (to - from)))
  return fraction * fraction * (3 - 2 * fraction)
}

// The roof, gutter and ground store water for different lengths of time. Sampling the
// shared weather history lets a late observer start with the same water as everyone else.
function sampleRunoff(time: number, rainAt: (at: number) => number): MarketRunoff {
  let roofSupply = 0
  let gutterSupply = 0
  let retained = 0
  for (let sample = 0; sample < retainedSamples; sample++) {
    const rain = rainAt(time - (sample + .5) * historyStep)
    retained += rain
    if (sample < 4) roofSupply += rain
    if (sample < 13) gutterSupply += rain
  }
  const roof = roofSupply / 4
  const gutter = gutterSupply / 13
  const ground = retained / retainedSamples
  const stream = ease(.12, .55, roof) * ease(.20, .68, gutter)
  return {
    rain: rainAt(time),
    canvas: ease(.02, .72, Math.max(roof, gutter * .83, ground * .53)),
    stream,
    drip: ease(.025, .59, gutter) * (1 - stream),
    puddle: ease(.01, .57, ground),
  }
}

export function marketRunoffAt(islandTime: number) {
  return sampleRunoff(islandTime, at => at < 0 ? 0 : weatherAt(at).rain)
}

export function marketRunoffPreview(rain: number, rainAge: number) {
  return rain > 0
    ? sampleRunoff(0, () => rain)
    : sampleRunoff(rainAge, at => Number(at < 0))
}
