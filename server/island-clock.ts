import { growthSeconds } from '../src/farm.ts'
import type { Snapshot } from '../src/protocol.ts'
import { daylight, isNight, nextDawn, weatherAt } from '../src/weather.ts'
import { restockExtinguishers } from './extinguishers.ts'

const plantingRainThreshold = 0.35

export function advanceIsland(
  state: Pick<Snapshot, 'farm' | 'islandTime' | 'players' | 'weather' | 'items'>,
  growth: number[],
  tickSeconds: number,
  checkpoint?: () => void,
) {
  const before = state.islandTime
  state.islandTime += tickSeconds
  state.weather = weatherAt(state.islandTime)
  let skippedFrom: number | undefined
  const connectedCrew = state.players.filter((player) => player.connected)
  if (isNight(state.weather.hour) && connectedCrew.length && connectedCrew.every((player) => player.sleeping)) {
    skippedFrom = state.islandTime
    state.islandTime = nextDawn(state.islandTime)
    state.weather = weatherAt(state.islandTime)
    checkpoint?.()
  }
  restockExtinguishers(state, before)
  if (!isNight(state.weather.hour)) {
    for (const player of connectedCrew) player.sleeping = false
  }
  const sun = daylight(state.weather.hour)
  for (const [plot, stage] of state.farm.entries()) {
    if (stage === 'planted' && state.weather.rain > plantingRainThreshold) state.farm[plot] = 'watered'
    if (state.farm[plot] === 'watered') {
      growth[plot] += tickSeconds * sun
      if (growth[plot] >= growthSeconds) state.farm[plot] = 'ripe'
    }
  }
  return skippedFrom
}
