import { gateFavor, gateMendedStage, gateRepairGuide, wrenLines } from '../../../gate-repair.ts'
import { swellFavor, swellGuide } from '../../../gate-swell.ts'
import type { ConversationContext, ResidentDefinition } from '../../../residents/definition.ts'
import { wrenSchedule } from './wren-route.ts'
import { wrenRemarks } from './remarks.ts'

// What Wren says once the crew's word has been tested. These lines come first because the crew
// should hear about a broken promise, and the way back, before anything else.
function trustLines({ state, standing, forgiven, tier }: ConversationContext): [string, string] | undefined {
  if (standing === 'wronged') {
    return ['“You told me it swung clear. It caught halfway, and now I’m back to going round the back.”',
      '“If you mean to put it right, the plane is in the toolbox. I’ll take a look myself this time.”']
  }
  if (state.gateRepair.swelling) {
    return ['“I’m going round the back again until the gate’s sorted. Wet timber, there’s nothing for it.”',
      '“Take the plane slowly along the bottom edge. A little at a time, then try the swing.”']
  }
  if (standing === 'wary') {
    return ['“The gate swings properly now. Thank you for coming back to it.”',
      '“I’ll still come and look at the next job myself, if you don’t mind. It’s nothing personal.”']
  }
  if (forgiven > 0 && tier === 'trusted') {
    return ['“I’ve stopped checking your work. You’ve kept your word, and that counts for a lot.”',
      '“The toolbox is on my bench whenever something needs mending. Take it without asking.”']
  }
  if (tier === 'trusted') {
    return ['“My favorite crew! Everything you’ve mended for me is still holding.”',
      '“The toolbox is on my bench whenever you need it. Take it without asking.”']
  }
}

// Wren mends things at the bench by the ferry approach and lives in the lilac-roofed cottage.
// The garden gate is a custom favor: talking accepts it, and its steps live in the gate repair.
// The swollen gate is checked in the world and finished by reporting back, so it can break a promise.
export const wren: ResidentDefinition = {
  id: 'wren',
  identity: { name: 'Wren', role: 'Neighbor' },
  appearance: { look: { uniform: 'default', skin: 'deep', shirt: 'coral', hair: 'bun', hairColor: 'black', hat: 'none', trousers: 'sand' } },
  schedule: wrenSchedule,
  conversation: { lines: (context) => trustLines(context) ?? wrenLines(context.state, context.kept) },
  remarks: wrenRemarks,
  favors: [{
    id: gateFavor, title: 'Wren’s gate', coins: 5, trust: 1,
    kind: { custom: true },
    available: (state) => state.gateRepair.stage === 'sagging',
    offer: '', reminder: '', detail: '', next: '',
    guide: gateRepairGuide,
    // The gate stays in the crew guide from the first lead until it settles.
    listed: (state) => !state.gateRepair.swelling && !state.residents.wren?.kept.includes(swellFavor),
  }, {
    id: swellFavor, title: 'Wren’s swollen gate', coins: 5, trust: 1,
    kind: { check: true },
    available: (state) => gateMendedStage(state) === 'settled',
    offer: '“All that rain has swollen the gate. It catches halfway again. Would you plane the edge down for me? Swing it first to see where it binds.”',
    reminder: '“Swing the gate to see where it catches, plane the edge with the toolbox, then tell me honestly how it goes.”',
    detail: '', next: '',
    guide: swellGuide,
    report: {
      question: '“So, does it swing clear now?”',
      sound: 'Tell Wren it swings clear',
      fault: 'Tell Wren it still catches',
      found: { sound: 'Your crew’s last swing went clear.', fault: 'Your crew’s last swing caught on the swollen edge.' },
    },
  }, {
    id: 'wren-pie', title: 'Fish for Wren’s pie', coins: 5, trust: 1,
    kind: { goods: 'fish', quantity: 2 },
    offer: '“I’m baking a fish pie for the neighbors on Saturday. Could you spare two fish?”',
    reminder: '“Two fish for the pie, whenever you have a catch.”',
    detail: 'Wren is baking a fish pie for the neighbors and needs two fish.',
    next: 'Catch two fish, then give them to Wren at the mending bench or the lilac-roofed cottage.',
  }, {
    id: 'wren-soup', title: 'Carrots for Wren’s soup', coins: 5, trust: 1,
    kind: { goods: 'carrots', quantity: 2 },
    offer: '“The garden won’t give me carrots until spring. Two from Island Farm would make a soup for the week.”',
    reminder: '“Two carrots for the soup, when the farm has some ready.”',
    detail: 'Wren would like two carrots for a week of soup.',
    next: 'Grow carrots at Island Farm, then give two to Wren at the mending bench or the lilac-roofed cottage.',
  }],
}
