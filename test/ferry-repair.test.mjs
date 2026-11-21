import assert from 'node:assert/strict'
import test from 'node:test'
import { canOrderTimber, crewName, donationAmount, ferryNextStep, ferryProgress, ferryStages, initialFerryRepair,
  isFerryRepair, stageNeeds, tallyLines } from '../src/ferry-repair.ts'

const crate = (overrides = {}) => ({ kind: 'crate', delivered: true, holder: null, onBed: false, ...overrides })

function project({ completed = 4, mission = 'complete', active = null, coins = 20, repair, items } = {}) {
  return {
    mission, jobs: { active, completed }, crewCoins: coins, players: [{ id: 0, name: 'Ari' }],
    items: items ?? [crate(), crate(), crate()], ferryRepair: repair ?? initialFerryRepair().ferryRepair,
  }
}

test('the next step follows the crew from readiness to restored service', () => {
  assert.match(ferryNextStep(project({ mission: 'fire', completed: 0 })), /Finish the starter shift/)
  assert.match(ferryNextStep(project({ completed: 3 })), /Finish 1 more harbor order to open/)
  assert.equal(ferryNextStep(project()), 'Order timber at the ferry tally board')
  assert.match(ferryNextStep(project({ active: { id: 'farm-supplies', progress: 0 } })), /Finish the current delivery/)
  const hauling = { stage: 0, ledger: [{ coins: [0, 0], crates: [0, 0] }], haul: 2 }
  assert.match(ferryNextStep(project({ repair: hauling, items: [crate({ delivered: false }), crate({ delivered: false })] })),
    /Collect 2 timber crates from the Seabrook timber stack/)
  assert.match(ferryNextStep(project({ repair: hauling, items: [crate({ delivered: false, onBed: true })] })),
    /Drive the timber to the ferry yard and stack 2 crates/)
  const timbered = { stage: 0, ledger: [{ coins: [5, 0], crates: [2, 0] }], haul: 0 }
  assert.equal(ferryNextStep(project({ repair: timbered })), 'Donate 7 more coins at the ferry tally board')
  assert.match(ferryNextStep(project({ repair: timbered, coins: 0 })), /Earn 7 coins for the repair/)
  const restored = { stage: 3, ledger: ferryStages.map(({ coins, crates }) => ({ coins: [coins, 0], crates: [0, crates] })), haul: 0, restoredAt: 5 }
  assert.match(ferryNextStep(project({ repair: restored })), /Ferry service restored/)
  assert.equal(ferryProgress(project({ repair: restored })), 'Ferry service restored')
  assert.equal(ferryProgress(project({ repair: timbered })), 'Stage 1/3 · 5/12 coins · 2/2 timber')
  assert.match(tallyLines(project({ repair: restored })).lines[0], /Done · Brace the landing · Ari: 12 coins, 2 timber crates|Ari: 12 coins/)
})

test('donations and timber orders wait for the crew to be ready and for the crates to be free', () => {
  assert.equal(donationAmount(project({ completed: 3 })), 0)
  assert.equal(donationAmount(project({ coins: 3 })), 3)
  assert.equal(donationAmount(project({ coins: 50 })), 5)
  assert.equal(canOrderTimber(project()), true)
  assert.equal(canOrderTimber(project({ items: [crate({ holder: 1 })] })), false, 'a crate in hand is not idle')
  assert.equal(canOrderTimber(project({ active: { id: 'beach-gear', progress: 1 } })), false)
  assert.equal(canOrderTimber(project({ active: { id: 'market-fish', progress: 0 } })), true, 'a market order leaves the crates free')
  assert.equal(stageNeeds(project({ repair: { stage: 3, ledger: [], haul: 0 } })), undefined)
  assert.equal(crewName(project(), 0), 'Ari')
  assert.equal(crewName(project(), 1), 'Blue cottage', 'an absent crewmate is named for their cottage')
  assert.equal(isFerryRepair(null, 0), false)
  assert.equal(isFerryRepair({ stage: 0, ledger: [null], haul: 0 }, 0), false)
  assert.equal(isFerryRepair({ ...initialFerryRepair().ferryRepair, restoredAt: 1 }, 5), false)
})
