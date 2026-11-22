import type { Material } from '@babylonjs/core/Materials/material'
import { createFieldOutingScenery } from './assets/field-outing'
import { shellRockCap, tidePoolDressing } from './assets/geometry/tide-pool-dressing'
import { starterDecorationOffsets } from './worlds/starter/layout/sites'
import { fernfallSpray, mirrorPoolMist } from './assets/recipes/starter-phenomena'
import { createBuoy, createDock, createHarborBoat } from './assets/waterfront'
import { createClothingCounter, createHomeChest, createRock, createTree, createUmbrella, createWardrobe, umbrellaColors } from './assets/props'
import { createHouse } from './assets/buildings'
import { createGardenGate } from './gate-scene'
import { createResidentFigures } from './resident-scene'
import type { ResidentWorld } from './residents/definition'
import { residentAt } from './residents/schedule'
import { starterResidents } from './worlds/starter/residents'
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
import { depotJunction, depotLane, footpaths, harborRoad, walkways } from './routes'
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
import { boundaryBuoys, fireWatchBaseHeight, groundHeight, pool, streamX, tidePool, walkingHeight, waterLevel } from './terrain'
import { buildings, crewHomes, extinguisherStations } from './world'
import { createFireWatch } from './assets/fire-watch'
import { createFireStation } from './assets/fire-station'

export type IslandSurfaceTarget = 'meadow' | 'harbor-trail' | 'dock'

interface WorldSubstitutions {
  surfaceStudy?: { target: IslandSurfaceTarget, material: Material, wear: number }
  replaceBuilding?: number
  features?: readonly SiteFeature[]
  replaceFeature?: SiteFeature
  replaceFarm?: boolean
  replaceFireWatch?: boolean
  liveParticles?: boolean
}

