import { createHare } from '../hare'
import { villageWalks } from './footways'
import type { ScenerySolids } from './walking'
import { Matrix } from '@babylonjs/core/Maths/math.vector'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import '@babylonjs/core/Meshes/thinInstanceMesh'
import { createHarborBoat } from '../assets/waterfront'
import { createTree } from '../assets/props'
import { createPhenomena } from '../island-phenomena'
import type { MeshFactory } from '../island-meshes'
import { placeSiteFeatures } from '../assets/site-props'
import { distanceToRoute } from '../routes'
import { createFlocks, createSchools } from '../wildlife'
import type { WildlifeFrame } from '../wildlife'
import { buildStockpiles, buildTarnstepLedges } from './quarry-art'
import { habitatAt } from './habitats'
import { brinewickMarketSubject } from './brinewick-market'
import { createBrinewickMarket } from './brinewick-market-art'
import { createExterior } from './exteriors'
import { islandBuildings } from './lots'
import { clearAirfield } from './landscape'
import { createHoneyMarketStand, createLongAcreGarden } from './long-acre-art'
import { longAcreSubject } from './long-acre'
import { arrival, helipad, lowerLake, pavedYards, roundYards, sites, discoveryWalks, waterfront } from './sites'
import type { MapPoint } from './sites'
import { fallsX, fallsY, groundHeight, nearestRoad, siteDistance, surfaceHeight, waterHeight } from './terrain'
import { createSaltwindVehicle } from './vehicles'
import type { VehicleId } from './vehicles'
import { buildSigns } from './site-signs'
import { saltwindFeatures } from './site-features'

const cream = '#f5e5c2', slate = '#8a9185', pavement = '#858780'

function createFerry(meshes: MeshFactory) {
  const root = new TransformNode('Brinewick Ferry', meshes.scene)
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: string) =>
    meshes.box(x, y, z, w, h, d, color, root)
  box(0, .13, -3.02, 12, 1.32, 36, '#3b5158')
  box(0, .96, -3.07, 11.7, .77, 35.78, '#a9473d')
  box(0, 1.58, -3.04, 11.8, .38, 35.70, '#bca685')
  box(0, 1.12, -21.20, 10.7, .87, .62, '#375058')
  for (const side of [-1, 1]) {
    box(side * 5.65, 1.49, -2.98, .37, .38, 35.9, cream)
    box(side * 5.6, 2.64, -3, .13, .16, 35.45, cream)
    for (let z = -19; z < 15; z += 4.5) box(side * 5.6, 2.18, z, .17, .92, .17, cream)
    box(side * 3.2, 1.79, 3, .13, .018, 12.7, cream)
    box(side * 5.1, 2.10, 12.7, .95, .78, 2.0, '#52696c')
  }
  box(0, 3.22, -15.9, 9.1, 3, 7.65, cream)
  box(0, 4.86, -15.9, 9.6, .31, 8.16, '#42686c')
  box(0, 3.84, -12.04, 7.75, 1.12, .10, '#547a83')
  for (const x of [-2.75, -1.37, 0, 1.37, 2.75]) box(x, 3.84, -11.98, .12, 1.18, .08, cream)
  box(-3.65, 5.54, -18.12, .69, 1.99, .81, '#ac5648')
  box(.47, 5.75, -16, .13, 1.63, .13, '#626f69')
  box(.47, 6.27, -16, 1.38, .10, .13, '#626f69')
  return root
}

function paintBay(meshes: MeshFactory, x: number, y: number, z: number, width: number, depth: number) {
  for (const side of [-1, 1]) meshes.box(x + side * width / 2, y + .024, z, .14, .025, depth, cream, undefined, false)
  meshes.box(x, y + .026, z - depth / 2, width, .025, .14, cream, undefined, false)
}

