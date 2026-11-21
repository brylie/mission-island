import type { Material } from '@babylonjs/core/Materials/material'
import { createBuoy, createDock, createHarborBoat } from './assets/waterfront'
import { createClothingCounter, createHomeChest, createRock, createTree, createUmbrella, createWardrobe, umbrellaColors } from './assets/props'
import { createHouse } from './assets/buildings'
import { createGardenGate } from './gate-scene'
import { createRoad, createSidewalk, createTrail } from './assets/routes'
import { playerColors } from './assets/crew'
import { clothingCounter } from './farm'
import { createBiomeScenery } from './biome-scenery'
import { juniperCenter, juniperLayout } from './juniper-habitat'
import { createFarm } from './island-farm'
import { createMarketShower } from './market-shower'
import type { MarketRunoff } from './market-runoff'
import { saltBloomPile } from './interactive-shaders/catalog'
import { createIslandShaderEffects, parallaxCottage, type StudyActors } from './interactive-shaders/island-effects'
import { nightLighting } from './weather'
import { createGrassTufts, createIslandTerrain } from './island-landscape'
import type { MeshFactory } from './island-meshes'
import { createNorthernScenery } from './island-north'
import { createPhenomena } from './island-phenomena'
import { createFerryTerminal } from './island-terminal'
import { createStarterWildlife, createUnderstory, createWildflowers } from './island-wildlife'
import { jobBoard } from './jobs'
import { footpaths, road, walkways } from './routes'
import { createShellglassTide } from './shellglass-art'
import { islandRocks, islandTrees } from './scenery'
import type { SiteFeature } from './worlds/site-feature'
import { placeSiteFeatures } from './assets/site-props'
import { beachUmbrellas, shellRocks, starterFeatures } from './worlds/starter/sites'
import { createWetPaving } from './wet-paving'
import { createSurfaceMaterial } from './materials'
import { meadowDefaults, shaderPresets, shoreDefaults, type ShaderQuality } from './shader-studies'
import type { WildlifeFrame } from './wildlife'
import { createStreetLights } from './street-lights'
import { boundaryBuoys, groundHeight, pool, streamX, tidePool, walkingHeight, waterLevel } from './terrain'
import { buildings, crewHomes } from './world'

export type IslandSurfaceTarget = 'meadow' | 'harbor-trail' | 'dock'

interface WorldSubstitutions {
  surfaceStudy?: { target: IslandSurfaceTarget; material: Material; wear: number }
  replaceBuilding?: number
  features?: readonly SiteFeature[]
  replaceFeature?: SiteFeature
  replaceFarm?: boolean
  liveParticles?: boolean
}

