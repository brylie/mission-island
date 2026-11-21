import { gateFavor, gateRepairGuide, wrenLines } from '../../../gate-repair.ts'
import type { ResidentDefinition } from '../../../residents/definition.ts'
import { wrenSchedule } from './wren-route.ts'

// Wren mends things at the bench by the ferry approach and lives in the lilac-roofed cottage.
// The garden gate is a custom favor: talking accepts it, and its steps live in the gate repair.
export const wren: ResidentDefinition = {
  id: 'wren',
  identity: { name: 'Wren', role: 'Neighbor' },
  appearance: { look: { uniform: 'default', skin: 'deep', shirt: 'coral', hair: 'bun', hairColor: 'black', hat: 'none', trousers: 'sand' } },
  schedule: wrenSchedule,
  conversation: { lines: ({ state, kept }) => wrenLines(state, kept) },
  favors: [{
    id: gateFavor, title: 'Wren’s gate', coins: 5, trust: 1,
    kind: { custom: true },
    available: (state) => state.gateRepair.stage === 'sagging',
    offer: '', reminder: '', detail: '', next: '',
    guide: gateRepairGuide,
    // The gate stays in the crew guide from the first lead until it settles.
    listed: () => true,
  }],
}
