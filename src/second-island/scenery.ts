import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Matrix } from '@babylonjs/core/Maths/math.vector'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import '@babylonjs/core/Meshes/thinInstanceMesh'
import type { MeshFactory } from '../island-meshes'
import { islandBuildings, createExterior } from './exteriors'
import { clearAirfield } from './landscape'
import { arrival, helipad, lowerLake, pavedYards, roundYards, sites, waterfront } from './sites'
import type { MapPoint } from './sites'
import { groundHeight, nearestRoad, shoreDistance, siteDistance, surfaceHeight, waterHeight } from './terrain'
import { createSaltwindVehicle } from './vehicles'
import type { VehicleId } from './vehicles'

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

function placeVehicles(meshes: MeshFactory) {
  const placements: [VehicleId, string][] = [
    ['ambulance', 'hospital'], ['engine', 'fire'], ['patrol', 'police'], ['logger', 'timber'], ['hauler', 'mine'], ['airplane', 'airport'],
  ]
  for (const [id, siteId] of placements) {
    const site = sites.find(({ id }) => id === siteId)
    if (!site) continue
    const parked = createSaltwindVehicle(meshes, id)
    const { x, z } = site.stop
    parked.position.set(x, Math.max(...[-1, 1].map((side) => surfaceHeight(x + Math.sin(site.heading) * side * 2, z + Math.cos(site.heading) * side * 2))), z)
    parked.rotation.y = site.heading
    meshes.batchModel(parked)
  }
  const helicopter = createSaltwindVehicle(meshes, 'helicopter')
  helicopter.position.set(helipad.x, groundHeight(helipad.x, helipad.z) + .20, helipad.z)
  helicopter.rotation.y = .38
  meshes.batchModel(helicopter)
}

