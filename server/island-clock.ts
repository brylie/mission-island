import { growthSeconds } from '../src/farm.ts'
import type { Snapshot } from '../src/protocol.ts'
import { daylight, isNight, nextDawn, weatherAt } from '../src/weather.ts'

export function advanceIsland(
  state: Pick<Snapshot, 'farm' | 'islandTime' | 'players' | 'weather'>,
  growth: number[], tickSeconds: number, checkpoint?: () => void,
) {
  state.islandTime += tickSeconds
  state.weather = weatherAt(state.islandTime)
  const connectedCrew = state.players.filter((player) => player.connected)
  if (isNight(state.weather.hour) && connectedCrew.length && connectedCrew.every((player) => player.sleeping)) {
    state.islandTime = nextDawn(state.islandTime)
    state.weather = weatherAt(state.islandTime)
    checkpoint?.()
  }
  if (!isNight(state.weather.hour)) {
    for (const player of connectedCrew) player.sleeping = false
  }
  const sun = daylight(state.weather.hour)
  for (const [plot, stage] of state.farm.entries()) {
    if (stage === 'planted' && state.weather.rain > 0.35) state.farm[plot] = 'watered'
    if (state.farm[plot] === 'watered') {
      growth[plot] += tickSeconds * sun
      if (growth[plot] >= growthSeconds) state.farm[plot] = 'ripe'
    }
  }
}
