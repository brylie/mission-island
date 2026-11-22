import { favorCoins, gateFavor } from '../../src/gate-repair.ts'
import { initialMaterialsWork } from '../../src/materials-work.ts'
import { blankRecord } from '../../src/residents/trust.ts'
import { sampleTray } from '../../src/worlds/starter/materials.ts'
import { standAt, type Scenario } from './scenario.ts'

const materialsTrialSeconds = 84
const firstCrewTraySetbackM = 1.3
const trayCrewSpacingM = 0.85
const crewTrayForwardM = 0.35

export const materialsScenario: Scenario = {
  id: 'materials-checkout',
  title: 'Wren · Materials checkout',
  island: 'Starter Island',
  prepareWorld(state) {
    state.islandTime = materialsTrialSeconds
    state.mission = 'complete'
    state.fire = 0
    state.gateRepair = { stage: 'mended', pinHolder: null, acceptedAt: 0, mendedAt: 0 }
    state.residents.wren = { ...blankRecord(), trust: 1, kept: [gateFavor] }
    state.materialsWork = initialMaterialsWork()
    state.crewCoins = favorCoins
    state.lastFavorPay = { resident: 'wren', favor: gateFavor, coins: favorCoins }
  },
  placePlayer(player) {
    standAt(player, { x: sampleTray.x - firstCrewTraySetbackM + player.id * trayCrewSpacingM, z: sampleTray.z + crewTrayForwardM })
    delete player.materials
  },
}
