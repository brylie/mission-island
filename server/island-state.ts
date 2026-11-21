import type { DriftwoodFrame } from '../src/simulation/driftwood-school.ts'
import { restoreFarmWork } from '../src/farm-orders.ts'
import { farmPlots } from '../src/farm.ts'
import { initialMaterialsWork } from '../src/materials-work.ts'
import type { createJuniperHabitat } from '../src/juniper-habitat.ts'
import type { AviationProgress } from '../src/aviation.ts'
import type { Snapshot } from '../src/protocol.ts'
import type { createCargoPhysics } from '../src/simulation/cargo.ts'
import { weatherAt } from '../src/weather.ts'
import { truckStart } from '../src/world.ts'
import { initialGateRepair } from '../src/gate-repair.ts'
import { initialFerryRepair } from '../src/ferry-repair.ts'
import { initialResidents } from '../src/residents/trust.ts'
import { starterResidents } from '../src/worlds/starter/residents.ts'
import { makeItems } from './items.ts'
import { restoreJournal } from './journal.ts'
import type { IslandSave } from './save.ts'
import { restoreSkiff } from './skiff.ts'

function restoreAviation(saved: AviationProgress | undefined): Snapshot['aviation'] {
  return { qualified: saved?.qualified ?? false, surveyed: saved?.surveyed ?? false, aerial: [...saved?.aerial ?? []], flight: null, marked: false }
}

const savedFerry = (save?: IslandSave) => save?.world ?? initialFerryRepair()

export function restoreIsland(
  physics: Pick<ReturnType<typeof createCargoPhysics>, 'parkTruck' | 'restore' | 'relocate' | 'placeFerry'>,
  juniper: ReturnType<typeof createJuniperHabitat>,
  driftwood: DriftwoodFrame,
  save?: IslandSave,
) {
  const islandTime = save?.islandTime ?? 0
  // Place the barrier or the restored deck before parking, so a truck saved on the ramp parks on it.
  physics.placeFerry(savedFerry(save))
  const state: Snapshot = {
    crewCoins: save?.crewCoins ?? 0,
    lastStarterPay: save?.lastStarterPay,
    type: 'state',
    players: [],
    items: makeItems(),
    mission: 'delivery',
    fire: 1,
    farm: farmPlots.map(() => 'grass'),
    ...initialGateRepair(),
    ...initialFerryRepair(),
    ...structuredClone(save?.world),
    skiff: restoreSkiff(save?.world.skiff),
    truck: physics.parkTruck(save?.world.truck ?? truckStart),
    weather: weatherAt(islandTime),
    islandTime,
    driftwood,
    juniper: juniper(0, weatherAt(islandTime), []),
    jobs: structuredClone(save?.world.jobs ?? { active: null, completed: 0 }),
    // A resident added since the save starts as a stranger.
    residents: { ...initialResidents(starterResidents), ...structuredClone(save?.world.residents) },
    aviation: restoreAviation(save?.world.aviation),
    journal: restoreJournal(save),
    farmWork: restoreFarmWork(save?.world.produce),
    materialsWork: structuredClone(save?.world.materialsWork ?? initialMaterialsWork()),
  }
  // A carried hinge pin goes back to the mending bench when the host stops.
  state.gateRepair.pinHolder = null
  const growth = save?.growth.slice() ?? farmPlots.map(() => 0)
  for (const item of state.items) {
    item.spraying = false
    if (state.mission === 'complete' && item.kind === 'extinguisher') item.holder = null
    if (save) physics.restore(item)
    else physics.relocate(item, item)
  }
  return { state, growth }
}

export function saveIsland(state: Snapshot, growth: number[], crew: IslandSave['crew']): IslandSave {
  const { truck, skiff, items, mission, fire, farm, jobs, lookoutFireClearedAt, gate, gateRepair, residents, lastFavorPay, journal, materialsWork, ferryRepair } = state
  const { x, z, heading } = truck
  const { qualified, surveyed, aerial } = state.aviation
  return {
    version: 6,
    crewCoins: state.crewCoins,
    islandTime: state.islandTime,
    growth: growth.slice(),
    ...(state.lastStarterPay && { lastStarterPay: state.lastStarterPay }),
    world: structuredClone({ truck: { x, z, heading }, skiff, items, mission, fire, farm, jobs, aviation: { qualified, surveyed, aerial }, gate, gateRepair, residents, journal, materialsWork, ferryRepair, produce: state.farmWork.progress, ...(lookoutFireClearedAt !== undefined && { lookoutFireClearedAt }), ...(lastFavorPay && { lastFavorPay }) }),
    crew,
  }
}
