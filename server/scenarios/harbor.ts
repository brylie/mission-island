import { crateStarts, dockEndZ, harborDock } from '../../src/world.ts'
import { standAt, type Scenario } from './scenario.ts'

export const harborScenarios: Scenario[] = [
  {
    id: 'harbor-delivery', title: 'Harbor · Load the flatbed', island: 'Starter Island',
    placePlayer(player) {
      const crate = crateStarts[0]
      standAt(player, { x: crate.x + (player.id === 0 ? -.8 : .8), z: crate.z - 1.5 })
    },
  },
  {
    id: 'dock-fishing', title: 'Fishing · Cast from the dock', island: 'Starter Island',
    placePlayer(player) {
      standAt(player, { x: harborDock.x + (player.id === 0 ? -.65 : .65), z: dockEndZ + .2 }, Math.PI)
      player.inventory = ['fishing-rod']
      player.equipped = 'fishing-rod'
    },
  },
]
