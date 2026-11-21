import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { createIslandMaterial } from '../materials'
import type { WildlifeFrame } from '../wildlife'
import type { createCrew } from '../assets/crew'
import { apiary, beeCount, flowerBeds, flowerOffsets, hiveEntrances, honeyReward, honeyStops, pollinatorsAt } from './long-acre'
import type { HoneyOrder } from './long-acre'
import type { MapPoint } from './sites'
import { groundHeight, surfaceHeight } from './terrain'
import type { ScenerySolids } from './walking'

const cream = '#f8dfb5', copper = '#ad6e48', honey = '#e39a32', greens = ['#627e52', '#7d975a', '#91a567']
const wood = '#af8153', darkWood = '#745741'

function onGround(meshes: MeshFactory, name: string, point: MapPoint) {
  const root = new TransformNode(name, meshes.scene)
  root.position.set(point.x, surfaceHeight(point.x, point.z), point.z)
  return root
}

function jar(meshes: MeshFactory, parent: TransformNode, filled: boolean, x = 0, y = 0, z = 0) {
  const root = new TransformNode(filled ? 'Capped honey jar' : 'Clean jar', meshes.scene)
  root.parent = parent
  root.position.set(x, y, z)
  meshes.cylinder(0, 0.076, 0, 0.126, 0.143, 0.148, 12, filled ? honey : '#afc4ba', root, false)
  meshes.cylinder(0, 0.155, 0, 0.134, 0.134, 0.026, 12, filled ? '#85583f' : '#c6d9c8', root, false)
  meshes.box(0, 0.081, 0.068, 0.073, 0.049, 0.009, cream, root, false)
  meshes.box(-0.042, 0.101, 0.059, 0.013, 0.044, 0.008, '#fff1c8', root, false)
  return root
}

function bench(meshes: MeshFactory, root: TransformNode, width: number, depth: number) {
  meshes.box(0, 0.77, 0, width, 0.085, depth, wood, root)
  for (const x of [-width / 2 + 0.15, width / 2 - 0.15]) for (const z of [-depth / 2 + 0.12, depth / 2 - 0.12]) {
    meshes.box(x, 0.366, z, 0.093, 0.73, 0.092, darkWood, root)
  }
}

export function createHoneyMarketStand(meshes: MeshFactory) {
  const root = onGround(meshes, 'Farmers market honey shelf', { x: honeyStops.market.x, z: honeyStops.market.z + 0.65 })
  bench(meshes, root, 0.92, 0.52)
  for (const x of [-0.27, -0.03, 0.21]) jar(meshes, root, true, x, 0.813)
  const card = meshes.box(0.318, 0.915, -0.04, 0.22, 0.19, 0.024, cream, root)
  card.rotation.x = -0.23
  const label = new DynamicTexture('Honey shelf price', { width: 192, height: 128 }, meshes.scene, true)
  label.drawText('HONEY', null, 52, 'bold 35px Georgia', '#655141', '#f3d5a2', false)
  label.drawText(honeyReward + ' COINS', null, 96, 'bold 28px Georgia', '#655141', null, true)
  const print = new StandardMaterial('Honey price card', meshes.scene)
  print.diffuseTexture = label
  print.backFaceCulling = false
  const face = new TransformNode('Price card face', meshes.scene)
  face.position.copyFrom(card.position)
  face.rotation.copyFrom(card.rotation)
  face.parent = root
  meshes.surface('Honey price', [-0.104, -0.087, -0.015, 0.104, -0.087, -0.015, 0.104, 0.087, -0.015, -0.104, 0.087, -0.015], [0, 1, 2, 0, 2, 3], print, face, [0, 0, 1, 0, 1, 1, 0, 1])
  meshes.batchModel(root)
}

