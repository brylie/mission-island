import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { biomeFoxGeometry } from './assets/geometry/biome-fauna'
import { biomeGroundCover } from './assets/geometry/biome-vegetation'
import { createTree, createRock } from './assets/props'
import { placeSiteFeatures } from './assets/site-props'
import { biomeFrame, type BiomeFrame, type populate } from './biome-model'
import { biomeRockSize, biomeTreeHeight, habitatNavigation } from './biome-navigation'
import { createHare } from './hare'
import type { MeshFactory } from './island-meshes'
import type { Point } from './world'

type Ellipsoid = readonly [x: number, y: number, z: number, diameterX: number, diameterY: number, diameterZ: number]
const pairedVariants = 2

export function createFox(meshes: MeshFactory) {
  const root = new TransformNode('Fox', meshes.scene)
  const { paint, segments, torso, head, muzzle, nose, tail, tailTip, ears, legs } = biomeFoxGeometry
  const part = (shape: Ellipsoid, color: string) => meshes.sphere(...shape, color, root, true, segments)
  part(torso, paint.coat)
  part(head, paint.coat)
  part(muzzle, paint.cream)
  part(nose, paint.nose)
  part(tail.body, paint.coat).rotation.x = tail.pitchRad
  part(tailTip, paint.cream)
  for (const side of [-1, 1]) {
    meshes.cylinder(side * ears.x, ears.y, ears.z, 0, ears.baseDiameter, ears.height, ears.sides, paint.coat, root)
    for (const z of legs.z) part([side * legs.x, legs.y, z, ...legs.size], paint.paws)
  }
  return root
}

const coordinatesPerVertex = 3
const leafTipVertex = 2
const leafTrailingVertex = 3
const fullTurn = Math.PI + Math.PI

export function createGroundCover(meshes: MeshFactory, grass: boolean, seed = 0) {
  const root = new TransformNode(grass ? 'Tussock' : 'Clover', meshes.scene)
  const { distribution, leaf, flowers, grass: tussock, clover } = biomeGroundCover
  const cover = grass ? tussock : clover
  // One mesh per patch keeps individual plants cheap even at full density.
  const vertices: number[] = [], faces: number[] = []
  for (let i = 0; i < cover.shoots; i++) {
    const angle = i * distribution.angleStepRad + Math.sin(seed + i) * (seed ? distribution.seedWobbleRad : 0)
    const spread = distribution.minimumRadiusM + distribution.radiusSpanM * ((i * distribution.radiusBandStride) % distribution.radiusBands) / distribution.radiusBands
    const x = Math.cos(angle) * spread, z = Math.sin(angle) * spread
    const tip = cover.tipHeightM + (i % cover.heightBands) * cover.heightStepM
    for (let j = 0; j < cover.leavesPerShoot; j++) {
      const a = angle + j * fullTurn / clover.leavesPerShoot, dx = Math.cos(a), dz = Math.sin(a)
      const base = vertices.length / coordinatesPerVertex, width = cover.halfWidthM
      const shoulderX = x + dx * leaf.shoulderReachM
      const shoulderZ = z + dz * leaf.shoulderReachM
      const shoulderY = tip * leaf.shoulderHeightRatio
      vertices.push(
        x,
        cover.baseY,
        z,
        shoulderX - dz * width,
        shoulderY,
        shoulderZ + dx * width,
        x + dx * leaf.tipReachM,
        tip,
        z + dz * leaf.tipReachM,
        shoulderX + dz * width,
        shoulderY,
        shoulderZ - dx * width,
      )
      faces.push(base, base + 1, base + leafTipVertex, base, base + leafTipVertex, base + leafTrailingVertex)
    }
  }
  const leaves = meshes.surface(root.name, vertices, faces, cover.color, root)
  if (leaves.material) leaves.material.backFaceCulling = false
  if (!grass) {
    for (const offset of flowers.x) meshes.sphere(offset, flowers.y, offset * flowers.zRatio, ...flowers.size, flowers.color, root, false, flowers.segments)
  }
  return root
}

