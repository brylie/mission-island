import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import type { WildlifeFrame } from '../wildlife'
import type { createCrew } from '../assets/crew'
import { honeyPropPaint } from '../assets/geometry/honey-props'
import { apiaryHedge, apiaryRail, apiarySteppingStone, honeybee } from '../assets/geometry/long-acre-apiary'
import { longAcreGroundCover } from '../assets/geometry/long-acre-flowers'
import { buildHoneyExtractor, buildHoneyHive, buildHoneyKit, buildHoneyShelf, createHoneyGearModels, honeyHiveEntrance } from '../assets/honey-props'
import { createLongAcreFlowers, longAcreLeafColors } from '../assets/long-acre-flowers'
import { longAcreGardenPlacement } from '../worlds/saltwind/layout/scenery'
import { apiary, beeCount, beeHiveFlightHeight, flowerBeds, flowerOffsets, hiveEntrances, honeyReward, honeyStops, pollinatorsAt } from './long-acre'
import type { HoneyOrder } from './long-acre'
import type { MapPoint } from './sites'
import { groundHeight, surfaceHeight } from './terrain'
import type { ScenerySolids } from './walking'

const apiaryCameraHeight = 17
const apiaryDetailRadius = 25
const wingbeatFrequency = 78
const flightWingAmplitude = 0.89
const landedWingTilt = 0.18
const feedingFlowerTilt = 0.095
const flowerSwayFrequency = 2.1
const flowerSwayPhaseStep = 0.72
const flowerSwayRainThreshold = 0.3
const wetFlowerSway = 0.037
const dryFlowerSway = 0.019

function onGround(meshes: MeshFactory, name: string, point: MapPoint) {
  const root = new TransformNode(name, meshes.scene)
  root.position.set(point.x, surfaceHeight(point.x, point.z), point.z)
  return root
}

export function createHoneyMarketStand(meshes: MeshFactory) {
  const { marketShelfOffsetZ } = longAcreGardenPlacement.props
  const root = onGround(meshes, 'Farmers market honey shelf', { x: honeyStops.market.x, z: honeyStops.market.z + marketShelfOffsetZ })
  buildHoneyShelf(meshes, root, honeyReward)
}

function buildApiary(meshes: MeshFactory) {
  hiveEntrances.forEach((point, i) => {
    const root = onGround(meshes, 'Long Acre hive ' + (i + 1), { x: point.x, z: point.z - honeyHiveEntrance.z })
    buildHoneyHive(meshes, root, i === 0 ? 'light' : 'dark')
  })

  const { props, hedge, rail, steppingStones } = longAcreGardenPlacement
  const kit = onGround(meshes, 'Veil and clean jars', { x: honeyStops.kit.x - props.kitBenchOffsetX, z: honeyStops.kit.z })
  buildHoneyKit(meshes, kit)

  const extraction = onGround(meshes, 'Covered Long Acre honey bench', { x: honeyStops.extractor.x - props.extractorBenchOffsetX, z: honeyStops.extractor.z })
  buildHoneyExtractor(meshes, extraction)

  for (let i = 0; i < hedge.count; i++) {
    const z = hedge.z + i * hedge.spacing, x = hedge.x + hedge.weave * Math.cos(i * hedge.weaveRate), y = groundHeight(x, z)
    const { centerY, width, height, heightVariation, depth, segments } = apiaryHedge
    meshes.sphere(x, y + centerY, z, width, height + heightVariation * Math.sin(i), depth, longAcreLeafColors[i % longAcreLeafColors.length], undefined, true, segments)
  }
  const { post, beam } = apiaryRail
  for (const [i, x] of rail.postX.entries()) {
    const y = surfaceHeight(x, rail.z)
    meshes.box(x, y + post.centerY, rail.z, ...post.size, honeyPropPaint.darkWood)
    if (i < rail.postX.length - 1) meshes.box(x + rail.railCenterFromPost, y + beam.centerY, rail.z, ...beam.size, honeyPropPaint.wood)
  }
  // Stepping stones point visitors around the east end of the low apiary rail.
  for (let i = 0; i < steppingStones.count; i++) {
    const x = steppingStones.x - Math.max(0, i - steppingStones.turnAfter) * steppingStones.turnStepX
    const z = steppingStones.z - i * steppingStones.spacingZ
    const { centerY, size, color, yawFrequency, yawAmplitude } = apiarySteppingStone
    const stone = meshes.box(x, surfaceHeight(x, z) + centerY, z, ...size, color, undefined, false)
    stone.rotation.y = Math.sin(i * yawFrequency) * yawAmplitude
  }
}

function createBee(meshes: MeshFactory, index: number) {
  const { abdomen, bands, head, wings: wing, segments } = honeybee
  const root = onGround(meshes, 'Honeybee ' + (index + 1), hiveEntrances[index % hiveEntrances.length])
  root.position.y += beeHiveFlightHeight
  meshes.sphere(0, 0, 0, ...abdomen.size, abdomen.color, root, false, segments)
  for (const z of bands.z) meshes.sphere(0, 0, z, ...bands.size, bands.color, root, false, segments)
  meshes.sphere(0, head.y, head.z, ...head.size, head.color, root, false, segments)
  const wings = [-1, 1].map((sign) => meshes.sphere(sign * wing.x, wing.y, wing.z, ...wing.size, wing.color, root, false, segments))
  return { root, wings }
}

export function createLongAcreGarden(meshes: MeshFactory, solids?: ScenerySolids) {
  const first = meshes.scene.meshes.length
  buildApiary(meshes)
  solids?.capture(meshes.scene.meshes.slice(first))
  const { scatter, leaf } = longAcreGroundCover
  flowerBeds.forEach((bed, j) => {
    for (let i = 0; i < scatter.count; i++) {
      const angle = i * scatter.turn, radius = scatter.baseRadius + scatter.ringStep * (i % scatter.ringCount)
      const x = bed.x + Math.cos(angle) * radius, z = bed.z + Math.sin(angle) * radius * scatter.depthScale
      const y = groundHeight(x, z)
      const width = leaf.width + leaf.widthStep * (i % leaf.widthLevels)
      const leaves = meshes.sphere(x, y + leaf.y, z, width, leaf.height, leaf.depth, longAcreLeafColors[(i + j) % longAcreLeafColors.length], undefined, false, leaf.segments)
      leaves.rotation.y = angle
    }
  })
  const flowers = flowerBeds.map((bed, j) => createLongAcreFlowers(meshes, bed, j, flowerOffsets, surfaceHeight))
  const bees = Array.from({ length: beeCount }, (_, i) => createBee(meshes, i))
  return (frame: WildlifeFrame, overview: boolean, rainAt: (time: number) => number = () => frame.weather.rain) => {
    const nearby = !overview && Math.hypot(frame.camera.x - apiary.x, frame.camera.y - apiaryCameraHeight, frame.camera.z - apiary.z) < apiaryDetailRadius
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
        wing.rotation.z = (side ? 1 : -1) * (sample.activity === 'flight' ? Math.sin(frame.time * wingbeatFrequency + i) * flightWingAmplitude : landedWingTilt)
      }
    }
    let visiting = 0
    flowers.forEach((bed, j) => void bed.forEach((root, i) => {
      const fed = motion.some((bee) => bee.bed === j && bee.flower === i)
      if (fed) visiting++
      const sway = frame.weather.rain > flowerSwayRainThreshold ? wetFlowerSway : dryFlowerSway
      root.rotation.z = (fed ? feedingFlowerTilt : 0) + Math.sin(frame.time * flowerSwayFrequency + i * flowerSwayPhaseStep + j) * sway
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
