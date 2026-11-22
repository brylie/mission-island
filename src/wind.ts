// The island's breeze: one gust envelope that both the windblown particles and the wind sounds follow,
// so leaves lift when the wind is heard to rise. Rain flattens the gusts.
const gustFloor = 0.25
const gustSwing = 0.75
const gustRate = 0.62
const gustSharpness = 2
const gustRainLoss = 0.62

export function gustAt(time: number, rain: number) {
  return (gustFloor + gustSwing * Math.max(0, Math.sin(time * gustRate)) ** gustSharpness) * (1 - rain * gustRainLoss)
}