const vehicleSites: Record<Exclude<VehicleId, 'helicopter'>, string> = {
  ambulance: 'hospital', engine: 'fire', patrol: 'police', logger: 'timber', hauler: 'mine', airplane: 'airport',
}
export function vehiclePlacement(id: VehicleId) {
  if (id === 'helicopter') return { ...helipad, y: groundHeight(helipad.x, helipad.z) + .20, heading: .38 }
  const site = sites.find(site => site.id === vehicleSites[id])!
  const { x, z } = site.stop
  const y = Math.max(...[-1, 1].map(side => surfaceHeight(x + Math.sin(site.heading) * side * 2, z + Math.cos(site.heading) * side * 2)))
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

function buildYards(meshes: MeshFactory, omit?: string) {
  for (const building of islandBuildings) {
    if (building.site === omit) continue
    const { x, z, width, depth, facing } = building
    const sideways = Math.abs(Math.sin(facing)) > .5
    const a = sideways ? depth / 2 : width / 2, b = sideways ? width / 2 : depth / 2
    const y = groundHeight(x, z)
    const low = Math.min(...[-1, 1].flatMap((dx) => [-1, 1].map((dz) => groundHeight(x + dx * a, z + dz * b))))
    const model = createExterior(meshes, building, Math.max(.48, y - low + .22))
    model.position.set(x, y, z)
    model.rotation.y = facing
    meshes.batchModel(model)
  }

  for (const pad of pavedYards.filter(({ id }) => !['runway', 'taxi', 'air-apron'].includes(id))) {
    meshes.box(pad.x, pad.y - .12, pad.z, pad.width, .24, pad.depth, pavement, undefined, false)
  }
  const [, mine] = roundYards
  const padRoot = new TransformNode('Mine turnaround', meshes.scene)
  const turnaround = meshes.cylinder(mine.x, mine.y - .11, mine.z, mine.radius * 2, mine.radius * 2, .22, 42, pavement, padRoot)
  turnaround.receiveShadows = true
  meshes.shadows.removeShadowCaster(turnaround)
  for (const site of sites.filter(({ id }) => ['fish-market', 'farmers-market', 'hospital', 'fire', 'mine', 'timber'].includes(id))) {
    paintBay(meshes, site.stop.x, surfaceHeight(site.stop.x, site.stop.z), site.stop.z, site.id === 'fire' ? 5.1 : 4.4, site.id === 'timber' ? 13 : 9.5)
  }

  const padY = groundHeight(helipad.x, helipad.z)
  meshes.cylinder(helipad.x, padY + .09, helipad.z, helipad.radius * 2, helipad.radius * 2, .18, 40, '#677670')
  for (const side of [-1, 1]) meshes.box(helipad.x + side * 1.48, padY + .194, helipad.z, .41, .025, 4.8, cream, undefined, false)
  meshes.box(helipad.x, padY + .196, helipad.z, 2.9, .025, .44, cream, undefined, false)
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6
    meshes.box(helipad.x + 8.1 * Math.cos(angle), padY + .2, helipad.z + 8.1 * Math.sin(angle), .22, .06, .22, '#f1c679')
  }

  buildTarnstepLedges(meshes)

  // A clear service corridor runs between the log stacks and the mill.
  for (const [x, z] of [[-204, 164], [-209, 177], [-225, 177]]) for (let layer = 0; layer < 3; layer++) {
    for (let n = 0; n < 5 - layer; n++) {
      const log = meshes.cylinder(x + (n + layer * .5 - 2) * .76, 30.42 + layer * .61, z, .74, .82, 7.5, 10, '#936b47')
      log.rotation.x = Math.PI / 2
      for (const side of [-1, 1]) meshes.cylinder(log.position.x, log.position.y, z + side * 3.76, .61, .61, .035, 10, '#d4ad73').rotation.x = Math.PI / 2
    }
  }
  for (const z of [182, 187, 192, 197]) for (const x of [9, 16, 24, 31]) {
    const y = groundHeight(x, z)
    const height = .76 + ((x + z) % 3) * .09
    meshes.box(x, y + .07, z, .98, .14, .48, '#989888')
    meshes.box(x, y + height / 2 + .1, z, .74, height, .30, slate)
    meshes.sphere(x, y + height + .1, z, .74, .27, .31, slate, undefined, true, 8)
    if ((x + z) % 3 === 0) {
      meshes.cylinder(x + .28, y + .14, z - .4, .19, .14, .28, 7, '#a58167')
      for (const dx of [-.05, .05]) {
        meshes.box(x + .28 + dx, y + .34, z - .4, .022, .16, .022, '#778958')
        meshes.sphere(x + .28 + dx, y + .44, z - .4, .12, .10, .12, '#e1be92')
      }
    }
  }
  for (const dx of [-19, 19]) meshes.box(20 + dx, 30.43, 190, .55, .87, 28, '#a39c86')
  for (const dx of [-10.3, 10.3]) meshes.box(20 + dx, 30.43, 176, 17.4, .87, .55, '#a39c86')
  meshes.box(20, 30.42, 204, 38.4, .85, .56, '#a39c86')
}

