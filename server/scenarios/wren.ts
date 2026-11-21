import { favorCoins, gateAction, gateway, toolboxItem } from '../../src/gate-repair.ts'
import type { Player, Snapshot } from '../../src/protocol.ts'
import { daySeconds } from '../../src/weather.ts'
import { updateHeldItems } from '../items.ts'
import { standAt, type Scenario } from './scenario.ts'

function outsideGate(player: Player, setback: number) {
  standAt(player, { x: gateway.x + (player.id === 0 ? -.8 : .8), z: gateway.z - setback })
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
    ...garden, id: 'wren-fit', title: 'Wren · Fit and test',
    prepareWorld(state) {
      garden.prepareWorld(state)
      state.gateRepair = { stage: 'inspected', pinHolder: null, acceptedAt: 0 }
    },
    startCrew(state, players) {
      const box = toolboxItem(state)!
      const carrier = players.find(player => player.id === 0)!
      const partner = players.find(player => player.id !== carrier.id)
      Object.assign(box, { x: carrier.x - .4, z: carrier.z, y: carrier.y + .04, holder: partner ? carrier.id : null })
      state.gateRepair.pinHolder = (partner ?? carrier).id
      updateHeldItems(state)
      if (!players.every(player => gateAction(state, player) === 'fit')) throw new Error('Unreachable hinge in fit checkpoint')
    },
  },
  { ...garden, id: 'wren-discover', title: 'Wren · Discover the problem' },
  {
    ...garden, id: 'wren-morning', title: 'Wren · The next morning',
    placePlayer(player) { outsideGate(player, 3.2) },
    prepareWorld(state) {
      garden.prepareWorld(state)
      state.islandTime = daySeconds + daySeconds * .8 / 24
      state.gateRepair = { stage: 'mended', pinHolder: null, acceptedAt: 0, mendedAt: daySeconds / 4 }
      state.residentTrust.wren = 1
      state.crewCoins = favorCoins
      state.lastFavorPay = { resident: 'wren', coins: favorCoins }
    },
  },
]
