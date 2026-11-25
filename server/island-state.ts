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
import { learnerVehicleIds, learnerVehicles, type LearnerVehicleId } from '../src/learner-vehicles.ts'
import { initialGateRepair } from '../src/gate-repair.ts'
import { initialFerryRepair } from '../src/ferry-repair.ts'
import { initialResidents } from '../src/residents/trust.ts'
import { starterResidents } from '../src/worlds/starter/residents.ts'
import { makeItems, restingHeight, updateStowedItems } from './items.ts'
import { originalCoastRadius, walkingHeight } from '../src/terrain.ts'
import { authoredShare } from '../src/worlds/starter/generation/protection.ts'
import { highwoodAuthoredLimit } from '../src/worlds/starter/layout/highwood-planting.ts'
import { initialEvents } from './wildfire.ts'
import { restoreJournal } from './journal.ts'
import type { IslandSave } from './save.ts'
import { currentSaveVersion } from './save-version.ts'
import { restoreSkiff } from './skiff.ts'

function restoreAviation(saved: AviationProgress | undefined): Snapshot['aviation'] {
  return { qualified: saved?.qualified ?? false, surveyed: saved?.surveyed ?? false, aerial: [...saved?.aerial ?? []], flight: null, marked: false }
}

const savedFerry = (save?: IslandSave) => save?.world ?? initialFerryRepair()

function learnerRecord<T>(value: (id: LearnerVehicleId) => T) {
  return Object.fromEntries(learnerVehicleIds.map((id) => [id, value(id)])) as Record<LearnerVehicleId, T>
}

export function restoreIsland(
  physics: Pick<ReturnType<typeof createCargoPhysics>, 'parkTruck' | 'parkLearner' | 'restore' | 'relocate' | 'placeFerry'>,
  juniper: ReturnType<typeof createJuniperHabitat>,
  driftwood: DriftwoodFrame,
  save?: IslandSave,
  random?: () => number,
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
    events: structuredClone(save?.world.events ?? initialEvents(random)),
    skiff: restoreSkiff(save?.world.skiff),
    truck: physics.parkTruck(save?.world.truck ?? truckStart),
    vehicles: learnerRecord((id) => physics.parkLearner(id, save?.world.vehicles?.[id] ?? learnerVehicles[id].park)),
    practice: learnerRecord((id) => save?.world.practice?.[id] ?? 0),
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
    // Marks belong to connected crewmates, so a restarted host starts with none.
    marks: [],
  }
  updateStowedItems(state)
  // A carried hinge pin goes back to the mending bench when the host stops.
  state.gateRepair.pinHolder = null
  const growth = save?.growth.slice() ?? farmPlots.map(() => 0)
  restoreItems(state, physics, Boolean(save))
  return { state, growth }
}

// How far above its resting height a restored Highwood item may sit before it settles.
const settleToleranceM = 0.25

function restoreItems(state: Snapshot, physics: Pick<ReturnType<typeof createCargoPhysics>, 'restore' | 'relocate'>, saved: boolean) {
  for (const item of state.items) {
    item.spraying = false
    if (saved) physics.restore(item)
    else physics.relocate(item, item)
    if (!saved || item.kind === 'crate' || item.holder !== null || item.stowed || item.onBed) continue
    // Ground that has risen since the save (Highwood) lifts loose gear back onto it. Highwood's
    // ground can also have dropped, under a road cut or the reshaped Cairn, so gear left there
    // settles back down; elsewhere gear may rest on a dock or a crate above the ground.
    const sunk = authoredShare(item, originalCoastRadius(item)) < highwoodAuthoredLimit && item.y > restingHeight(item) + settleToleranceM
    if (item.y < walkingHeight(item) || sunk) item.y = restingHeight(item)
  }
}

export function saveIsland(state: Snapshot, growth: number[], crew: IslandSave['crew']): IslandSave {
  const { truck, skiff, items, mission, fire, farm, jobs, lookoutFireClearedAt, gate, gateRepair, residents, lastFavorPay, journal, materialsWork, ferryRepair, events } = state
  const { x, z, heading } = truck
  const vehicles = learnerRecord((id) => {
    const { x, z, heading } = state.vehicles[id]
    return { x, z, heading }
  })
  const { qualified, surveyed, aerial } = state.aviation
  return {
    version: currentSaveVersion,
    crewCoins: state.crewCoins,
    islandTime: state.islandTime,
    growth: growth.slice(),
    ...(state.lastStarterPay && { lastStarterPay: state.lastStarterPay }),
    world: structuredClone({ truck: { x, z, heading }, vehicles, practice: state.practice, skiff, items, mission, fire, events, farm, jobs, aviation: { qualified, surveyed, aerial }, gate, gateRepair, residents, journal, materialsWork, ferryRepair, produce: state.farmWork.progress, ...(lookoutFireClearedAt !== undefined && { lookoutFireClearedAt }), ...(lastFavorPay && { lastFavorPay }) }),
    crew,
  }
}
