import {
  createBuoy, createDock, createHarborBoat, createHomeChest, createHouse, createRock, createRoad,
  createTrail, createTree, createUmbrella, playerColors, umbrellaColors,
} from './island-assets'
import { createFarm, createMarketAwning } from './island-farm'
import { createGrassTufts, createIslandTerrain } from './island-landscape'
import type { MeshFactory } from './island-meshes'
import { createNorthernScenery } from './island-north'
import { createPhenomena } from './island-phenomena'
import { createStarterWildlife, createUnderstory, createWildflowers } from './island-wildlife'
import { jobBoard } from './jobs'
import { footpaths, road, shellglassPoint, walkways } from './routes'
import { islandRocks, islandTrees } from './scenery'
import { placeSiteFeatures } from './site-props'
import { starterFeatures } from './starter-sites'
import { createStreetLights } from './street-lights'
import { boundaryBuoys, groundHeight, pool, streamX, walkingHeight, waterLevel } from './terrain'
import { buildings, crewHomes } from './world'

export function createIslandWorld(meshes: MeshFactory) {
  const water = createIslandTerrain(meshes)
  for (const { name, points, width } of footpaths) createTrail(meshes, name, points, width)
  for (const { name, points, width } of walkways) createTrail(meshes, name, points, width, true)
  createRoad(meshes, road)

  for (const building of buildings) meshes.batchModel(createHouse(meshes, building))
  const homeChests = crewHomes.map(({ chest }, i) => createHomeChest(meshes, chest, playerColors[i]))
  const showFarm = createFarm(meshes)
  showFarm([])
  createMarketAwning(meshes)
  const boardY = groundHeight(jobBoard)
  for (const dx of [-0.66, 0.66]) meshes.box(jobBoard.x + dx, boardY + 0.91, jobBoard.z, 0.12, 1.82, 0.13, '#765641')
  meshes.box(jobBoard.x, boardY + 1.38, jobBoard.z, 1.75, 0.93, 0.14, '#996447')
  meshes.box(jobBoard.x, boardY + 1.88, jobBoard.z, 1.98, 0.14, 0.45, '#387e76')
  for (const dx of [-0.52, 0, 0.52]) {
    meshes.box(jobBoard.x + dx, boardY + 1.38, jobBoard.z + 0.077, 0.32, 0.48, 0.012, '#fff0c1', undefined, false)
  }
  createDock(meshes)
  placeSiteFeatures(meshes, starterFeatures, walkingHeight)
  for (const [dx, dz, size, heading] of [[.63, -.98, .68, .9], [1.14, -1.55, .41, 1.6], [.05, -1.36, .43, -1.1]]) {
    const point = { x: shellglassPoint.x + dx, z: shellglassPoint.z + dz }
    const rock = meshes.sphere(point.x, groundHeight(point) + .055, point.z, size, .23, size * .65, '#798b80')
    rock.rotation.y = heading
    meshes.sphere(point.x + .025, groundHeight(point) + .165, point.z - .015, .16, .055, .12, '#ecd3aa')
  }
  const boat = createHarborBoat(meshes)
  const buoys = boundaryBuoys.map(({ x, z }) => createBuoy(meshes, x, z))

  for (const tree of islandTrees) createTree(meshes, tree.x, tree.z, tree.height, tree.variant, groundHeight(tree))
  for (const { x, z, size, angle, light, ground } of islandRocks) {
    createRock(meshes, x, z, size, angle, light, ground)
  }
  const northernScenery = createNorthernScenery(meshes)
  createGrassTufts(meshes)
  createWildflowers(meshes)
  createUnderstory(meshes)
  const wildlife = createStarterWildlife(meshes)
  const phenomena = createPhenomena(meshes.scene, [
    { ...pool, name: 'Mirror Pool dawn mist', kind: 'mist', y: waterLevel, extent: 22, seed: 5182 },
    { name: 'Fernfall spray', kind: 'spray', x: streamX(88), y: groundHeight({ x: streamX(88), z: 88 }), z: 88, extent: 4.3, seed: 2961 },
    { name: 'Shellglass plankton', kind: 'glow', x: 45.2, y: waterLevel, z: -38.3, extent: 5.8, seed: 6787 },
  ])
  const lights = createStreetLights(meshes)

  const umbrellas = [[27, -27], [33, -29], [38, -25]]
  umbrellas.forEach(([x, z], index) => createUmbrella(meshes, x, z, umbrellaColors[index]))

  meshes.finishScenery()
  return { water, homeChests, showFarm, boat, buoys, northernScenery, wildlife, phenomena, lights }
}