function buildYards(meshes: MeshFactory) {
  for (const building of islandBuildings) {
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

  // A clear service corridor runs between the log stacks and the mill.
  for (const [x, z] of [[-204, 164], [-209, 177], [-225, 177]]) for (let layer = 0; layer < 3; layer++) {
    for (let n = 0; n < 5 - layer; n++) {
      const log = meshes.cylinder(x + (n + layer * .5 - 2) * .76, 30.42 + layer * .61, z, .74, .82, 7.5, 10, '#936b47')
      log.rotation.x = Math.PI / 2
      for (const side of [-1, 1]) meshes.cylinder(log.position.x, log.position.y, z + side * 3.76, .61, .61, .035, 10, '#d4ad73').rotation.x = Math.PI / 2
    }
  }
  meshes.box(282, 32.61, 178, 7.4, 3, 5.8, '#9f7653')
  meshes.box(282, 31.1, 175.6, 4.2, .78, 1.9, '#625d54').rotation.x = .23
  for (const dx of [-2.82, 2.82]) for (const dz of [-2.2, 2.2]) meshes.box(282 + dx, 30.52, 178 + dz, .39, 3.3, .39, '#685e52')
  for (const x of [292, 296, 300]) meshes.sphere(x, 30.3, 177, 5.7, 2.5, 5.9, '#8d8174')

  for (const z of [182, 187, 192, 197]) for (const x of [9, 16, 24, 31]) {
    meshes.box(x, 30.48, z, .74, .98, .30, slate)
    meshes.sphere(x, 30.97, z, .74, .36, .31, slate, undefined, true, 8)
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
  const boat = new TransformNode('Rescue skiff exterior', meshes.scene)
  boat.position.set(x - 7, .16, z - 15.6)
  meshes.sphere(0, .09, 0, 2.48, 1.05, 6.2, '#cf7648', boat, true, 12)
  meshes.box(0, .55, 0, 1.77, .16, 3.8, '#eedcb7', boat)
  meshes.box(0, .71, 1.15, 1.59, .38, 1.23, '#42747a', boat)
  for (const bx of [-.79, .79]) meshes.box(bx, .61, -.27, .14, .25, 3.36, cream, boat)
  return (time: number) => {
    boat.position.y = .16 + .08 * Math.sin(time * 1.7)
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

type Plant = 'fir' | 'alder' | 'reed' | 'flower' | 'shore' | 'crop'
interface PlantTile { x: number; z: number; matrices: Map<Plant, number[]> }

function createPlants(meshes: MeshFactory) {
  const random = rng()
  const tiles = new Map<string, PlantTile>()
  function place(kind: Plant, x: number, y: number, z: number, scale: number) {
    const ix = Math.floor(x / 92), iz = Math.floor(z / 92)
    const key = `${ix},${iz}`
    const tile = tiles.get(key) ?? { x: ix * 92 + 46, z: iz * 92 + 46, matrices: new Map<Plant, number[]>() }
    const matrices = tile.matrices.get(kind) ?? []
    const transform = Matrix.Scaling(scale, scale, scale).multiply(Matrix.RotationY(random() * Math.PI * 2))
    transform.setTranslationFromFloats(x, y, z)
    matrices.push(...transform.m)
    tile.matrices.set(kind, matrices)
    tiles.set(key, tile)
  }
  const clear = (x: number, y: number, z: number, water: number) => y >= water - .05 && !clearAirfield(x, z)
    && nearestRoad(x, z).distance >= 10 && !sites.some((site) => siteDistance(x, z, site) < 3)
    && !islandBuildings.some((building) => building.kind === 'cottage' && Math.hypot(x - building.x, z - building.z) < 7)
  for (let i = 0; i < 5600; i++) {
    const x = random() * 912 - 456, z = random() * 660 - 330
    const y = groundHeight(x, z), water = waterHeight(x, z)
    if (!clear(x, y, z, water)) continue
    const coast = shoreDistance(x, z)
    const r = random(), scale = .65 + random() * .74
    if (water > 0 && y - water < 2.1) place('reed', x, y, z, scale)
    else if (coast < 21) place('shore', x, y, z, scale)
    else if (y > 25 && r < .80) place(r < .57 ? 'fir' : 'alder', x, y, z, scale)
    else if (z > 18 && r < .29) place('alder', x, y, z, scale)
    else if (r < .77) place('flower', x, y, z, scale)
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
      box(0, 1.7, 0, .42, 3.4, .39, '#8e6b4c')
      if (kind === 'fir') for (let i = 0; i < 3; i++) {
        const tree = meshes.cylinder(0, 2.55 + i * 1.09, 0, .36, 3.45 - i * .61, 2.13, 8, i % 2 ? '#64875e' : '#507a58', root)
        meshes.shadows.removeShadowCaster(tree)
      }
      else {
        sphere(0, 3.97, 0, 3.4, 3.14, 3.17, '#86a364')
        sphere(-.91, 3.48, .3, 2.28, 2.42, 2.39, '#96aa66')
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
  for (const kind of ['fir', 'alder', 'reed', 'flower', 'shore', 'crop'] as const) {
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

function createWildlife(meshes: MeshFactory) {
  const animals = [
    { name: 'Gulls', x: -270, z: -270, y: 13, span: 32, speed: .42, color: '#f3e7cf', kind: 'bird', count: 3 },
    { name: 'Forest birds', x: -171, z: 224, y: 54, span: 22, speed: .63, color: '#92655c', kind: 'bird', count: 3 },
    { name: 'Mallards', x: lowerLake.x, z: lowerLake.z, y: lowerLake.y + .24, span: 12, speed: .25, color: '#598978', kind: 'duck', count: 3 },
    { name: 'Hares', x: 48, z: 53, y: 0, span: 6, speed: .83, color: '#ae8e73', kind: 'hare', count: 2 },
    { name: 'Forest hares', x: -190, z: 227, y: 0, span: 6, speed: .75, color: '#ae8e73', kind: 'hare', count: 2 },
    { name: 'Mullet', x: -253, z: -271, y: -.08, span: 4.8, speed: .55, color: '#addecb', kind: 'fish', count: 5 },
  ].flatMap((animal) => Array.from({ length: animal.count }, (_, index) => {
    const root = new TransformNode(animal.name, meshes.scene)
    const part = (x: number, y: number, z: number, w: number, h: number, d: number, color = animal.color) =>
      meshes.sphere(x, y, z, w, h, d, color, root, false, 6)
    part(0, .05, 0, .33, .25, .78)
    const wings = animal.kind === 'bird' ? [-1, 1].map((s) => part(s * .43, .07, -.03, .89, .077, .31)) : []
    if (animal.kind === 'duck') part(0, .18, .28, .25, .26, .23, '#426752')
    if (animal.kind === 'hare') {
      part(0, .18, .23, .29, .35, .35)
      for (const side of [-1, 1]) part(side * .071, .39, .19, .08, .28, .095).rotation.x = -.24
    }
    if (animal.kind === 'fish') part(0, .05, -.42, .10, .12, .28)
    return { ...animal, root, wings, index }
  }))
  return (time: number, camera: MapPoint, overview: boolean) => {
    for (const animal of animals) {
      const { root, index, x, z, span, kind, speed, y, wings } = animal
      const visible = !overview && Math.hypot(camera.x - x, camera.z - z) < 117
      root.setEnabled(visible)
      if (!visible) continue
      const angle = time * speed + index * .66, r = span + index * .54
      const px = x + r * Math.cos(angle), pz = z + r * .69 * Math.sin(angle)
      const h = kind === 'hare' ? groundHeight(px, pz) + .16 + Math.abs(Math.sin(time * 5 + index)) * .25 : y
      root.position.set(px, h + Math.sin(angle * 2 + index) * (kind === 'bird' ? 1.1 : .06), pz)
      root.rotation.y = Math.atan2(-Math.sin(angle), Math.cos(angle) * .69)
      wings.forEach((wing, side) => { wing.rotation.z = Math.sin(time * 7 + index) * (side ? .61 : -.61) })
    }
  }
}

export function createScenery(meshes: MeshFactory) {
  buildYards(meshes)
  buildSigns(meshes)
  placeVehicles(meshes)
  const waterfront = buildWaterfront(meshes)
  const plants = createPlants(meshes)
  const wildlife = createWildlife(meshes)
  meshes.finishScenery()
  return (time: number, camera: MapPoint, overview: boolean) => {
    waterfront(time)
    plants(camera, overview)
    wildlife(time, camera, overview)
  }
}

function buildSigns(meshes: MeshFactory) {
  const signs = [
    { x: -265, z: -228, name: 'BRINEWICK FERRY', angle: Math.PI },
    { x: -283, z: -113, name: 'BRINEWICK', angle: Math.PI },
    { x: 129, z: -58, name: 'BARLEYCROSS', angle: -Math.PI / 2 },
    { x: -10, z: 161, name: 'ALDERWATCH', angle: Math.PI / 2 },
  ]
  for (const { x, z, name, angle } of signs) {
    const root = new TransformNode(name, meshes.scene)
    root.position.set(x, groundHeight(x, z), z)
    root.rotation.y = angle
    const texture = new DynamicTexture(name, { width: 512, height: 128 }, meshes.scene, true)
    texture.drawText(name, null, 86, 'bold 54px Georgia', '#fff1cc', '#3b6b65', true)
    const material = new StandardMaterial(name, meshes.scene)
    material.diffuseTexture = texture
    material.backFaceCulling = false
    for (const side of [-1, 1]) meshes.box(side * 1.45, 1.24, 0, .18, 2.54, .17, '#987958', root)
    meshes.box(0, 2.03, 0, 3.91, 1.03, .19, '#edcf99', root)
    meshes.surface(`${name} face`, [-1.87, 1.58, .104, 1.87, 1.58, .104, 1.87, 2.48, .104, -1.87, 2.48, .104],
      [0, 2, 1, 0, 3, 2], material, root, [1, 0, 0, 0, 0, 1, 1, 1])
  }
}