function buildApiary(meshes: MeshFactory) {
  hiveEntrances.forEach((point, i) => {
    const root = onGround(meshes, 'Long Acre hive ' + (i + 1), { x: point.x, z: point.z - 0.40 })
    for (const x of [-0.3, 0.3]) meshes.box(x, 0.17, 0, 0.12, 0.34, 0.72, darkWood, root)
    meshes.box(0, 0.358, 0, 0.85, 0.068, 0.80, '#af9d77', root)
    for (const y of [0.52, 0.77, 1.0]) meshes.box(0, y, 0, 0.79, 0.24, 0.70, i ? '#c6b984' : '#d9cda3', root)
    for (const y of [0.64, 0.884]) meshes.box(0, y, 0.352, 0.755, 0.036, 0.033, '#969479', root)
    meshes.box(0, 0.482, 0.401, 0.59, 0.043, 0.154, wood, root)
    meshes.box(0, 0.536, 0.356, 0.37, 0.065, 0.024, '#4b4b3a', root)
    for (const x of [-0.41, 0.41]) meshes.box(x, 0.78, 0, 0.042, 0.078, 0.33, darkWood, root)
    const roof = meshes.box(0, 1.16, 0, 0.95, 0.117, 0.86, i ? '#6f9180' : '#557b73', root)
    roof.rotation.x = 0.076
    meshes.batchModel(root)
  })

  const kit = onGround(meshes, 'Veil and clean jars', { x: honeyStops.kit.x - 1.02, z: honeyStops.kit.z })
  bench(meshes, kit, 0.92, 0.53)
  jar(meshes, kit, false, -0.22, 0.813)
  meshes.cylinder(0.18, 0.83, 0.02, 0.23, 0.23, 0.023, 12, cream, kit)
  meshes.sphere(0.18, 0.877, 0.02, 0.16, 0.14, 0.16, '#d7c496', kit, false)
  meshes.batchModel(kit)

  const extraction = onGround(meshes, 'Covered Long Acre honey bench', { x: honeyStops.extractor.x - 0.68, z: honeyStops.extractor.z })
  bench(meshes, extraction, 1.45, 0.65)
  for (const x of [-0.82, 0.82]) meshes.box(x, 1.04, -0.32, 0.086, 2.08, 0.09, darkWood, extraction)
  meshes.box(0, 2.10, -0.035, 1.94, 0.10, 1.03, '#91a58a', extraction).rotation.x = 0.14
  meshes.cylinder(-0.33, 1.04, -0.04, 0.41, 0.36, 0.45, 14, copper, extraction)
  meshes.cylinder(-0.33, 1.274, -0.04, 0.39, 0.40, 0.041, 14, '#b0aa93', extraction)
  meshes.box(-0.27, 1.355, -0.036, 0.34, 0.034, 0.035, darkWood, extraction)
  meshes.cylinder(-0.105, 1.388, -0.036, 0.046, 0.046, 0.09, 8, cream, extraction)
  meshes.box(-0.33, 0.94, 0.186, 0.06, 0.045, 0.155, '#b99467', extraction)
  jar(meshes, extraction, true, -0.33, 0.813, 0.247)
  const comb = new TransformNode('Capped honeycomb frame', meshes.scene)
  comb.parent = extraction
  comb.position.set(0.34, 1.016, -0.04)
  comb.rotation.x = -0.32
  meshes.box(0, 0, 0, 0.39, 0.34, 0.042, '#b9895d', comb)
  for (let row = 0; row < 4; row++) for (let col = 0; col < 5; col++) {
    const cell = meshes.cylinder((col - 2) * 0.065 + row % 2 * 0.023, (row - 1.5) * 0.065, 0.022, 0.064, 0.064, 0.017, 6, (row + col) % 4 === 0 ? '#e5ab45' : '#f2cc78', comb, false)
    cell.rotation.x = Math.PI / 2
  }
  meshes.batchModel(extraction)

  for (let i = 0; i < 10; i++) {
    const z = 25.2 + i * 0.34, x = 177.7 + 0.15 * Math.cos(i * 1.7), y = groundHeight(x, z)
    meshes.sphere(x, y + 0.39, z, 0.67, 0.86 + 0.11 * Math.sin(i), 0.61, greens[i % 3], undefined, true, 5)
  }
  for (const x of [182.4, 184.7, 187]) {
    const y = surfaceHeight(x, 24.25)
    meshes.box(x, y + 0.36, 24.25, 0.10, 0.72, 0.105, darkWood)
    if (x < 187) meshes.box(x + 1.15, y + 0.55, 24.25, 2.34, 0.078, 0.093, wood)
  }
  // Stepping stones point visitors around the east end of the low apiary rail.
  for (let i = 0; i < 6; i++) {
    const x = 187.55 - Math.max(0, i - 3) * 0.55, z = 26.72 - i * 0.77
    const stone = meshes.box(x, surfaceHeight(x, z) + 0.025, z, 0.51, 0.065, 0.42, '#a79470', undefined, false)
    stone.rotation.y = Math.sin(i * 2) * 0.24
  }
}

