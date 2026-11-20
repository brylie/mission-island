import {
  createBuoy, createDock, createHarborBoat, createHomeChest, createHouse, createRock, createRoad,
  createSidewalk, createTrail, createTree, createUmbrella, playerColors, umbrellaColors,
} from './island-assets'
import { createBiomeScenery } from './biome-scenery'
import { juniperCenter, juniperLayout } from './juniper-habitat'
import { createFarm, createMarketAwning } from './island-farm'
import { createGrassTufts, createIslandTerrain } from './island-landscape'
import type { MeshFactory } from './island-meshes'
import { createNorthernScenery } from './island-north'
import { createPhenomena } from './island-phenomena'
import { createStarterWildlife, createUnderstory, createWildflowers } from './island-wildlife'
import { jobBoard } from './jobs'
import { footpaths, road, walkways } from './routes'
import { islandRocks, islandTrees } from './scenery'
import type { SiteFeature } from './site-props'
import { placeSiteFeatures } from './site-props'
import { beachUmbrellas, shellRocks, starterFeatures } from './starter-sites'
import { createStreetLights } from './street-lights'
import { boundaryBuoys, groundHeight, pool, streamX, tidePool, walkingHeight, waterLevel } from './terrain'
import { buildings, crewHomes } from './world'

interface WorldSubstitutions {
  replaceBuilding?: number
  features?: readonly SiteFeature[]
  replaceFeature?: SiteFeature
  replaceFarm?: boolean
}

export function createIslandWorld(meshes: MeshFactory, substitutions: WorldSubstitutions = {}) {
  const water = createIslandTerrain(meshes)
  for (const { name, points, width, surface } of footpaths) createTrail(meshes, name, points, width, surface, groundHeight)
  for (const path of walkways) createSidewalk(meshes, path)
  createRoad(meshes, road)

  buildings.forEach((building, index) => {
    if (index !== substitutions.replaceBuilding) meshes.batchModel(createHouse(meshes, building))
  })
  const homeChests = crewHomes.map(({ chest }, i) => createHomeChest(meshes, chest, playerColors[i]))
  const showFarm = createFarm(meshes, substitutions.replaceFarm ? [] : undefined)
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
  placeSiteFeatures(meshes, (substitutions.features ?? starterFeatures).filter(feature => feature.site !== substitutions.replaceFeature?.site), walkingHeight)
  for (const point of shellRocks) {
    const { size, heading } = point
    const rock = meshes.sphere(point.x, groundHeight(point) + .055, point.z, size, .23, size * .65, '#798b80')
    rock.rotation.y = heading
    meshes.sphere(point.x + .025, groundHeight(point) + .165, point.z - .015, .16, .055, .12, '#ecd3aa')
  }
  // Limpets on the sill and wrack in the basin give the pool a scale at foot level.
  for (let i = 0; i < 17; i++) {
    const patch = Math.floor(i / 4)
    const a = patch * 1.77 + .105 * (i % 4)
    const x = tidePool.x + (2.18 + .17 * Math.sin(i * 4.1)) * Math.cos(a), z = tidePool.z + (1.47 + .15 * Math.cos(i * 2.5)) * Math.sin(a)
    const y = groundHeight({ x, z })
    if (y >= waterLevel) {
      meshes.cylinder(x, y + .033, z, .024, .16, .085, 7, '#d4c1a0')
    } else {
      for (let j = 0; j < 3; j++) {
        const blade = meshes.sphere(x + j * .046, y + .074, z, .074, .21, .15, j % 2 ? '#848045' : '#65744b', undefined, false, 5)
        blade.rotation.z = .3 + j * .25
      }
    }
  }
  const boat = createHarborBoat(meshes)
  const buoys = boundaryBuoys.map(({ x, z }) => createBuoy(meshes, x, z))

  for (const tree of islandTrees) createTree(meshes, tree.x, tree.z, tree.height, tree.variant, groundHeight(tree))
  for (const { x, z, size, angle, light, ground } of islandRocks) {
    createRock(meshes, x, z, size, angle, light, ground)
  }
  const juniper = createBiomeScenery(meshes, juniperLayout, juniperCenter, groundHeight)
  const northernScenery = createNorthernScenery(meshes)
  createGrassTufts(meshes)
  createWildflowers(meshes)
  createUnderstory(meshes)
  const wildlife = createStarterWildlife(meshes)
  const phenomena = createPhenomena(meshes.scene, [
    { ...pool, name: 'Mirror Pool dawn mist', kind: 'mist', y: waterLevel, extent: 22, seed: 5182 },
    { name: 'Fernfall spray', kind: 'spray', x: streamX(89.2), y: waterLevel + .04, z: 89.2, extent: 2.7, seed: 2961 },
    { name: 'Shellglass plankton', kind: 'glow', ...tidePool, y: waterLevel, extent: 1.7, seed: 6787 },
  ])
  const lights = createStreetLights(meshes)

  beachUmbrellas.forEach(({ x, z }, index) => createUmbrella(meshes, x, z, umbrellaColors[index], groundHeight))

  meshes.finishScenery()
  return { juniper, water, homeChests, showFarm, boat, buoys, northernScenery, wildlife, phenomena, lights }
}
