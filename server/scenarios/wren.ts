import { favorCoins, gateFavor, gateway, toolboxItem } from '../../src/gate-repair.ts'
import { interactions } from '../../src/interaction-options.ts'
import type { Player, Snapshot } from '../../src/protocol.ts'
import { daySeconds } from '../../src/weather.ts'
import { updateHeldItems } from '../items.ts'
import { swellFavor } from '../../src/gate-swell.ts'
import { blankRecord } from '../../src/residents/trust.ts'
import { walkingHeight } from '../../src/terrain.ts'
import { standAt, type Scenario } from './scenario.ts'

function outsideGate(player: Player, setback: number) {
  standAt(player, { x: gateway.x + (player.id === 0 ? -0.8 : 0.8), z: gateway.z - setback })
}

const garden = {
  island: 'Starter Island',
  placePlayer(player: Player) { outsideGate(player, 1.5) },
  prepareWorld(state: Snapshot) {
    state.mission = 'complete'
    state.fire = 0
  },
}

export const wrenScenarios: Scenario[] = [
  {
    ...garden,
    id: 'wren-fit',
    title: 'Wren · Fit and test',
    prepareWorld(state) {
      garden.prepareWorld(state)
      state.gateRepair = { stage: 'inspected', pinHolder: null, acceptedAt: 0 }
      state.residents.wren = { ...state.residents.wren, active: gateFavor }
    },
    startCrew(state, players) {
      const box = toolboxItem(state)!
      const carrier = players.find((player) => player.id === 0)!
      const partner = players.find((player) => player.id !== carrier.id)
      Object.assign(box, { x: carrier.x - 0.4, z: carrier.z, y: carrier.y + 0.04, holder: partner ? carrier.id : null })
      state.gateRepair.pinHolder = (partner ?? carrier).id
      updateHeldItems(state)
      if (!players.every((player) => interactions(state, player)[0]?.action === 'fit')) throw new Error('Unreachable hinge in fit checkpoint')
    },
  },
  { ...garden, id: 'wren-discover', title: 'Wren · Discover the problem' },
  {
    ...garden,
    id: 'wren-morning',
    title: 'Wren · The next morning',
    placePlayer(player) { outsideGate(player, 3.2) },
    prepareWorld(state) {
      garden.prepareWorld(state)
      state.islandTime = daySeconds + daySeconds * 0.8 / 24
      state.gateRepair = { stage: 'mended', pinHolder: null, acceptedAt: 0, mendedAt: daySeconds / 4 }
      state.residents.wren = { ...blankRecord(), trust: 1, kept: [gateFavor] }
      state.crewCoins = favorCoins
      state.lastFavorPay = { resident: 'wren', favor: gateFavor, coins: favorCoins }
    },
  },
  {
    // Two days on, the crew has agreed to plane the swollen gate. The toolbox is set down by the gate and Wren is
    // at the mending bench, so the crew can check the swing and walk over to report, honestly or not.
    ...garden,
    id: 'wren-swell',
    title: 'Wren · The swollen gate',
    prepareWorld(state) {
      garden.prepareWorld(state)
      state.islandTime = daySeconds * 2 + daySeconds * 4 / 24
      state.gateRepair = { stage: 'mended', pinHolder: null, acceptedAt: 0, mendedAt: daySeconds / 4, swelling: 'swollen' }
      state.residents.wren = { ...blankRecord(), trust: 1, kept: [gateFavor], active: swellFavor }
      Object.assign(toolboxItem(state)!, { x: gateway.x + 1, z: gateway.z - 1.2, y: walkingHeight(gateway) + 0.04, holder: null })
    },
  },
]