export function createLongAcreGarden(meshes: MeshFactory, solids?: ScenerySolids) {
  const first = meshes.scene.meshes.length
  buildApiary(meshes)
  solids?.capture(meshes.scene.meshes.slice(first))
  flowerBeds.forEach((bed, j) => {
    for (let i = 0; i < 14; i++) {
      const angle = i * 2.399, radius = 0.21 + 0.21 * (i % 5)
      const x = bed.x + Math.cos(angle) * radius, z = bed.z + Math.sin(angle) * radius * 0.83
      const y = groundHeight(x, z)
      const leaves = meshes.sphere(x, y + 0.062, z, 0.25 + 0.07 * (i % 3), 0.15, 0.26, greens[(i + j) % 3], undefined, false, 4)
      leaves.rotation.y = angle
    }
  })
  const flowers = flowerBeds.map((bed, j) => flowerOffsets.map(({ x, z, height }, i) => {
    const root = onGround(meshes, bed.name, { x: bed.x + x, z: bed.z + z })
    meshes.box(0, height / 2, 0, 0.028, height, 0.034, '#56804d', root, false)
    meshes.sphere(0.052, height * 0.56, 0, 0.138, 0.042, 0.071, greens[(i + j) % 3], root, false, 4).rotation.z = 0.49
    for (let k = 0; k < 5; k++) {
      const a = k * Math.PI * 0.4
      meshes.sphere(0.069 * Math.cos(a), height, 0.069 * Math.sin(a), 0.117, 0.066, 0.112, bed.petals, root, false, 5)
    }
    meshes.sphere(0, height + 0.017, 0, 0.087, 0.061, 0.086, j === 1 ? '#935b37' : '#e9ac53', root, false, 5)
    return root
  }))
  const bees = Array.from({ length: beeCount }, (_, i) => {
    const root = onGround(meshes, 'Honeybee ' + (i + 1), hiveEntrances[i % 2])
    root.position.y += 0.54
    meshes.sphere(0, 0, 0, 0.082, 0.074, 0.142, '#dfaa36', root, false, 5)
    for (const z of [-0.035, 0.02]) meshes.sphere(0, 0, z, 0.085, 0.075, 0.027, '#574332', root, false, 5)
    meshes.sphere(0, 0.008, 0.071, 0.052, 0.052, 0.059, '#543d30', root, false, 5)
    const wings = [-1, 1].map((sign) => meshes.sphere(sign * 0.054, 0.032, -0.016, 0.094, 0.011, 0.054, '#f7ead0', root, false, 5))
    return { root, wings }
  })
  return (frame: WildlifeFrame, overview: boolean, rainAt: (time: number) => number = () => frame.weather.rain) => {
    const nearby = !overview && Math.hypot(frame.camera.x - apiary.x, frame.camera.y - 17, frame.camera.z - apiary.z) < 25
    if (!nearby) {
      for (const { root } of bees) root.setEnabled(false)
      return
    }
    const { phase, bees: motion } = pollinatorsAt(frame.time, frame.weather, rainAt)
    for (const [i, { root, wings }] of bees.entries()) {
      const sample = motion[i]
      root.setEnabled(sample.activity !== 'resting')
      if (sample.activity === 'resting') continue
      root.position.set(sample.x, surfaceHeight(sample.x, sample.z) + sample.height, sample.z)
      root.rotation.y = sample.yaw
      for (const [side, wing] of wings.entries()) {
        wing.rotation.z = (side ? 1 : -1) * (sample.activity === 'flight' ? Math.sin(frame.time * 78 + i) * 0.89 : 0.18)
      }
    }
    let visiting = 0
    flowers.forEach((bed, j) => bed.forEach((root, i) => {
      const fed = motion.some((bee) => bee.bed === j && bee.flower === i)
      if (fed) visiting++
      root.rotation.z = (fed ? 0.095 : 0) + Math.sin(frame.time * 2.1 + i * 0.72 + j) * (frame.weather.rain > 0.3 ? 0.037 : 0.019)
    }))
    return {
      phase,
      visiting,
      flying: motion.filter((bee) => bee.activity === 'flight').length,
      hivebound: motion.filter((bee) => bee.hivebound).length,
    }
  }
}

export function createHoneyGear(meshes: MeshFactory, crew: ReturnType<typeof createCrew>) {
  const veil = new TransformNode('Loaned beekeeping veil', meshes.scene)
  veil.parent = crew.root
  const mesh = createIslandMaterial(meshes.scene, 'Veil mesh', '#524d3d')
  mesh.alpha = 0.25
  meshes.cylinder(0, 1.76, 0.027, 0.57, 0.68, 0.22, 13, cream, veil, false)
  meshes.cylinder(0, 1.63, 0.034, 0.76, 0.76, 0.061, 13, '#d5bb87', veil, false)
  meshes.cylinder(0, 1.445, 0.052, 0.67, 0.60, 0.365, 13, mesh, veil, false)
  meshes.cylinder(0, 1.25, 0.052, 0.591, 0.605, 0.042, 13, '#d5bb87', veil, false)
  const empty = jar(meshes, crew.root, false, -0.42, 0.995, 0.50)
  const filled = jar(meshes, crew.root, true, -0.42, 0.995, 0.50)
  return (order: HoneyOrder) => {
    const equipped = order === 'empty'
    crew.setCap(!equipped)
    veil.setEnabled(equipped)
    empty.setEnabled(equipped)
    filled.setEnabled(order === 'filled')
  }
}