const foxStepHeightM = 0.035
const foxStepRadPerSecond = 6
const hareHopHeightM = 0.11
const hareFleeRadPerSecond = 12
const hareWalkRadPerSecond = 7
const hareShelteringHeightM = 0.075
const hareShelteringPitchRad = -0.06
const hareStandingHeightM = 0.12
const hareGrazingPitchRad = 0.18
const cloverStubbleScale = 0.28
const cloverGrowthScale = 0.72

export function animalPose(species: 'hare' | 'fox', behavior: string, time: number, index = 0) {
  if (species === 'fox') return { height: behavior === 'watching' ? 0 : foxStepHeightM * Math.abs(Math.sin(time * foxStepRadPerSecond + index)), pitch: 0 }
  const still = behavior === 'grazing' || behavior === 'sheltering'
  const hop = still ? 0 : hareHopHeightM * Math.abs(Math.sin(time * (behavior === 'fleeing' ? hareFleeRadPerSecond : hareWalkRadPerSecond) + index))
  if (behavior === 'sheltering') return { height: hareShelteringHeightM, pitch: hareShelteringPitchRad }
  return { height: hareStandingHeightM + hop, pitch: behavior === 'grazing' ? hareGrazingPitchRad : 0 }
}

export function createBiomeScenery(meshes: MeshFactory, initial: ReturnType<typeof populate>, center: Point, heightAt: (p: Point) => number) {
  const navigation = habitatNavigation(initial.patches)
  const plants: TransformNode[] = []
  initial.patches.forEach((patch, i) => {
    const p = { ...patch, x: patch.x + center.x, z: patch.z + center.z }
    const ground = heightAt(p)
    if (p.kind === 'trees') createTree(meshes, p.x, p.z, biomeTreeHeight(p.angle), i % pairedVariants + 1, ground)
    if (p.kind === 'stones') createRock(meshes, p.x, p.z, biomeRockSize(p.angle), p.angle, i % pairedVariants === 0, ground)
    if (p.kind === 'logs') placeSiteFeatures(meshes, [{ ...p, site: 'biome', model: 'log', name: 'Fallen trunk', heading: p.angle, followSlope: true, color: '#87725a' }], heightAt)
    if (p.kind === 'grass' || p.kind === 'clover') {
      const root = createGroundCover(meshes, p.kind === 'grass')
      root.position.set(p.x, ground, p.z)
      root.rotation.y = p.angle
      if (p.kind === 'clover') plants.push(root)
    }
  })
  const hares = initial.hares.map((_, i) => createHare(meshes, 'Hare', i % pairedVariants ? '#b6a188' : '#967858'))
  const foxes = initial.foxes.map(() => createFox(meshes))
  function pose(root: TransformNode, animal: BiomeFrame['hares'][number], y: number, blend: number) {
    const { position, rotation } = root
    position.x += (center.x + animal.x - position.x) * blend
    position.z += (center.z + animal.z - position.z) * blend
    position.y = heightAt(position) + navigation.lift({ x: position.x - center.x, z: position.z - center.z }) + y
    const turn = animal.heading - rotation.y
    rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * blend
  }
  function update(frame: BiomeFrame, time: number, blend = 1) {
    plants.forEach((plant, i) => void plant.scaling.setAll(cloverStubbleScale + cloverGrowthScale * frame.clover[i]))
    frame.hares.forEach((animal, i) => {
      const motion = animalPose('hare', animal.behavior, time, i)
      pose(hares[i], animal, motion.height, blend)
      hares[i].rotation.x = motion.pitch
    })
    frame.foxes.forEach((fox, i) => void pose(foxes[i], fox, animalPose('fox', fox.behavior, time, i).height, blend))
  }
  update(biomeFrame(initial), 0)
  return update
}
