import { habitatNavigation } from './biome-navigation'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createTree, createRock } from './assets/props'
import { createHare } from './hare'
import type { MeshFactory } from './island-meshes'
import { placeSiteFeatures } from './assets/site-props'
import { biomeFrame, type BiomeFrame, type populate } from './biome-model'
import type { Point } from './world'

export function createFox(meshes: MeshFactory) {
  const root = new TransformNode('Fox', meshes.scene)
  const coat = '#ba653c', cream = '#e5d9b9'
  const part = (x: number, y: number, z: number, w: number, h: number, d: number, color: string) =>
    meshes.sphere(x, y, z, w, h, d, color, root, true, 5)
  part(0, 0.42, 0, 0.39, 0.43, 0.88, coat)
  part(0, 0.61, 0.35, 0.39, 0.4, 0.41, coat)
  part(0, 0.55, 0.56, 0.23, 0.18, 0.28, cream)
  part(0, 0.57, 0.7, 0.09, 0.08, 0.08, '#433b33')
  part(0, 0.36, -0.58, 0.28, 0.28, 0.68, coat).rotation.x = -0.18
  part(0, 0.31, -0.85, 0.19, 0.19, 0.25, cream)
  for (const side of [-1, 1]) {
    meshes.cylinder(side * 0.13, 0.84, 0.29, 0, 0.18, 0.26, 3, coat, root)
    for (const z of [-0.24, 0.24]) part(side * 0.14, 0.17, z, 0.12, 0.32, 0.13, '#523c32')
  }
  return root
}

export function createGroundCover(meshes: MeshFactory, grass: boolean, seed = 0) {
  const root = new TransformNode(grass ? 'Tussock' : 'Clover', meshes.scene)
  // One mesh per patch keeps individual plants cheap even at full density.
  const vertices: number[] = [], faces: number[] = []
  for (let i = 0; i < (grass ? 28 : 18); i++) {
    const angle = i * 2.39996 + Math.sin(seed + i) * (seed ? 0.6 : 0)
    const spread = 0.1 + 0.42 * ((i * 7) % 17) / 17
    const x = Math.cos(angle) * spread, z = Math.sin(angle) * spread
    const tip = grass ? 0.26 + (i % 5) * 0.072 : 0.1 + i % 3 * 0.04
    const leafCount = grass ? 1 : 3
    for (let j = 0; j < leafCount; j++) {
      const a = angle + j * 2 * Math.PI / 3, dx = Math.cos(a), dz = Math.sin(a)
      const base = vertices.length / 3, width = grass ? 0.041 : 0.074
      vertices.push(x, grass ? 0 : 0.04, z, x + dx * 0.1 - dz * width, tip * 0.78, z + dz * 0.1 + dx * width, x + dx * 0.19, tip, z + dz * 0.19, x + dx * 0.1 + dz * width, tip * 0.78, z + dz * 0.1 - dx * width)
      faces.push(base, base + 1, base + 2, base, base + 2, base + 3)
    }
  }
  const leaves = meshes.surface(root.name, vertices, faces, grass ? '#8c9c4f' : '#478254', root)
  if (leaves.material) leaves.material.backFaceCulling = false
  if (!grass) {
    for (const offset of [-0.24, 0.18]) meshes.sphere(offset, 0.19, offset * 0.6, 0.13, 0.12, 0.13, '#ece4cb', root, false, 4)
  }
  return root
}

export function animalPose(species: 'hare' | 'fox', behavior: string, time: number, index = 0) {
  if (species === 'fox') return { height: behavior === 'watching' ? 0 : 0.035 * Math.abs(Math.sin(time * 6 + index)), pitch: 0 }
  const still = behavior === 'grazing' || behavior === 'sheltering'
  const hop = still ? 0 : 0.11 * Math.abs(Math.sin(time * (behavior === 'fleeing' ? 12 : 7) + index))
  if (behavior === 'sheltering') return { height: 0.075, pitch: -0.06 }
  return { height: 0.12 + hop, pitch: behavior === 'grazing' ? 0.18 : 0 }
}

export function createBiomeScenery(meshes: MeshFactory, initial: ReturnType<typeof populate>, center: Point, heightAt: (p: Point) => number) {
  const navigation = habitatNavigation(initial.patches)
  const plants: TransformNode[] = []
  initial.patches.forEach((patch, i) => {
    const p = { ...patch, x: patch.x + center.x, z: patch.z + center.z }
    const ground = heightAt(p)
    if (p.kind === 'trees') createTree(meshes, p.x, p.z, 2.7 + p.angle * 0.24, i % 2 + 1, ground)
    if (p.kind === 'stones') createRock(meshes, p.x, p.z, 0.8 + 0.13 * p.angle, p.angle, i % 2 === 0, ground)
    if (p.kind === 'logs') placeSiteFeatures(meshes, [{ ...p, site: 'biome', model: 'log', name: 'Fallen trunk', heading: p.angle, followSlope: true, color: '#87725a' }], heightAt)
    if (p.kind === 'grass' || p.kind === 'clover') {
      const root = createGroundCover(meshes, p.kind === 'grass')
      root.position.set(p.x, ground, p.z)
      root.rotation.y = p.angle
      if (p.kind === 'clover') plants.push(root)
    }
  })
  const hares = initial.hares.map((_, i) => createHare(meshes, 'Hare', i % 2 ? '#b6a188' : '#967858'))
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
    plants.forEach((plant, i) => plant.scaling.setAll(0.28 + 0.72 * frame.clover[i]))
    frame.hares.forEach((animal, i) => {
      const motion = animalPose('hare', animal.behavior, time, i)
      pose(hares[i], animal, motion.height, blend)
      hares[i].rotation.x = motion.pitch
    })
    frame.foxes.forEach((fox, i) => pose(foxes[i], fox, animalPose('fox', fox.behavior, time, i).height, blend))
  }
  update(biomeFrame(initial), 0)
  return update
}
