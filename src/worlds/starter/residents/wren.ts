import { gateFavor, gateRepairGuide, wrenLines } from '../../../gate-repair.ts'
import { gatheringAdvice, materialsGuide, materialsOpen } from '../../../materials-work.ts'
import type { FavorDefinition, ResidentDefinition } from '../../../residents/definition.ts'
import { repairSite } from '../materials.ts'
import { wrenSchedule } from './wren-route.ts'

export const repairSupplyFavor: FavorDefinition = {
  id: 'wren-edging', title: repairSite.name, coins: 5, trust: 1, kind: { custom: true },
  available: (state) => materialsOpen(state) && state.materialsWork.checkout === 'qualified',
  offer: '', reminder: '', detail: '', next: '', guide: materialsGuide, listed: materialsOpen,
}

// Wren mends things at the bench by the ferry freight yard and lives in the lilac-roofed cottage.
// The garden gate is a custom favor: talking accepts it, and its steps live in the gate repair.
export const wren: ResidentDefinition = {
  id: 'wren',
  identity: { name: 'Wren', role: 'Neighbor' },
  appearance: { look: { uniform: 'default', skin: 'deep', shirt: 'coral', hair: 'bun', hairColor: 'black', hat: 'none', trousers: 'sand' } },
  schedule: wrenSchedule,
  conversation: { lines: ({ state, kept }) => {
    const [greeting, advice] = wrenLines(state, kept)
    if (!materialsOpen(state)) return [greeting, advice]
    const { checkout, request } = state.materialsWork
    if (checkout === 'timber') return [greeting, '“Could you help with the ferry path next? Bring me one piece of marked windfall from Meadow Slope Path. Leave it on my sample tray by the bench.”']
    if (checkout === 'stone') return [greeting, `“${gatheringAdvice.stone} Look beside Splitstone Strand and bring me one sample.”`]
    if (kept.includes(repairSupplyFavor.id)) return [greeting, '“Have a look at the edging you put in by the ferry path. The marked sources are there whenever we need more.”']
    return [greeting, request ? `“Bring the ${request.material} right to the edging beside my bench.”`
      : '“You’re both checked out now. At the edging beside my bench, you can choose timber or stone to finish the path.”']
  } },
  favors: [{
    id: gateFavor, title: 'Wren’s gate', coins: 5, trust: 1,
    kind: { custom: true },
    available: (state) => state.gateRepair.stage === 'sagging',
    offer: '', reminder: '', detail: '', next: '',
    guide: gateRepairGuide,
    // The gate stays in the crew guide from the first lead until it settles.
    listed: () => true,
  }, repairSupplyFavor],
}
