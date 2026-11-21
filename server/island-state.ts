import type { DriftwoodFrame } from '../src/simulation/driftwood-school.ts'
import { farmPlots } from '../src/farm.ts'
import type { createJuniperHabitat } from '../src/juniper-habitat.ts'
import type { Snapshot } from '../src/protocol.ts'
import type { createCargoPhysics } from '../src/simulation/cargo.ts'
import { weatherAt } from '../src/weather.ts'
import { skiffStart, truckStart } from '../src/world.ts'
import { makeItems } from './items.ts'
import type { IslandSave } from './save.ts'

export function restoreIsland(
  physics: Pick<ReturnType<typeof createCargoPhysics>, 'parkTruck' | 'restore' | 'release'>,
  juniper: ReturnType<typeof createJuniperHabitat>,
  driftwood: DriftwoodFrame,
  save?: IslandSave,
) {
  const islandTime = save?.islandTime ?? 0
  const state: Snapshot = {
    crewCoins: save?.crewCoins ?? 0, lastStarterPay: save?.lastStarterPay,
    type: 'state', players: [], skiff: { ...skiffStart, speed: 0 }, items: makeItems(),
    mission: 'delivery', fire: 1, farm: farmPlots.map(() => 'grass'), ...structuredClone(save?.world),
    truck: physics.parkTruck(save?.world.truck ?? truckStart),
    weather: weatherAt(islandTime), islandTime,
    driftwood, juniper: juniper(0, weatherAt(islandTime), []),
    jobs: structuredClone(save?.world.jobs ?? { active: null, completed: 0 }),
    aviation: {
      qualified: save?.world.aviation?.qualified ?? false, surveyed: save?.world.aviation?.surveyed ?? false,
      flight: null, marked: false,
    },
  }
  state.skiff.speed = 0
  const growth = save?.growth.slice() ?? farmPlots.map(() => 0)
  for (const item of state.items) {
    item.spraying = false
    if (state.mission === 'complete' && item.kind === 'extinguisher') item.holder = null
    if (save) physics.restore(item)
    else physics.release(item, item)
  }
  return { state, growth }
}

export function saveIsland(state: Snapshot, growth: number[], crew: IslandSave['crew']): IslandSave {
  const { truck, skiff, items, mission, fire, farm, jobs, lookoutFireClearedAt } = state
  const { x, z, heading } = truck
  const { qualified, surveyed } = state.aviation
  return {
    version: 2, crewCoins: state.crewCoins, islandTime: state.islandTime, growth: growth.slice(),
    ...(state.lastStarterPay && { lastStarterPay: state.lastStarterPay }),
    world: structuredClone({ truck: { x, z, heading }, skiff, items, mission, fire, farm, jobs, aviation: { qualified, surveyed },
      ...(lookoutFireClearedAt !== undefined && { lookoutFireClearedAt }) }),
    crew,
  }
}
