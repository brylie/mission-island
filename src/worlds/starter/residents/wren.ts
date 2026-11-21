import { gateFavor, gateMendedStage, gateRepairGuide, wrenLines } from '../../../gate-repair.ts'
import { swellFavor, swellGuide } from '../../../gate-swell.ts'
import { gatheringAdvice, materialsGuide, materialsOpen } from '../../../materials-work.ts'
import type { ConversationContext, FavorDefinition, ResidentDefinition } from '../../../residents/definition.ts'
import type { Snapshot } from '../../../protocol.ts'
import { repairSite } from '../materials.ts'
import { wrenSchedule } from './wren-route.ts'
import { wrenRemarks } from './remarks.ts'

// A broken promise and a swollen gate come before anything else Wren has to say.
function urgentLines({ state, standing }: ConversationContext): [string, string] | undefined {
  if (standing === 'wronged') {
    return ['“You told me it swung clear. It caught halfway, and now I’m back to going round the back.”',
      '“If you mean to put it right, the plane is in the toolbox. I’ll take a look myself this time.”']
  }
  if (state.gateRepair.swelling) {
    return ['“I’m going round the back again until the gate’s sorted. Wet timber, there’s nothing for it.”',
      '“Take the plane slowly along the bottom edge. A little at a time, then try the swing.”']
  }
}

// How Wren speaks once the crew's word has been tested: wary after amends, warm once relied on.
function trustLines({ standing, forgiven, tier }: ConversationContext): [string, string] | undefined {
  if (standing === 'wary') {
    return ['“The gate swings properly now, thank you. I’ll still come and look at the next job myself, if you don’t mind.”',
      '“It’s nothing personal. I just like to see things for myself for a while.”']
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

// While the ferry path repair is under way, Wren's advice is what the crew needs next.
function materialsAdvice({ state, kept }: ConversationContext) {
  if (!materialsOpen(state) || kept.includes(repairSupplyFavor.id)) return undefined
  const { checkout, request } = state.materialsWork
  if (checkout === 'timber') return '“Could you help with the ferry path next? Bring me one piece of marked windfall from Meadow Slope Path. Leave it on my sample tray by the bench.”'
  if (checkout === 'stone') return `“${gatheringAdvice.stone} Look beside Splitstone Strand and bring me one sample.”`
  return request ? `“Bring the ${request.material} right to the edging beside my bench.”`
    : '“You’re both checked out now. At the edging beside my bench, you can choose timber or stone to finish the path.”'
}

// A broken promise or a swollen gate comes first. Otherwise Wren greets the crew as their trust stands,
// and gives directions for the ferry path while that repair is under way.
function lines(context: ConversationContext): [string, string] {
  const urgent = urgentLines(context)
  if (urgent) return urgent
  const [greeting, advice] = trustLines(context) ?? gateLines(context)
  return [greeting, materialsAdvice(context) ?? advice]
}

function gateLines({ state, kept }: ConversationContext): [string, string] {
  const [greeting, advice] = wrenLines(state, kept)
  return materialsOpen(state) && kept.includes(repairSupplyFavor.id)
    ? [greeting, '“Have a look at the edging you put in by the ferry path. The marked sources are there whenever we need more.”']
    : [greeting, advice]
}

export const repairSupplyFavor: FavorDefinition = {
  id: 'wren-edging', title: repairSite.name, coins: 5, trust: 1, kind: { custom: true },
  available: (state) => materialsOpen(state) && state.materialsWork.checkout === 'qualified',
  offer: '', reminder: '', detail: '', next: '', guide: materialsGuide, listed: materialsOpen,
}

// The pie and the soup are the favors that rebuild trust after the swollen gate, so they wait for it.
const afterSwell = (state: Snapshot) => Boolean(state.residents.wren?.kept.includes(swellFavor))

// Wren mends things at the bench by the ferry freight yard and lives in the lilac-roofed cottage.
// The garden gate is a custom favor: talking accepts it, and its steps live in the gate repair.
// The swollen gate is checked in the world and finished by reporting back, so it can break a promise.
export const wren: ResidentDefinition = {
  id: 'wren',
  identity: { name: 'Wren', role: 'Neighbor' },
  appearance: { look: { uniform: 'default', skin: 'deep', shirt: 'coral', hair: 'bun', hairColor: 'black', hat: 'none', trousers: 'sand' } },
  schedule: wrenSchedule,
  conversation: { lines },
  remarks: wrenRemarks,
  favors: [{
    id: gateFavor, title: 'Wren’s gate', coins: 5, trust: 1,
    kind: { custom: true },
    available: (state) => state.gateRepair.stage === 'sagging',
    offer: '', reminder: '', detail: '', next: '',
    guide: gateRepairGuide,
    // The gate stays in the crew guide from the first lead until it settles.
    listed: (state) => !state.gateRepair.swelling && !state.residents.wren?.kept.includes(swellFavor),
  // The edging needs the crew's materials checkout, so a crew that has worked for it hears about it first.
  }, repairSupplyFavor, {
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
    available: afterSwell,
    offer: '“I’m baking a fish pie for the neighbors on Saturday. Could you spare two fish?”',
    reminder: '“Two fish for the pie, whenever you have a catch.”',
    detail: 'Wren is baking a fish pie for the neighbors and needs two fish.',
    next: 'Catch two fish, then give them to Wren at the mending bench or the lilac-roofed cottage.',
  }, {
    id: 'wren-soup', title: 'Carrots for Wren’s soup', coins: 5, trust: 1,
    kind: { goods: 'carrots', quantity: 2 },
    available: afterSwell,
    offer: '“The garden won’t give me carrots until spring. Two from Island Farm would make a soup for the week.”',
    reminder: '“Two carrots for the soup, when the farm has some ready.”',
    detail: 'Wren would like two carrots for a week of soup.',
    next: 'Grow carrots at Island Farm, then give two to Wren at the mending bench or the lilac-roofed cottage.',
  }],
}
