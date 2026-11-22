import { crateStarts, dockEndZ, harborDock } from '../../src/world.ts'
import { standAt, type Scenario } from './scenario.ts'

const firstCrewCrateLateralM = -0.8
const secondCrewCrateLateralM = 0.8
const crewCrateSetbackM = 1.5
const firstCrewDockLateralM = -0.65
const secondCrewDockLateralM = 0.65
const crewDockEndOffsetM = 0.2

export const harborScenarios: Scenario[] = [
  {
    id: 'harbor-delivery',
    title: 'Harbor · Load the flatbed',
    island: 'Starter Island',
    placePlayer(player) {
      const crate = crateStarts[0]
      standAt(player, { x: crate.x + (player.id === 0 ? firstCrewCrateLateralM : secondCrewCrateLateralM), z: crate.z - crewCrateSetbackM })
    },
  },
  {
    id: 'dock-fishing',
    title: 'Fishing · Cast from the dock',
    island: 'Starter Island',
    placePlayer(player) {
      standAt(player, { x: harborDock.x + (player.id === 0 ? firstCrewDockLateralM : secondCrewDockLateralM), z: dockEndZ + crewDockEndOffsetM }, Math.PI)
      player.inventory = ['fishing-rod']
      player.equipped = 'fishing-rod'
    },
  },
]