function buildWaterfront(meshes: MeshFactory) {
  const ferry = createFerry(meshes)
  ferry.position.set(arrival.x, 0, arrival.z)
  meshes.batchModel(ferry)
  for (const [x, z] of [[-287, -197], [-288, -203], [-261, -205], [-263, -202]]) {
    const y = surfaceHeight(x, z)
    for (let i = 0; i < 3; i++) {
      meshes.box(x, y + i * .59 + .32, z, 1.3, .59, 1.2, i % 2 ? '#95a690' : '#c4a275')
      for (const dx of [-.52, .52]) meshes.box(x + dx, y + i * .59 + .32, z, .12, .61, 1.24, '#e2c29a')
    }
  }
  // A vehicle stands clear of the eight-metre ramp and the quay's manoeuvring apron.
  const lorry = createSaltwindVehicle(meshes, 'hauler')
  lorry.position.set(-278.3, 1.78, -268.5)
  meshes.batchModel(lorry)
  for (const x of [-280.1, -267.9, -256.3, -249.7]) {
    const z = x < -260 ? -241 : -260
    const y = groundHeight(x, z)
    meshes.cylinder(x, y + (4.7 - y) / 2, z, .69, .86, 4.7 - y, 10, slate)
    meshes.sphere(x, 4.70, z, .78, .27, .78, cream)
  }
  const { x, z } = waterfront.rescue
  for (const side of [-1, 1]) meshes.box(x + side * 5.2, surfaceHeight(x, z) + .48, z, .36, 1.1, .36, '#e29c62')
  const boat = createHarborBoat(meshes)
  boat.name = 'Rescue skiff'
  boat.position.set(x - 7, .035, z - 15.6)
  boat.rotation.y = .12
  meshes.box(0, .4, -2.4, .48, .69, .42, '#54625b', boat)
  meshes.box(0, .81, -2.44, .68, .34, .55, '#c8734b', boat)
  return (time: number) => {
    boat.position.y = .035 + .065 * Math.sin(time * 1.7)
    boat.rotation.z = .039 * Math.sin(time * 1.28)
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
interface PlantTile { x: number; z: number; matrices: Map<Plant, number[]> }

function createPlants(meshes: MeshFactory, solids: ScenerySolids) {
  const random = rng()
  const tiles = new Map<string, PlantTile>()
  function place(kind: Plant, x: number, y: number, z: number, scale: number) {
    const ix = Math.floor(x / 92), iz = Math.floor(z / 92)
    const key = `${ix},${iz}`
    const tile = tiles.get(key) ?? { x: ix * 92 + 46, z: iz * 92 + 46, matrices: new Map<Plant, number[]>() }
    const matrices = tile.matrices.get(kind) ?? []
    const yaw = random() * Math.PI * 2
    const breadth = scale * (.82 + random() * .42)
    if ((kind === 'fir' || kind === 'alder') && discoveryWalks.some(walk =>
      distanceToRoute({ x, z }, [walk, walk.view]) < 3)) return
    if (kind === 'fir' || kind === 'alder') solids.add({
      x, z, heading: yaw, width: .42 * breadth, depth: .39 * breadth, bottom: y - .3 * scale, top: y + 3.4 * scale,
    })
    const transform = Matrix.Scaling(breadth, scale, breadth).multiply(Matrix.RotationY(yaw))
    transform.setTranslationFromFloats(x, y, z)
    matrices.push(...transform.m)
    tile.matrices.set(kind, matrices)
    tiles.set(key, tile)
  }
  const clear = (x: number, y: number, z: number, water: number) => y >= water - .05
    && Math.abs(groundHeight(x + 1, z) - groundHeight(x - 1, z)) < 1.8
    && Math.abs(groundHeight(x, z + 1) - groundHeight(x, z - 1)) < 1.8 && !clearAirfield(x, z)
    && nearestRoad(x, z).distance >= 10 && !sites.some((site) => siteDistance(x, z, site) < 3)
    && !villageWalks.some(({ points }) => points.length && Math.abs(points[0].x - x) < 65 &&
      Math.abs(points[0].z - z) < 65 && distanceToRoute({ x, z }, points) < 1.6)
    && discoveryWalks.every(walk => distanceToRoute({ x, z }, walk.path) > 2.2 && Math.hypot(x - walk.x, z - walk.z) > 3.5)
    && !islandBuildings.some((building) => building.kind === 'cottage' && Math.hypot(x - building.x, z - building.z) < 7)
  for (let i = 0; i < 5600; i++) {
    const x = random() * 912 - 456, z = random() * 660 - 330
    const y = groundHeight(x, z), water = waterHeight(x, z)
    if (!clear(x, y, z, water)) continue
    const { coast, marsh, woods, bluff } = habitatAt(x, y, z)
    const r = random(), scale = .68 + random() * .68
    if (r < coast) place('shore', x, y, z, scale)
    else if (r < marsh * .81) place(r < marsh * .57 ? 'reed' : 'alder', x, y, z, scale)
    else if (r < woods * .95) place(r < woods * .62 ? 'fir' : 'fern', x, y, z, scale)
    else if (r < bluff) place('heather', x, y, z, scale)
    else if (r < .73) place('flower', x, y, z, scale)
  }
  for (const [cx, cz] of [[-215, 218], [-192, 248], [-72, 243], [98, 236]]) for (let i = 0; i < 75; i++) {
    const angle = random() * Math.PI * 2, range = Math.sqrt(random()) * 34
    const x = cx + Math.cos(angle) * range, z = cz + Math.sin(angle) * range
    const y = groundHeight(x, z), water = waterHeight(x, z)
    if (y > water + 1 && clear(x, y, z, water)) place(random() < .83 ? 'fir' : 'alder', x, y, z, .85 + random() * .7)
  }
  for (let row = 0; row < 21; row++) for (let ix = 0; ix < 32; ix++) {
    const x = 92 + ix * 2.68 + random() * .33, z = 1 + row * 2.86 + Math.floor(row / 7) * 1.2
    place('crop', x, groundHeight(x, z), z, .72 + random() * .36)
  }
  for (let row = 0; row < 21; row++) meshes.box(133.5, 17.023, 1 + row * 2.86 + Math.floor(row / 7) * 1.2, 86, .07, 1.47, '#b49165', undefined, false)

  function prototype(kind: Plant) {
    const root = new TransformNode(`${kind} template`, meshes.scene)
    const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: string) =>
      meshes.box(x, y, z, w, h, d, color, root, false)
    const sphere = (x: number, y: number, z: number, w: number, h: number, d: number, color: string) =>
      meshes.sphere(x, y, z, w, h, d, color, root, false, 5)
    if (kind === 'fir' || kind === 'alder') {
      box(0, 1.55, 0, .42, 3.7, .39, '#8e6b4c')
      if (kind === 'fir') for (let i = 0; i < 3; i++) {
        const tree = meshes.cylinder(0, 2.55 + i * 1.09, 0, .36, 3.45 - i * .61, 2.13, 8, i % 2 ? '#64875e' : '#507a58', root)
        meshes.shadows.removeShadowCaster(tree)
      }
      else {
        sphere(0, 3.97, 0, 3.4, 3.14, 3.17, '#86a364')
        sphere(-.91, 3.48, .3, 2.28, 2.42, 2.39, '#96aa66')
      }
    } else if (kind === 'fern') {
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
        sphere(side * (.16 + i * .14), .36 - i * .045, (i % 2 - .5) * .24, .27, .13, .42,
          i % 2 ? '#689763' : '#547d56').rotation.z = side * .37
      }
    } else if (kind === 'heather') {
      for (const side of [-1, 0, 1]) {
        sphere(side * .24, .16, 0, .45, .39, .42, '#718375')
        sphere(side * .25, .35 + Math.abs(side) * .07, side * .07, .19, .24, .22, '#ac8396')
      }
    } else {
      const height = kind === 'reed' ? 1.17 : kind === 'crop' ? .71 : .44
      for (const side of [-1, 1]) {
        box(side * .14, height * .43, 0, .075, height, .11, kind === 'shore' ? '#8b9b65' : '#829154').rotation.z = -side * .22
        sphere(side * .215, height * .94, 0, .19, kind === 'reed' ? .29 : .13, .20,
          kind === 'flower' ? (side > 0 ? '#efb761' : '#dc9398') : '#c1a662')
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
  const details: { x: number; z: number; batch: Mesh }[] = []
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
  solids.add({ x: roostX, z: roostZ, bottom: roostGround, top: roostGround + roostHeight / 2, width: .53, depth: .53, heading: 0 })
  const roost = { x: roostX, y: roostGround + roostHeight * 1.015, z: roostZ }
  const perch = (x: number, z: number) => ({ x, z, y: surfaceHeight(x, z) + .15 })
  const flocks = createFlocks(meshes, [
    { center: { x: -274, z: -273, y: 12 }, range: 27, count: 4, color: '#f3e7cf',
      landing: perch(-265, -229), roost: perch(-267.9, -241) },
    { center: { x: -171, z: 224, y: 59 }, range: 22, count: 5, color: '#ae8075',
      landing: perch(-178, 229), roost },
    { center: { x: -114, z: 79, y: 13 }, range: 14, count: 3, color: '#61576c', bat: true,
      landing: perch(-115, 79), roost: perch(-115, 79) },
  ])
  const schools = createSchools(meshes, [
    { swim: (time) => ({ x: lowerLake.x - 5 + 4 * Math.sin(time * .23), z: lowerLake.z + 23 + 2 * Math.cos(time * .23) }),
      deep: { x: .15, z: -.99 }, level: lowerLake.y,
      isWater: ({ x, z }) => waterHeight(x, z) === lowerLake.y && groundHeight(x, z) < lowerLake.y - .4 },
    { swim: (time) => ({ x: -253 + 3 * Math.sin(time * .37), z: -268.5 + 1.5 * Math.cos(time * .37) }),
      deep: { x: -.15, z: -.99 }, level: 0, isWater: ({ x, z }) => groundHeight(x, z) < -.4 },
  ])
  const animals = [
    { name: 'Mallards', x: lowerLake.x, z: lowerLake.z, y: lowerLake.y + .24, span: 12, speed: .25, color: '#598978', kind: 'duck', count: 3 },
    { name: 'Hares', x: 48, z: 53, y: 0, span: 6, speed: .83, color: '#ae8e73', kind: 'hare', count: 2 },
    { name: 'Forest hares', x: -190, z: 227, y: 0, span: 6, speed: .75, color: '#ae8e73', kind: 'hare', count: 2 },
  ].flatMap((animal) => Array.from({ length: animal.count }, (_, index) => {
    const root = animal.kind === 'hare' ? createHare(meshes, animal.name, animal.color) : new TransformNode(animal.name, meshes.scene)
    if (animal.kind === 'duck') {
      meshes.sphere(0, .05, 0, .33, .25, .78, animal.color, root, false, 6)
      meshes.sphere(0, .18, .28, .25, .26, .23, '#426752', root, false, 6)
    }
    return { ...animal, root, index }
  }))
  return (frame: WildlifeFrame, overview: boolean) => {
    flocks(frame)
    schools(frame)
    const { time, camera } = frame
    for (const animal of animals) {
      const { root, index, x, z, span, kind, speed, y } = animal
      const visible = !overview && Math.hypot(camera.x - x, camera.z - z) < 117
      root.setEnabled(visible)
      if (!visible) continue
      const angle = time * speed + index * .66, r = span + index * .54
      const px = x + r * Math.cos(angle), pz = z + r * .69 * Math.sin(angle)
      const h = kind === 'hare' ? groundHeight(px, pz) + .16 + Math.abs(Math.sin(time * 5 + index)) * .25 : y
      root.position.set(px, h + Math.sin(angle * 2 + index) * .06, pz)
      root.rotation.y = Math.atan2(-Math.sin(angle), Math.cos(angle) * .69)
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
  const phenomena = createPhenomena(meshes.scene, [
    { ...lowerLake, name: 'Mirror Lake dawn mist', kind: 'mist', extent: 62, seed: 5183 },
    { name: 'Tarnstep spray', kind: 'spray', x: fallsX(169), y: fallsY(169), z: 169, extent: 7.5, seed: 2962 },
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
  }
}
