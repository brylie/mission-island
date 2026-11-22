import type { Snapshot } from '../src/protocol.ts'
import type { createCargoPhysics } from '../src/simulation/cargo.ts'
import { mergeDisjoint } from '../src/interactions/definition.ts'
import { starterResidents } from '../src/worlds/starter/residents.ts'
import { repairSupplyFavor, wren } from '../src/worlds/starter/residents/wren.ts'
import { cargoInteractions } from './cargo-interactions.ts'
import type { CrewBroadcast } from './crew.ts'
import { createFarmOrders } from './farm-orders.ts'
import { createFerryRepair } from './ferry-repair.ts'
import type { createFreight } from './freight.ts'
import { createGateRepair } from './gate-repair.ts'
import { createGateSwell } from './gate-swell.ts'
import { homeInteractions } from './home-interactions.ts'
import { createInteractions } from './interactions.ts'
import type { GameplayPlaytestMetrics } from './gameplay-playtest-metrics.ts'
import type { createJournal } from './journal.ts'
import { createMaterialsWork } from './materials-work.ts'
import type { createOrders } from './orders.ts'
import { plotInteractions } from './plot-interactions.ts'
import { createResidents } from './residents.ts'

interface Options {
  notifyCrew: CrewBroadcast
  orders: Pick<ReturnType<typeof createOrders>, 'deliverCrate' | 'interactions'>
  freight: Pick<ReturnType<typeof createFreight>, 'creditCrate'>
  journal: Pick<ReturnType<typeof createJournal>, 'hearMara' | 'interactions'>
  clock: () => number
  checkpoint?: () => void
  metrics?: GameplayPlaytestMetrics
}

export function createGameInteractions(
  { state, growth }: { state: Snapshot, growth: number[] },
  physics: ReturnType<typeof createCargoPhysics>,
  { notifyCrew, orders, freight, journal, clock, checkpoint, metrics }: Options,
) {
  const gate = createGateRepair(state, notifyCrew, () => residents.keep(wren, wren.favors[0]))
  const swell = createGateSwell(state, notifyCrew)
  const residents = createResidents(state, starterResidents, physics, notifyCrew, {
    talk: { wren: gate.talk, mara: journal.hearMara },
    ...swell.hooks,
  }, checkpoint)
  const farm = createFarmOrders(state, notifyCrew, clock, checkpoint, metrics)
  const materials = createMaterialsWork(state, notifyCrew, () => residents.keep(wren, repairSupplyFavor))
  const ferry = createFerryRepair(state, physics, notifyCrew, freight.creditCrate)
  const cargo = cargoInteractions(state, physics, {
    ferry: ferry.deliverCrate,
    delivery: orders.deliverCrate,
    resident: residents.stageCrate,
  })
  const interactions = createInteractions(state, mergeDisjoint(
    gate.interactions,
    swell.interactions,
    ferry.interactions,
    residents.interactions,
    farm.interactions,
    materials.interactions,
    cargo,
    homeInteractions,
    orders.interactions,
    plotInteractions(state, growth),
    journal.interactions,
  ), physics, checkpoint, metrics)
  return { interactions, gate, residents, farm }
}