const rainPavingWetness = 0.74

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
  createRoad(meshes, harborRoad)
  const { depotRoad, wardrobeZ, clothingCounterZ } = starterDecorationOffsets
  createRoad(meshes, depotLane, depotRoad.width, { lift: depotRoad.lift, marked: [depotLane[0], { x: depotJunction.x + depotRoad.markingEndX, z: depotJunction.z }] })

  const households = buildings.flatMap((building, index) => {
    if (index === substitutions.replaceBuilding) return []
    const schedule = starterResidents.find((resident) => resident.schedule.household.building === building)?.schedule
    const house = createHouse(meshes, building, schedule?.household)
    meshes.batchModel(house.root)
    return schedule ? [{ schedule, house }] : []
  })
  if (!substitutions.replaceFireWatch) createFireWatch(meshes, fireWatchBaseHeight())
  for (const station of extinguisherStations) createFireStation(meshes, station, groundHeight(station))
  function showHouseholds(state: ResidentWorld) {
    for (const { schedule, house } of households) house.showWindows(residentAt(schedule, state).windowLit)
  }
  const homeChests = crewHomes.map(({ chest }, i) => createHomeChest(meshes, chest, playerColors[i]))
  crewHomes.forEach(({ wardrobe }, i) => void createWardrobe(meshes, { ...wardrobe, z: wardrobe.z + wardrobeZ }, groundHeight(wardrobe), playerColors[i]))
  createClothingCounter(meshes, { ...clothingCounter, z: clothingCounter.z + clothingCounterZ }, groundHeight(clothingCounter))
  const showFarm = createFarm(meshes, substitutions.replaceFarm ? [] : undefined)
  showFarm([])
  const marketShower = createMarketShower(meshes)
  const boardY = groundHeight(jobBoard)
  const { panel, posts, cap, cards, color } = jobBoard.geometry
  for (const dx of posts.x) meshes.box(jobBoard.x + dx, boardY + posts.y, jobBoard.z, ...posts.size, posts.color)
  meshes.box(jobBoard.x, boardY + panel.centreY, jobBoard.z, panel.width, panel.height, panel.depth, color)
  meshes.box(jobBoard.x, boardY + cap.y, jobBoard.z, ...cap.size, cap.color)
  for (const dx of cards.x) {
    meshes.box(jobBoard.x + dx, boardY + panel.centreY, jobBoard.z + cards.z, ...cards.size, cards.color, undefined, false)
  }
  createDock(meshes, saltBloomPile, study?.target === 'dock' ? study.material : undefined)
  const ferry = createFerryTerminal(meshes)
  const features = (substitutions.features ?? starterFeatures).filter((feature) => feature.site !== substitutions.replaceFeature?.site)
  placeSiteFeatures(meshes, features, walkingHeight)
  const shellglass = createShellglassTide(meshes, features.find((feature) => feature.site === 'shellglass' && feature.model === 'tide-staff'))
  const updateFieldScenery = createFieldOutingScenery(meshes)
  for (const point of shellRocks) {
    const { geometry, heading } = point
    const rock = meshes.sphere(point.x, groundHeight(point) + geometry.centreHeight, point.z, geometry.width, geometry.height, geometry.depth, shellRockCap.rockColor)
    rock.rotation.y = heading
    const [dx, dy, dz] = shellRockCap.offset
    meshes.sphere(point.x + dx, groundHeight(point) + dy, point.z + dz, ...shellRockCap.size, shellRockCap.color)
  }
  // Limpets on the sill and wrack in the basin give the pool a scale at foot level.
  const { count: dressingCount, patch, across, along, limpet, wrack } = tidePoolDressing
  for (let i = 0; i < dressingCount; i++) {
    const a = Math.floor(i / patch.size) * patch.angle + patch.spacingAngle * (i % patch.size)
    const x = tidePool.x + (across.radius + across.variation * Math.sin(i * across.frequency)) * Math.cos(a)
    const z = tidePool.z + (along.radius + along.variation * Math.cos(i * along.frequency)) * Math.sin(a)
    const y = groundHeight({ x, z })
    if (y >= waterLevel) {
      meshes.cylinder(x, y + limpet.centreY, z, limpet.tip, limpet.base, limpet.height, limpet.sides, limpet.color)
    }
    else {
      for (let j = 0; j < wrack.count; j++) {
        const blade = meshes.sphere(x + j * wrack.spacing, y + wrack.centreY, z, ...wrack.size, wrack.colors[j % wrack.colors.length], undefined, false, wrack.segments)
        blade.rotation.z = wrack.tilt + j * wrack.tiltStep
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
    { ...mirrorPoolMist, ...pool, y: waterLevel },
    ...(substitutions.liveParticles
      ? []
      : [
          { ...fernfallSpray, x: streamX(fernfallSpray.z), y: waterLevel + fernfallSpray.aboveWater },
        ]),
  ])
  const lights = createStreetLights(meshes)
  // Wren's cottage garden and the residents belong to the island, so the Workbench shows them too. The game animates them.
  const garden = createGardenGate(meshes)
  const residents = createResidentFigures(meshes, starterResidents, playerColors.length)

  beachUmbrellas.forEach(({ x, z }, index) => void createUmbrella(meshes, x, z, umbrellaColors[index], groundHeight))

  const omittedBuilding = buildings.findIndex((building) => building.x === parallaxCottage)
  const interactive = createIslandShaderEffects(meshes, substitutions.replaceBuilding !== omittedBuilding, boat)
  meshes.finishScenery()
  const shore = { ...shoreDefaults }
  const calm = { gust: 0, grassDistance: 0, patchContrast: 0 }
  const reducedMist = { ...shaderPresets.dawnSilver, reduced: true }
  const unlitMist = { mistDensity: 1, scattering: 0 }
  function updateEnvironment(frame: WildlifeFrame, light: number, close: boolean, runoff: MarketRunoff, { driftwood, quality = 'full', tideTime = frame.time, actors }: {
    driftwood?: Parameters<typeof wildlife>[1]
    quality?: ShaderQuality
    tideTime?: number
    actors?: StudyActors
  } = {}) {
    northernScenery.update(frame.camera, close)
    const walkers = actors?.snapshot?.players.filter((player) => player.connected && player.grounded && !player.sleeping && !player.seat)
    wildlife(frame, driftwood, walkers ?? [])
    updateFieldScenery(frame.time)
    marketShower(frame.time, frame.camera, runoff)
    lights(frame.camera, nightLighting(frame.weather.hour))
    shore.quality = quality
    const { tide, near } = shellglass(frame, light, tideTime, shore)
    const enabled = quality !== 'off'
    water.pose(frame.time, light, frame.weather.rain, shore, near ? tide.level : waterLevel)
    const meadow = enabled ? meadowDefaults : calm
    water.meadow(frame.time, frame.camera, meadow)
    blades(frame.time, frame.camera, meadow)
    wetPaving(enabled ? Math.max(frame.weather.rain * rainPavingWetness, runoff.puddle) * shaderPresets.rainPolished.wetness : 0, shaderPresets.rainPolished.reflection)
    const mist = quality === 'low' ? reducedMist : shaderPresets.dawnSilver
    phenomena(frame, enabled ? mist : unlitMist)
    interactive({ ...frame, light }, { ...actors, runoff, tideLevel: tide.level, quality })
    return tide
  }

  return { juniper, updateEnvironment, homeChests, showFarm, showHouseholds, boat, buoys, ferns, garden, residents, ferry }
}
