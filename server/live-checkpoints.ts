import { favorCoins, gateAction, gateway, toolboxItem } from '../src/gate-repair.ts'
import type { TrialRun } from '../src/live-checkpoints.ts'
import type { Player, Snapshot } from '../src/protocol.ts'
import { walkingHeight } from '../src/terrain.ts'
import { daySeconds, weatherAt } from '../src/weather.ts'
import { crateStarts } from '../src/world.ts'
import { updateHeldItems } from './items.ts'

export function prepareTrial(state: Snapshot, settings: TrialRun) {
  const { checkpoint } = settings
  const atDepot = checkpoint === 'harbor-delivery'
  const nextMorning = checkpoint === 'wren-morning'
  state.playtest = { ...settings, started: false }
  state.islandTime = nextMorning ? daySeconds + daySeconds * .8 / 24 : 0
  state.weather = weatherAt(state.islandTime)
  if (!atDepot) {
    state.mission = 'complete'
    state.fire = 0
  }
  if (checkpoint === 'wren-fit') state.gateRepair = { stage: 'inspected', pinHolder: null, acceptedAt: 0 }
  if (nextMorning) {
    state.gateRepair = { stage: 'mended', pinHolder: null, acceptedAt: 0, mendedAt: daySeconds / 4 }
    state.residentTrust.wren = 1
    state.crewCoins = favorCoins
    state.lastFavorPay = { resident: 'wren', coins: favorCoins }
  }

  function place(player: Player) {
    const anchor = atDepot ? crateStarts[0] : gateway
    const x = anchor.x + (player.id === 0 ? -.8 : .8)
    const z = anchor.z - (nextMorning ? 3.2 : 1.5)
    Object.assign(player, { x, z, y: walkingHeight({ x, z }), heading: 0, name: 'Crew ' + (player.id + 1) })
  }

  function startWhenReady() {
    const players = state.players.filter(player => player.connected)
    if (players.length !== settings.seats) return false
    if (checkpoint === 'wren-fit') {
      const box = toolboxItem(state)!
      const carrier = players.find(player => player.id === 0)!
      const solo = settings.seats === 1
      Object.assign(box, { x: carrier.x - .4, z: carrier.z, y: carrier.y + .04, holder: solo ? null : carrier.id })
      state.gateRepair.pinHolder = solo ? carrier.id : 1
      updateHeldItems(state)
      if (!players.every(player => gateAction(state, player) === 'fit')) throw new Error('Unreachable hinge in fit checkpoint')
    }
    state.playtest!.started = true
    return true
  }
  return { place, startWhenReady }
}
