import { favorCoins, gateFavor } from '../../src/gate-repair.ts'
import { sampleTray } from '../../src/worlds/starter/materials.ts'
import { standAt, type Scenario } from './scenario.ts'

export const materialsScenario: Scenario = {
  id: 'materials-checkout', title: 'Wren · Materials checkout', island: 'Starter Island',
  prepareWorld(state) {
    state.islandTime = 84
    state.mission = 'complete'
    state.fire = 0
    state.gateRepair = { stage: 'mended', pinHolder: null, acceptedAt: 0, mendedAt: 0 }
    state.residents.wren = { trust: 1, kept: [gateFavor], active: null }
    state.crewCoins = favorCoins
    state.lastFavorPay = { resident: 'wren', favor: gateFavor, coins: favorCoins }
  },
  placePlayer(player) {
    standAt(player, { x: sampleTray.x - 1.3 + player.id * .85, z: sampleTray.z + .35 })
  },
}
