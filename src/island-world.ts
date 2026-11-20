import {
  createBuoy, createDock, createHarborBoat, createHomeChest, createHouse, createRock, createRoad,
  createTrail, createTree, createUmbrella, playerColors, umbrellaColors,
} from './island-assets'
import { createFarm, createMarketAwning } from './island-farm'
import { createGrassTufts, createGulls, createIslandTerrain } from './island-landscape'
import type { MeshFactory } from './island-meshes'
import { createNorthernScenery } from './island-north'
import { createFishSchools, createWildflowers } from './island-wildlife'
import { jobBoard } from './jobs'
import { footpaths, road, walkways } from './routes'
import { islandRocks, islandTrees } from './scenery'
import { createStreetLights } from './street-lights'
import { boundaryBuoys, groundHeight } from './terrain'
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
  const boat = createHarborBoat(meshes)
  const buoys = boundaryBuoys.map(({ x, z }) => createBuoy(meshes, x, z))

  for (const tree of islandTrees) createTree(meshes, tree.x, tree.z, tree.height, tree.variant, groundHeight(tree))
  for (const { x, z, size, angle, light, ground } of islandRocks) {
    createRock(meshes, x, z, size, angle, light, ground)
  }
  const northernScenery = createNorthernScenery(meshes)
  createGrassTufts(meshes)
  createWildflowers(meshes)
  const gulls = createGulls(meshes)
  const fishSchools = createFishSchools(meshes)
  const lights = createStreetLights(meshes)

  const umbrellas = [[27, -27], [33, -29], [38, -25]]
  umbrellas.forEach(([x, z], index) => createUmbrella(meshes, x, z, umbrellaColors[index]))

  meshes.finishScenery()
  return { water, homeChests, showFarm, boat, buoys, northernScenery, gulls, fishSchools, lights }
}
