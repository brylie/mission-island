import type { ResidentDefinition } from '../../../residents/definition.ts'
import { maraFieldLines } from '../../../journal/outing.ts'
import { ferryServiceRestored } from '../../../ferry-repair.ts'
import { maraRemarks } from './remarks.ts'
import { distance, harborDock } from '../../../world.ts'

const porch = { x: -38.6, z: -24 }
const landing = { x: harborDock.x - .7, z: -28.4 }
const dock = { x: harborDock.x - .7, z: -33.4 }
const route = [porch, landing, dock].map((point) => ({ point }))
const commuteHours = .25

// Mara fishes from the small dock from dawn to dusk and lives in the teal-roofed house by the depot trail.
export const mara: ResidentDefinition = {
  id: 'mara',
  identity: { name: 'Mara', role: 'Fisher' },
  appearance: { look: { uniform: 'angler', skin: 'warm' }, dye: '#b9664a' },
  schedule: {
    home: { ...porch, heading: Math.PI }, work: { ...dock, heading: -Math.PI / 2 },
    departs: 6, returns: 18, pace: (distance(porch, landing) + distance(landing, dock)) / commuteHours,
    route: () => route,
  },
  remarks: maraRemarks,
  conversation: {
    lines({ state, kept }) {
      if (kept.includes('mara-supper')) {
        return ['“There’s the crew that fed me! That stew lasted me three suppers.”',
          '“I’ll be back at the dock in the morning if you’d like another walk.”']
      }
      return [ferryServiceRestored(state)
        ? '“The ferry ramp is open again. I watched your crew lay that deck from the dock. The whole harbor is talking about it.”'
        : state.mission === 'complete'
        ? '“Thanks for clearing the lookout. You can find more work on the board beside the depot. The ferry terminal at the end of Harbor Depot road still needs a crew.”'
        : '“Welcome to the harbor. The depot has a delivery and a lookout shift for your crew. That ramp east of here is the old ferry terminal. We’ll put it back to work someday.”',
      '“You’ll find me at the small dock most mornings. Pick up the rod from your cottage chest and cast from the dock if you’d like to try your luck.”']
    },
    fieldNotes: state => maraFieldLines(state.journal),
  },
  favors: [{
    id: 'mara-supper', title: 'Carrots for Mara’s supper', coins: 5, trust: 1,
    kind: { goods: 'carrots', quantity: 2 },
    offer: '“I’ve had fish every night this week. If your crew grows a couple of carrots at Island Farm, I’d make a proper stew.”',
    reminder: '“Two carrots from Island Farm, whenever you have them. No rush. The fish will keep.”',
    detail: 'Mara would like two carrots for a stew.',
    next: 'Grow carrots at Island Farm, then give two to Mara at the small fishing dock or her porch by the depot trail.',
  }],
}
