import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import type { WildlifeFrame } from '../wildlife'
import type { createCrew } from '../assets/crew'
import { buildHoneyExtractor, buildHoneyHive, buildHoneyKit, buildHoneyShelf, createHoneyGearModels, honeyHiveEntrance } from '../assets/honey-props'
import { createLongAcreFlowers, longAcreLeafColors } from '../assets/long-acre-flowers'
import { apiary, beeCount, flowerBeds, flowerOffsets, hiveEntrances, honeyReward, honeyStops, pollinatorsAt } from './long-acre'
import type { HoneyOrder } from './long-acre'
import type { MapPoint } from './sites'
import { groundHeight, surfaceHeight } from './terrain'
import type { ScenerySolids } from './walking'

const wood = '#af8153', darkWood = '#745741'

function onGround(meshes: MeshFactory, name: string, point: MapPoint) {
  const root = new TransformNode(name, meshes.scene)
  root.position.set(point.x, surfaceHeight(point.x, point.z), point.z)
  return root
}

const marketShelfOffsetZ = 0.65
const kitBenchOffsetX = 1.02
const extractorBenchOffsetX = 0.68

export function createHoneyMarketStand(meshes: MeshFactory) {
  const root = onGround(meshes, 'Farmers market honey shelf', { x: honeyStops.market.x, z: honeyStops.market.z + marketShelfOffsetZ })
  buildHoneyShelf(meshes, root, honeyReward)
}

function buildApiary(meshes: MeshFactory) {
  hiveEntrances.forEach((point, i) => {
    const root = onGround(meshes, 'Long Acre hive ' + (i + 1), { x: point.x, z: point.z - honeyHiveEntrance.z })
    buildHoneyHive(meshes, root, i === 0 ? 'light' : 'dark')
  })

  const kit = onGround(meshes, 'Veil and clean jars', { x: honeyStops.kit.x - kitBenchOffsetX, z: honeyStops.kit.z })
  buildHoneyKit(meshes, kit)

  const extraction = onGround(meshes, 'Covered Long Acre honey bench', { x: honeyStops.extractor.x - extractorBenchOffsetX, z: honeyStops.extractor.z })
  buildHoneyExtractor(meshes, extraction)

  for (let i = 0; i < 10; i++) {
    const z = 25.2 + i * 0.34, x = 177.7 + 0.15 * Math.cos(i * 1.7), y = groundHeight(x, z)
    meshes.sphere(x, y + 0.39, z, 0.67, 0.86 + 0.11 * Math.sin(i), 0.61, longAcreLeafColors[i % 3], undefined, true, 5)
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
      const leaves = meshes.sphere(x, y + 0.062, z, 0.25 + 0.07 * (i % 3), 0.15, 0.26, longAcreLeafColors[(i + j) % 3], undefined, false, 4)
      leaves.rotation.y = angle
    }
  })
  const flowers = flowerBeds.map((bed, j) => createLongAcreFlowers(meshes, bed, j, flowerOffsets, surfaceHeight))
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
    flowers.forEach((bed, j) => void bed.forEach((root, i) => {
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
  const { veil, empty, filled } = createHoneyGearModels(meshes, crew.root)
  return (order: HoneyOrder) => {
    const equipped = order === 'empty'
    crew.setCap(!equipped)
    veil.setEnabled(equipped)
    empty.setEnabled(equipped)
    filled.setEnabled(order === 'filled')
  }
}
