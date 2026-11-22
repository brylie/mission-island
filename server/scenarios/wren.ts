import { favorCoins, gateFavor, gateway, toolboxItem } from '../../src/gate-repair.ts'
import { interactions } from '../../src/interaction-options.ts'
import type { Player, Snapshot } from '../../src/protocol.ts'
import { daySeconds, hoursPerDay } from '../../src/weather.ts'
import { itemGroundClearance, updateHeldItems } from '../items.ts'
import { swellFavor } from '../../src/gate-swell.ts'
import { blankRecord } from '../../src/residents/trust.ts'
import { repairQuantity } from '../../src/materials-work.ts'
import { walkingHeight } from '../../src/terrain.ts'
import { repairSupplyFavor, wren } from '../../src/worlds/starter/residents/wren.ts'
import { standAt, type Scenario } from './scenario.ts'

const firstCrewGateLateralM = -0.8
const secondCrewGateLateralM = 0.8
const repairGateSetbackM = 1.5
const carriedToolboxLateralM = 0.4
const followupGateSetbackM = 3.2
const followupHoursAfterDawn = 0.8
const gateRepairDayFraction = 0.25
const gateRepairedAtSeconds = daySeconds * gateRepairDayFraction
const swellingDayOffset = 2
const swellingHoursAfterDawn = 4
const swollenGateToolboxSetbackM = 1.2
const trustBenchOffsetX = -0.8
const trustBenchOffsetZ = -1.2
const trustLunchAndSoupCarrots = 3
const trustPieFish = 2

function outsideGate(player: Player, setback: number) {
  standAt(player, { x: gateway.x + (player.id === 0 ? firstCrewGateLateralM : secondCrewGateLateralM), z: gateway.z - setback })
}

const garden = {
  island: 'Starter Island',
  placePlayer(player: Player) { outsideGate(player, repairGateSetbackM) },
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
      Object.assign(box, { x: carrier.x - carriedToolboxLateralM, z: carrier.z, y: carrier.y + itemGroundClearance, holder: partner ? carrier.id : null })
      state.gateRepair.pinHolder = (partner ?? carrier).id
      updateHeldItems(state)
      if (!players.every((player) => interactions(state, player)[0]?.action === 'fit')) throw new Error('Unreachable hinge in fit checkpoint')
    },
  },
  {
    ...garden,
    id: 'wren-discover',
    title: 'Wren · Discover the problem',
    prepareWorld(state) {
      garden.prepareWorld(state)
      state.islandTime = daySeconds * followupHoursAfterDawn / hoursPerDay
    },
  },
  {
    ...garden,
    id: 'wren-morning',
    title: 'Wren · The next morning',
    placePlayer(player) { outsideGate(player, followupGateSetbackM) },
    prepareWorld(state) {
      garden.prepareWorld(state)
      state.islandTime = daySeconds + daySeconds * followupHoursAfterDawn / hoursPerDay
      state.gateRepair = { stage: 'mended', pinHolder: null, acceptedAt: 0, mendedAt: gateRepairedAtSeconds }
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
      state.islandTime = daySeconds * swellingDayOffset + daySeconds * swellingHoursAfterDawn / hoursPerDay
      state.gateRepair = { stage: 'mended', pinHolder: null, acceptedAt: 0, mendedAt: gateRepairedAtSeconds, swelling: 'swollen' }
      state.residents.wren = { ...blankRecord(), trust: 1, kept: [gateFavor], active: swellFavor }
      Object.assign(toolboxItem(state)!, { x: gateway.x + 1, z: gateway.z - swollenGateToolboxSetbackM, y: walkingHeight(gateway) + itemGroundClearance, holder: null })
    },
  },
  {
    ...garden,
    id: 'wren-trust',
    title: 'Wren · Earn, lose and rebuild Trust',
    placePlayer(player, _state, seats) {
      if (player.id === 0) {
        const { work } = wren.schedule
        standAt(player, { x: work.x + trustBenchOffsetX, z: work.z + trustBenchOffsetZ }, Math.atan2(-trustBenchOffsetX, -trustBenchOffsetZ))
        player.goods.carrots = trustLunchAndSoupCarrots
        if (seats === 1) player.goods.fish = trustPieFish
      }
      else {
        outsideGate(player, repairGateSetbackM)
        player.goods.fish = trustPieFish
      }
    },
    prepareWorld(state) {
      garden.prepareWorld(state)
      state.islandTime = daySeconds * swellingDayOffset + daySeconds * swellingHoursAfterDawn / hoursPerDay
      state.gateRepair = { stage: 'mended', pinHolder: null, acceptedAt: 0, mendedAt: gateRepairedAtSeconds }
      const kept = [gateFavor, repairSupplyFavor.id]
      state.residents.wren = { ...blankRecord(), trust: kept.length, kept }
      state.materialsWork.checkout = 'qualified'
      state.materialsWork.request = { material: 'timber', delivered: repairQuantity }
    },
  },
]
