import { fireWatchEntrance } from '../../src/fire-watch.ts'
import { daySeconds, weatherAt } from '../../src/weather.ts'
import { extinguisherStations, offset } from '../../src/world.ts'
import { igniteFire } from '../wildfire.ts'
import { standAt, type Scenario } from './scenario.ts'

// 10:00 on the third morning, which stays dry all day.
const dryDay = 2
const fourHoursAfterDawnSeconds = 80
const morningSeconds = daySeconds * dryDay + fourHoursAfterDawnSeconds
const scenarioSeed = 4096
const stationSetbackM = 1.3
const crewSpacingM = 1.1
const fireWatchStation = extinguisherStations.find((station) => station.id === 'fire-watch') ?? extinguisherStations[0]

export const fireWatchScenario: Scenario = {
  id: 'fire-watch',
  title: 'Fire watch · Smoke reported',
  island: 'Starter Island',
  prepareWorld(state) {
    state.islandTime = morningSeconds
    state.weather = weatherAt(state.islandTime)
    Object.assign(state, { mission: 'complete', fire: 0 })
    state.events = { seed: scenarioSeed, nextFireAt: null, fire: null, firesOut: 0 }
    igniteFire(state.events, state.islandTime, { site: 'meadow-slope', size: 'patch' })
  },
  // The first crewmate stands at the foot of the tower stairs; the second waits by its fire station.
  placePlayer(player) {
    if (player.id === 0) standAt(player, fireWatchEntrance, 0)
    else standAt(player, offset({ ...fireWatchStation, heading: fireWatchStation.heading }, crewSpacingM, stationSetbackM), fireWatchStation.heading + Math.PI)
  },
}
