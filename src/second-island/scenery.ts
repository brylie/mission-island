import { createGullFlock } from '../gull-flock'
import { saltwindGullStops } from '../gull-sites'
import { createHare } from '../hare'
import { createCoastalFish } from '../school-fish'
import { villageWalks } from './footways'
import type { ScenerySolids } from './walking'
import { Matrix } from '@babylonjs/core/Maths/math.vector'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import '@babylonjs/core/Meshes/thinInstanceMesh'
import { createHarborBoat } from '../assets/waterfront'
import { createBrinewickFerry } from '../assets/brinewick-ferry'
import { quayBollard, quayCrateStack, rescueSkiffOutboard, rescueSlipPosts } from '../assets/geometry/brinewick-waterfront'
import { saltwindSceneryPalette } from '../assets/geometry/saltwind-palette'
import { createTree } from '../assets/props'
import { createPhenomena } from '../island-phenomena'
import { createTarnstepSpray } from './tarnstep-spray'
import type { MeshFactory } from '../island-meshes'
import { placeSiteFeatures } from '../assets/site-props'
import { distanceToRoute } from '../routes'
import { createFlocks, createSchools } from '../wildlife'
import type { WildlifeFrame } from '../wildlife'
import { buildStockpiles } from './quarry-art'
import { habitatAt } from './habitats'
import { brinewickMarketSubject } from './brinewick-market'
import { createBrinewickMarket } from './brinewick-market-art'
import { islandBuildings } from './lots'
import { clearAirfield } from './landscape'
import { createHoneyMarketStand, createLongAcreGarden } from './long-acre-art'
import { longAcreSubject } from './long-acre'
import { arrival, helipad, lowerLake, seaLevel, sites, discoveryWalks, waterfront } from './sites'
import type { MapPoint } from './sites'
import { groundHeight, nearestRoad, siteDistance, surfaceHeight, waterHeight } from './terrain'
import { createSaltwindVehicle } from './vehicles'
import { previewSandspit, sandspitShallows } from './sandspit-school'
import type { VehicleId } from './vehicles'
import { buildSigns } from './site-signs'
import { saltwindFeatures } from './site-features'
import { buildYards } from './yard-scenery'
import { ferryQuay, rescueSkiffMooring } from '../worlds/saltwind/layout/brinewick-waterfront'

