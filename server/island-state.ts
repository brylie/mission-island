import type { DriftwoodFrame } from '../src/simulation/driftwood-school.ts'
import { restoreFarmWork } from '../src/farm-orders.ts'
import { farmPlots } from '../src/farm.ts'
import { restoreJournal } from '../src/field-journal.ts'
import { initialMaterialsWork } from '../src/materials-work.ts'
import type { createJuniperHabitat } from '../src/juniper-habitat.ts'
import type { AviationProgress } from '../src/aviation.ts'
import type { Snapshot } from '../src/protocol.ts'
import type { createCargoPhysics } from '../src/simulation/cargo.ts'
import { weatherAt } from '../src/weather.ts'
import { skiffStart, truckStart } from '../src/world.ts'
import { initialGateRepair } from '../src/gate-repair.ts'
import { initialResidents } from '../src/residents/trust.ts'
import { starterResidents } from '../src/worlds/starter/residents.ts'
import { makeItems } from './items.ts'
import type { IslandSave } from './save.ts'

function restoreAviation(saved: AviationProgress | undefined): Snapshot['aviation'] {
  return { qualified: saved?.qualified ?? false, surveyed: saved?.surveyed ?? false, aerial: [...saved?.aerial ?? []], flight: null, marked: false }
}

function restoreCrewJournal(save: IslandSave | undefined) {
  const discoveries = save?.crew.flatMap(({ player }) => Array.isArray(player.discoveries) ? player.discoveries : []) ?? []
  return restoreJournal(save?.world.journal, discoveries)
}

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
    mission: 'delivery', fire: 1, farm: farmPlots.map(() => 'grass'), ...initialGateRepair(), ...structuredClone(save?.world),
    truck: physics.parkTruck(save?.world.truck ?? truckStart),
    weather: weatherAt(islandTime), islandTime,
    driftwood, juniper: juniper(0, weatherAt(islandTime), []),
    jobs: structuredClone(save?.world.jobs ?? { active: null, completed: 0 }),
    // A resident added since the save starts as a stranger.
    residents: { ...initialResidents(starterResidents), ...structuredClone(save?.world.residents) },
    aviation: restoreAviation(save?.world.aviation),
    farmWork: restoreFarmWork(save?.world.produce),
    materialsWork: structuredClone(save?.world.materialsWork ?? initialMaterialsWork()),
    journal: restoreCrewJournal(save),
  }
  state.skiff.speed = 0
  // A carried hinge pin goes back to the mending bench when the host stops.
  state.gateRepair.pinHolder = null
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
  const { truck, skiff, items, mission, fire, farm, jobs, lookoutFireClearedAt, gate, gateRepair, residents, lastFavorPay, materialsWork } = state
  const { x, z, heading } = truck
  const { qualified, surveyed, aerial } = state.aviation
  return {
    version: 4, crewCoins: state.crewCoins, islandTime: state.islandTime, growth: growth.slice(),
    ...(state.lastStarterPay && { lastStarterPay: state.lastStarterPay }),
    world: structuredClone({ truck: { x, z, heading }, skiff, items, mission, fire, farm, jobs, aviation: { qualified, surveyed, aerial },
      gate, gateRepair, residents, materialsWork, produce: state.farmWork.progress, journal: state.journal,
      ...(lookoutFireClearedAt !== undefined && { lookoutFireClearedAt }), ...(lastFavorPay && { lastFavorPay }) }),
    crew,
  }
}
