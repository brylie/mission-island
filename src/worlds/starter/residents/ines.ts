import type { ResidentDefinition } from '../../../residents/definition.ts'
import { inesRemarks } from './remarks.ts'

const porch = { x: 43, z: 18.7 }
const square = { x: 42, z: 12 }
const stall = { x: 35.8, z: 7.2 }

// Ines keeps the Seabrook Market stall, setting out produce at its west end, and lives in the coral house across the square.
export const ines: ResidentDefinition = {
  id: 'ines',
  identity: { name: 'Ines', role: 'Shopkeeper' },
  appearance: { look: { uniform: 'default', skin: 'medium', shirt: 'lagoon', hair: 'coils', hairColor: 'black', hat: 'none', trousers: 'slate' } },
  schedule: {
    home: { ...porch, heading: Math.PI }, work: { ...stall, heading: Math.PI / 2 },
    departs: 7.5, returns: 18, pace: 40,
    route: () => [porch, square, stall].map((point) => ({ point })),
  },
  remarks: inesRemarks,
  conversation: {
    lines({ tier, kept }) {
      if (kept.includes('ines-display')) {
        return ['“Morning, you two! The fish display sold out before noon. People asked who caught it.”',
          '“I set the best produce out first thing. Come by early if your crew has an order to fill.”']
      }
      return [tier === 'stranger' ? '“Welcome to Seabrook Market. You must be the new harbor crew.”' : '“Good to see the harbor crew again.”',
        '“I buy what the crew catches and grows, and carrot seed is always in stock. Crew orders from the job board come through here too.”']
    },
  },
  favors: [{
    id: 'ines-display', title: 'Fresh fish for the market display', coins: 5, trust: 1,
    kind: { goods: 'fish', quantity: 2 },
    offer: '“My morning display looks bare without fresh fish. Could your crew bring me two from the harbor?”',
    reminder: '“Two fresh fish for the display, when you have a catch. Mara can show you the best spot on the dock.”',
    detail: 'Ines needs two fresh fish for the morning display.',
    next: 'Catch two fish, then give them to Ines at the Seabrook Market stall or her coral house across the square.',
  }],
}