export function createIslandWorld(meshes: MeshFactory, substitutions: WorldSubstitutions = {}) {
  const study = substitutions.surfaceStudy
  const water = createIslandTerrain(meshes, study?.target === 'meadow' ? study : undefined)
  const harborFinish = study?.target === 'harbor-trail' ? study.material : meshes.paintRecipe('path-gravel')
  for (const { name, points, width, surface } of footpaths) {
    const finish = name === 'Harbor trail' ? harborFinish : undefined
    createTrail(meshes, name, points, width, surface, groundHeight, finish)
  }
  const paving = createSurfaceMaterial(meshes.scene, 'concrete')
  const wetPaving = createWetPaving(paving)
  for (const path of walkways) createSidewalk(meshes, path, paving)
  createRoad(meshes, road)

  buildings.forEach((building, index) => {
    if (index !== substitutions.replaceBuilding) meshes.batchModel(createHouse(meshes, building))
  })
  const homeChests = crewHomes.map(({ chest }, i) => createHomeChest(meshes, chest, playerColors[i]))
  crewHomes.forEach(({ wardrobe }, i) => createWardrobe(meshes, { ...wardrobe, z: wardrobe.z + 0.49 },
    groundHeight(wardrobe), playerColors[i]))
  createClothingCounter(meshes, { ...clothingCounter, z: clothingCounter.z - 0.65 }, groundHeight(clothingCounter))
  const showFarm = createFarm(meshes, substitutions.replaceFarm ? [] : undefined)
  showFarm([])
  const marketShower = createMarketShower(meshes)
  const boardY = groundHeight(jobBoard)
  for (const dx of [-0.66, 0.66]) meshes.box(jobBoard.x + dx, boardY + 0.91, jobBoard.z, 0.12, 1.82, 0.13, '#765641')
  meshes.box(jobBoard.x, boardY + 1.38, jobBoard.z, 1.75, 0.93, 0.14, '#996447')
  meshes.box(jobBoard.x, boardY + 1.88, jobBoard.z, 1.98, 0.14, 0.45, '#387e76')
  for (const dx of [-0.52, 0, 0.52]) {
    meshes.box(jobBoard.x + dx, boardY + 1.38, jobBoard.z + 0.077, 0.32, 0.48, 0.012, '#fff0c1', undefined, false)
  }
  createDock(meshes, saltBloomPile, study?.target === 'dock' ? study.material : undefined)
  createFerryTerminal(meshes)
  const features = (substitutions.features ?? starterFeatures).filter(feature => feature.site !== substitutions.replaceFeature?.site)
  placeSiteFeatures(meshes, features, walkingHeight)
  const shellglass = createShellglassTide(meshes, features.find(feature => feature.site === 'shellglass' && feature.model === 'tide-staff'))
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
  const blades = createGrassTufts(meshes)
  createWildflowers(meshes)
  const ferns = createUnderstory(meshes)
  const wildlife = createStarterWildlife(meshes)
  const phenomena = createPhenomena(meshes.scene, [
    { ...pool, name: 'Mirror Pool dawn mist', kind: 'mist', y: waterLevel, extent: 22, seed: 5182, scatter: true },
    ...(substitutions.liveParticles ? [] : [
      { name: 'Fernfall spray', kind: 'spray' as const, x: streamX(89.2), y: waterLevel + .04, z: 89.2, extent: 2.7, seed: 2961 },
    ]),
  ])
  const lights = createStreetLights(meshes)
  // Wren's cottage garden belongs to the island, so the Workbench shows it too. The game animates it.
  const garden = createGardenGate(meshes, playerColors.length + 1)

  beachUmbrellas.forEach(({ x, z }, index) => createUmbrella(meshes, x, z, umbrellaColors[index], groundHeight))

  const omittedBuilding = buildings.findIndex(building => building.x === parallaxCottage)
  const interactive = createIslandShaderEffects(meshes, substitutions.replaceBuilding !== omittedBuilding, boat)
  meshes.finishScenery()
  const shore = { ...shoreDefaults }
  const calm = { gust: 0, grassDistance: 0, patchContrast: 0 }
  const reducedMist = { ...shaderPresets.dawnSilver, reduced: true }
  const unlitMist = { mistDensity: 1, scattering: 0 }
  function updateEnvironment(frame: WildlifeFrame, light: number, close: boolean, runoff: MarketRunoff,
    { driftwood, quality = 'full', tideTime = frame.time, actors }: {
      driftwood?: Parameters<typeof wildlife>[1]; quality?: ShaderQuality; tideTime?: number; actors?: StudyActors
    } = {}) {
    northernScenery.update(frame.camera, close)
    wildlife(frame, driftwood)
    marketShower(frame.time, frame.camera, runoff)
    lights(frame.camera, nightLighting(frame.weather.hour))
    shore.quality = quality
    const { tide, near } = shellglass(frame, light, tideTime, shore)
    const enabled = quality !== 'off'
    water.pose(frame.time, light, frame.weather.rain, shore, near ? tide.level : waterLevel)
    const meadow = enabled ? meadowDefaults : calm
    water.meadow(frame.time, frame.camera, meadow)
    blades(frame.time, frame.camera, meadow)
    wetPaving(enabled ? Math.max(frame.weather.rain * .74, runoff.puddle) * shaderPresets.rainPolished.wetness : 0,
      shaderPresets.rainPolished.reflection)
    const mist = quality === 'low' ? reducedMist : shaderPresets.dawnSilver
    phenomena(frame, enabled ? mist : unlitMist)
    interactive({ ...frame, light }, { ...actors, runoff, tideLevel: tide.level, quality })
    return tide
  }

  return { juniper, updateEnvironment, homeChests, showFarm, boat, buoys, ferns, garden }
}
