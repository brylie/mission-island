import type { ScenerySolids } from './walking'
import { createHarborBoat } from '../assets/waterfront'
import { createBrinewickFerry } from '../assets/brinewick-ferry'
import { quayBollard, quayCrateStack, rescueSkiffOutboard, rescueSlipPosts } from '../assets/geometry/brinewick-waterfront'
import { saltwindSceneryPalette } from '../assets/geometry/saltwind-palette'
import { createPhenomena } from '../island-phenomena'
import { createTarnstepSpray } from './tarnstep-spray'
import type { MeshFactory } from '../island-meshes'
import { placeSiteFeatures } from '../assets/site-props'
import type { WildlifeFrame } from '../wildlife'
import { buildStockpiles } from './quarry-art'
import { brinewickMarketSubject } from './brinewick-market'
import { createBrinewickMarket } from './brinewick-market-art'
import { createHoneyMarketStand, createLongAcreGarden } from './long-acre-art'
import { longAcreSubject } from './long-acre'
import { arrival, helipad, lowerLake, seaLevel, sites, waterfront } from './sites'
import { groundHeight, surfaceHeight } from './terrain'
import { createSaltwindVehicle } from './vehicles'
import type { VehicleId } from './vehicles'
import { buildSigns } from './site-signs'
import { saltwindFeatures } from './site-features'
import { buildYards } from './yard-scenery'
import { ferryQuay, rescueSkiffMooring } from '../worlds/saltwind/layout/brinewick-waterfront'
import { saltwindPhenomenaSites, saltwindVehicleParking } from '../worlds/saltwind/layout/scenery'
import { createSaltwindPlants } from './plant-scenery'
import { createSaltwindWildlife } from './wildlife-scenery'

const half = 0.5
const sides = [-1, 1] as const

const parkingGroundSampleOffset = 2
const vehicleSites: Record<Exclude<VehicleId, 'helicopter'>, string> = {
  ambulance: 'hospital',
  engine: 'fire',
  patrol: 'police',
  logger: 'timber',
  hauler: 'mine',
  airplane: 'airport',
}
export function vehiclePlacement(id: VehicleId) {
  if (id === 'helicopter') {
    const { heightAboveGround, heading } = saltwindVehicleParking.helicopter
    return { ...helipad, y: groundHeight(helipad.x, helipad.z) + heightAboveGround, heading }
  }
  const site = sites.find((site) => site.id === vehicleSites[id])!
  const { x, z } = site.stop
  const y = Math.max(...sides.map((side) => surfaceHeight(
    x + Math.sin(site.heading) * side * parkingGroundSampleOffset,
    z + Math.cos(site.heading) * side * parkingGroundSampleOffset,
  )))
  return { x, y, z, heading: site.heading }
}
function placeVehicles(meshes: MeshFactory, omit?: string) {
  for (const id of [...Object.keys(vehicleSites), 'helicopter'] as VehicleId[]) {
    if (id === omit) continue
    const parked = createSaltwindVehicle(meshes, id)
    const { x, y, z, heading } = vehiclePlacement(id)
    parked.position.set(x, y, z)
    parked.rotation.y = heading
    meshes.batchModel(parked)
  }
}

const rescueBobHeight = 0.065
const rescueBobSpeed = 1.7
const rescueRollAngle = 0.039
const rescueRollSpeed = 1.28

function buildWaterfront(meshes: MeshFactory) {
  const ferry = createBrinewickFerry(meshes)
  ferry.position.set(arrival.x, seaLevel, arrival.z)
  meshes.batchModel(ferry)
  const { count, baseCentreY, size, colors, band } = quayCrateStack
  const [, crateHeight] = size
  for (const { x, z } of ferryQuay.crateStacks) {
    const floor = surfaceHeight(x, z)
    for (let i = 0; i < count; i++) {
      const y = floor + i * crateHeight + baseCentreY
      meshes.box(x, y, z, ...size, colors[i % colors.length])
      for (const dx of band.x) meshes.box(x + dx, y, z, ...band.size, band.color)
    }
  }
  // A vehicle stands clear of the eight-metre ramp and the quay's manoeuvring apron.
  const lorry = createSaltwindVehicle(meshes, 'hauler')
  const { x: lorryX, y: lorryY, z: lorryZ } = ferryQuay.parkedHauler
  lorry.position.set(lorryX, lorryY, lorryZ)
  meshes.batchModel(lorry)
  const { top, body, capSize } = quayBollard
  const { slateGrey, warmWhite } = saltwindSceneryPalette
  for (const { x, z } of ferryQuay.bollards) {
    const floor = groundHeight(x, z)
    const height = top - floor
    meshes.cylinder(x, floor + height * half, z, body.topDiameter, body.bottomDiameter, height, body.sides, slateGrey)
    meshes.sphere(x, top, z, ...capSize, warmWhite)
  }
  const { x, z } = waterfront.rescue
  const posts = rescueSlipPosts
  for (const side of sides) {
    meshes.box(x + side * posts.distanceFromCentre, surfaceHeight(x, z) + posts.centreY, z, ...posts.size, posts.color)
  }
  const boat = createHarborBoat(meshes)
  const { offsetFromSlip, heading } = rescueSkiffMooring
  boat.name = 'Rescue skiff'
  boat.position.set(x + offsetFromSlip.x, offsetFromSlip.y, z + offsetFromSlip.z)
  boat.rotation.y = heading
  for (const [px, py, pz, w, h, d, color] of rescueSkiffOutboard) meshes.box(px, py, pz, w, h, d, color, boat)
  return (time: number) => {
    boat.position.y = offsetFromSlip.y + rescueBobHeight * Math.sin(time * rescueBobSpeed)
    boat.rotation.z = rescueRollAngle * Math.sin(time * rescueRollSpeed)
  }
}

export function createScenery(meshes: MeshFactory, solids: ScenerySolids, omit?: string) {
  buildStockpiles(meshes, solids)
  const firstFixture = meshes.scene.meshes.length
  buildYards(meshes, omit)
  buildSigns(meshes)
  placeSiteFeatures(meshes, saltwindFeatures, ({ x, z }) => surfaceHeight(x, z))
  placeVehicles(meshes, omit)
  createHoneyMarketStand(meshes)
  const waterfront = buildWaterfront(meshes)
  solids.capture(meshes.scene.meshes.slice(firstFixture))
  const market = omit === brinewickMarketSubject ? undefined : createBrinewickMarket(meshes, solids)
  const pollinators = omit === longAcreSubject ? undefined : createLongAcreGarden(meshes, solids)
  const plants = createSaltwindPlants(meshes, solids)
  const wildlife = createSaltwindWildlife(meshes, solids)
  const tarnstepSpray = omit === 'waterfall-spray' ? undefined : createTarnstepSpray(meshes.scene)
  const phenomena = createPhenomena(meshes.scene, [
    { ...lowerLake, ...saltwindPhenomenaSites.mirrorLakeMist },
    saltwindPhenomenaSites.sandspitPlankton,
  ])
  meshes.finishScenery()
  return (frame: WildlifeFrame, overview: boolean, rainAt?: (time: number) => number) => {
    market?.(frame.time, frame.weather, overview)
    pollinators?.(frame, overview, rainAt)
    waterfront(frame.time)
    plants(frame.camera, overview)
    wildlife(frame, overview)
    phenomena(frame)
    tarnstepSpray?.(frame)
  }
}
