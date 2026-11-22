import type { TrialRun } from '../src/live-checkpoints.ts'
import type { Player, Snapshot } from '../src/protocol.ts'
import { weatherAt } from '../src/weather.ts'
import { scenarioFor } from './scenarios/catalog.ts'

export function prepareTrial(state: Snapshot, settings: TrialRun) {
  const scenario = scenarioFor(settings.checkpoint)
  state.playtest = { ...settings, started: false }
  scenario.prepareWorld?.(state)
  state.weather = weatherAt(state.islandTime)

  function place(player: Player) {
    player.name = 'Crew ' + (player.id + 1)
    scenario.placePlayer(player, state, settings.seats)
  }

  function startWhenReady() {
    const players = state.players.filter((player) => player.connected)
    if (players.length !== settings.seats) return false
    scenario.startCrew?.(state, players)
    state.playtest!.started = true
    return true
  }
  return { place, startWhenReady }
}