const vehicleSites: Record<Exclude<VehicleId, 'helicopter'>, string> = {
  ambulance: 'hospital',
  engine: 'fire',
  patrol: 'police',
  logger: 'timber',
  hauler: 'mine',
  airplane: 'airport',
}
export function vehiclePlacement(id: VehicleId) {
  if (id === 'helicopter') return { ...helipad, y: groundHeight(helipad.x, helipad.z) + 0.20, heading: 0.38 }
  const site = sites.find((site) => site.id === vehicleSites[id])!
  const { x, z } = site.stop
  const y = Math.max(...[-1, 1].map((side) => surfaceHeight(x + Math.sin(site.heading) * side * 2, z + Math.cos(site.heading) * side * 2)))
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

const half = 0.5
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
  for (const side of [-1, 1]) {
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

function rng() {
  let seed = 7367341
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

type Plant = 'fir' | 'alder' | 'reed' | 'flower' | 'shore' | 'crop' | 'fern' | 'heather'
interface PlantTile { x: number, z: number, matrices: Map<Plant, number[]> }

function createPlants(meshes: MeshFactory, solids: ScenerySolids) {
  const random = rng()
  const tiles = new Map<string, PlantTile>()
  function place(kind: Plant, x: number, y: number, z: number, scale: number) {
    const ix = Math.floor(x / 92), iz = Math.floor(z / 92)
    const key = `${ix},${iz}`
    const tile = tiles.get(key) ?? { x: ix * 92 + 46, z: iz * 92 + 46, matrices: new Map<Plant, number[]>() }
    const matrices = tile.matrices.get(kind) ?? []
    const yaw = random() * Math.PI * 2
    const breadth = scale * (0.82 + random() * 0.42)
    if ((kind === 'fir' || kind === 'alder') && discoveryWalks.some((walk) =>
      distanceToRoute({ x, z }, [walk, walk.view]) < 3)) return
    if (kind === 'fir' || kind === 'alder') solids.add({
      x,
      z,
      heading: yaw,
      width: 0.42 * breadth,
      depth: 0.39 * breadth,
      bottom: y - 0.3 * scale,
      top: y + 3.4 * scale,
    })
    const transform = Matrix.Scaling(breadth, scale, breadth).multiply(Matrix.RotationY(yaw))
    transform.setTranslationFromFloats(x, y, z)
    matrices.push(...transform.m)
    tile.matrices.set(kind, matrices)
    tiles.set(key, tile)
  }
  const clear = (x: number, y: number, z: number, water: number) => y >= water - 0.05
    && Math.abs(groundHeight(x + 1, z) - groundHeight(x - 1, z)) < 1.8
    && Math.abs(groundHeight(x, z + 1) - groundHeight(x, z - 1)) < 1.8 && !clearAirfield(x, z)
    && nearestRoad(x, z).distance >= 10 && !sites.some((site) => siteDistance(x, z, site) < 3)
    && !villageWalks.some(({ points }) => points.length && Math.abs(points[0].x - x) < 65
      && Math.abs(points[0].z - z) < 65 && distanceToRoute({ x, z }, points) < 1.6)
    && discoveryWalks.every((walk) => distanceToRoute({ x, z }, walk.path) > 2.2 && Math.hypot(x - walk.x, z - walk.z) > 3.5)
    && !islandBuildings.some((building) => building.kind === 'cottage' && Math.hypot(x - building.x, z - building.z) < 7)
  for (let i = 0; i < 5600; i++) {
    const x = random() * 912 - 456, z = random() * 660 - 330
    const y = groundHeight(x, z), water = waterHeight(x, z)
    if (!clear(x, y, z, water)) continue
    const { coast, marsh, woods, bluff } = habitatAt(x, y, z)
    const r = random(), scale = 0.68 + random() * 0.68
    if (r < coast) place('shore', x, y, z, scale)
    else if (r < marsh * 0.81) place(r < marsh * 0.57 ? 'reed' : 'alder', x, y, z, scale)
    else if (r < woods * 0.95) place(r < woods * 0.62 ? 'fir' : 'fern', x, y, z, scale)
    else if (r < bluff) place('heather', x, y, z, scale)
    else if (r < 0.73) place('flower', x, y, z, scale)
  }
  for (const [cx, cz] of [[-215, 218], [-192, 248], [-72, 243], [98, 236]]) for (let i = 0; i < 75; i++) {
    const angle = random() * Math.PI * 2, range = Math.sqrt(random()) * 34
    const x = cx + Math.cos(angle) * range, z = cz + Math.sin(angle) * range
    const y = groundHeight(x, z), water = waterHeight(x, z)
    if (y > water + 1 && clear(x, y, z, water)) place(random() < 0.83 ? 'fir' : 'alder', x, y, z, 0.85 + random() * 0.7)
  }
  for (let row = 0; row < 21; row++) for (let ix = 0; ix < 32; ix++) {
    const x = 92 + ix * 2.68 + random() * 0.33, z = 1 + row * 2.86 + Math.floor(row / 7) * 1.2
    place('crop', x, groundHeight(x, z), z, 0.72 + random() * 0.36)
  }
  for (let row = 0; row < 21; row++) meshes.box(133.5, 17.023, 1 + row * 2.86 + Math.floor(row / 7) * 1.2, 86, 0.07, 1.47, '#b49165', undefined, false)

  function prototype(kind: Plant) {
    const root = new TransformNode(`${kind} template`, meshes.scene)
    const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: string) =>
      meshes.box(x, y, z, w, h, d, color, root, false)
    const sphere = (x: number, y: number, z: number, w: number, h: number, d: number, color: string) =>
      meshes.sphere(x, y, z, w, h, d, color, root, false, 5)
    if (kind === 'fir' || kind === 'alder') {
      box(0, 1.55, 0, 0.42, 3.7, 0.39, '#8e6b4c')
      if (kind === 'fir') for (let i = 0; i < 3; i++) {
        const tree = meshes.cylinder(0, 2.55 + i * 1.09, 0, 0.36, 3.45 - i * 0.61, 2.13, 8, i % 2 ? '#64875e' : '#507a58', root)
        meshes.shadows.removeShadowCaster(tree)
      }
      else {
        sphere(0, 3.97, 0, 3.4, 3.14, 3.17, '#86a364')
        sphere(-0.91, 3.48, 0.3, 2.28, 2.42, 2.39, '#96aa66')
      }
    }
    else if (kind === 'fern') {
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
        sphere(side * (0.16 + i * 0.14), 0.36 - i * 0.045, (i % 2 - 0.5) * 0.24, 0.27, 0.13, 0.42, i % 2 ? '#689763' : '#547d56').rotation.z = side * 0.37
      }
    }
    else if (kind === 'heather') {
      for (const side of [-1, 0, 1]) {
        sphere(side * 0.24, 0.16, 0, 0.45, 0.39, 0.42, '#718375')
        sphere(side * 0.25, 0.35 + Math.abs(side) * 0.07, side * 0.07, 0.19, 0.24, 0.22, '#ac8396')
      }
    }
    else {
      const height = kind === 'reed' ? 1.17 : kind === 'crop' ? 0.71 : 0.44
      for (const side of [-1, 1]) {
        box(side * 0.14, height * 0.43, 0, 0.075, height, 0.11, kind === 'shore' ? '#8b9b65' : '#829154').rotation.z = -side * 0.22
        sphere(side * 0.215, height * 0.94, 0, 0.19, kind === 'reed' ? 0.29 : 0.13, 0.20, kind === 'flower' ? (side > 0 ? '#efb761' : '#dc9398') : '#c1a662')
      }
    }
    return root
  }
  const models = new Map<Plant, Mesh[]>()
  for (const kind of ['fir', 'alder', 'reed', 'flower', 'shore', 'crop', 'fern', 'heather'] as const) {
    const root = prototype(kind)
    models.set(kind, root.getChildMeshes().filter((mesh): mesh is Mesh => mesh instanceof Mesh))
    root.setEnabled(false)
  }
  const details: { x: number, z: number, batch: Mesh }[] = []
  for (const tile of tiles.values()) for (const [kind, matrices] of tile.matrices) {
    for (const part of models.get(kind) ?? []) {
      part.computeWorldMatrix(true)
      const batch = part.clone(`${kind} ${tile.x},${tile.z}`, null, true)
      // Each tile binds its own matrix buffer and must have a separate vertex array.
      batch.makeGeometryUnique()
      batch.parent = null
      batch.setEnabled(true)
      batch.position.setAll(0)
      batch.rotation.setAll(0)
      batch.scaling.setAll(1)
      const local = part.getWorldMatrix()
      const transforms = new Float32Array(matrices.length)
      for (let i = 0; i < matrices.length; i += 16) local.multiply(Matrix.FromArray(matrices, i)).copyToArray(transforms, i)
      batch.thinInstanceSetBuffer('matrix', transforms, 16, true)
      if (kind !== 'fir' && kind !== 'alder' && kind !== 'crop') details.push({ x: tile.x, z: tile.z, batch })
    }
  }
  for (const parts of models.values()) parts[0]?.parent?.dispose(false, false)
  return (camera: MapPoint, overview: boolean) => {
    for (const { x, z, batch } of details) batch.setEnabled(!overview && (x - camera.x) ** 2 + (z - camera.z) ** 2 < 155 ** 2)
  }
}

function createWildlife(meshes: MeshFactory, solids: ScenerySolids) {
  const roostX = -175, roostZ = 221, roostHeight = 6.4
  const roostGround = groundHeight(roostX, roostZ)
  createTree(meshes, roostX, roostZ, roostHeight, 0, roostGround)
  solids.add({ x: roostX, z: roostZ, bottom: roostGround, top: roostGround + roostHeight / 2, width: 0.53, depth: 0.53, heading: 0 })
  const roost = { x: roostX, y: roostGround + roostHeight * 1.015, z: roostZ }
  const perch = (x: number, z: number) => ({ x, z, y: surfaceHeight(x, z) + 0.15 })
  const gulls = createGullFlock(meshes, saltwindGullStops.map((stop) => ({ ...stop, y: surfaceHeight(stop.x, stop.z) })))
  const flocks = createFlocks(meshes, [
    { center: { x: -171, z: 224, y: 59 }, range: 22, count: 5, color: '#ae8075', landing: perch(-178, 229), roost },
    { center: { x: -114, z: 79, y: 13 }, range: 14, count: 3, color: '#61576c', bat: true, landing: perch(-115, 79), roost: perch(-115, 79) },
  ])
  const schools = createSchools(meshes, [
    { swim: (time) => ({ x: lowerLake.x - 5 + 4 * Math.sin(time * 0.23), z: lowerLake.z + 23 + 2 * Math.cos(time * 0.23) }), deep: { x: 0.15, z: -0.99 }, level: lowerLake.y, isWater: ({ x, z }) => waterHeight(x, z) === lowerLake.y && groundHeight(x, z) < lowerLake.y - 0.4 },
  ])
  const sandspit = previewSandspit()
  const sandspitFish = createCoastalFish(meshes, sandspitShallows, seaLevel)
  const animals = [
    { name: 'Mallards', x: lowerLake.x, z: lowerLake.z, y: lowerLake.y + 0.24, span: 12, speed: 0.25, color: '#598978', kind: 'duck', count: 3 },
    { name: 'Hares', x: 48, z: 53, y: 0, span: 6, speed: 0.83, color: '#ae8e73', kind: 'hare', count: 2 },
    { name: 'Forest hares', x: -190, z: 227, y: 0, span: 6, speed: 0.75, color: '#ae8e73', kind: 'hare', count: 2 },
  ].flatMap((animal) => Array.from({ length: animal.count }, (_, index) => {
    const root = animal.kind === 'hare' ? createHare(meshes, animal.name, animal.color) : new TransformNode(animal.name, meshes.scene)
    if (animal.kind === 'duck') {
      meshes.sphere(0, 0.05, 0, 0.33, 0.25, 0.78, animal.color, root, false, 6)
      meshes.sphere(0, 0.18, 0.28, 0.25, 0.26, 0.23, '#426752', root, false, 6)
    }
    return { ...animal, root, index }
  }))
  return (frame: WildlifeFrame, overview: boolean) => {
    flocks(frame)
    gulls(frame)
    schools(frame)
    const school = sandspit(frame.time, frame.threats.map(({ x, z }) => ({ x, z, range: 1.9 })), frame.seek)
    sandspitFish(frame, overview ? undefined : school)
    const { time, camera } = frame
    for (const animal of animals) {
      const { root, index, x, z, span, kind, speed, y } = animal
      const visible = !overview && Math.hypot(camera.x - x, camera.z - z) < 117
      root.setEnabled(visible)
      if (!visible) continue
      const angle = time * speed + index * 0.66, r = span + index * 0.54
      const px = x + r * Math.cos(angle), pz = z + r * 0.69 * Math.sin(angle)
      const h = kind === 'hare' ? groundHeight(px, pz) + 0.16 + Math.abs(Math.sin(time * 5 + index)) * 0.25 : y
      root.position.set(px, h + Math.sin(angle * 2 + index) * 0.06, pz)
      root.rotation.y = Math.atan2(-Math.sin(angle), Math.cos(angle) * 0.69)
    }
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
  const plants = createPlants(meshes, solids)
  const wildlife = createWildlife(meshes, solids)
  const tarnstepSpray = omit === 'waterfall-spray' ? undefined : createTarnstepSpray(meshes.scene)
  const phenomena = createPhenomena(meshes.scene, [
    { ...lowerLake, name: 'Mirror Lake dawn mist', kind: 'mist', extent: 62, seed: 5183 },
    { name: 'Sandspit plankton', kind: 'glow', x: -248, y: 0, z: -272, extent: 9.8, seed: 6788 },
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
