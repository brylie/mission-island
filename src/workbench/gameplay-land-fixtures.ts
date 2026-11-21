import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { buildHarvestedCarrot } from '../assets/barrow'
import { poseCrew } from '../assets/crew'
import { farmFurrowTop } from '../assets/farm'
import { buildHoneyHive, honeyHiveEntrance } from '../assets/honey-props'
import { createRock } from '../assets/props'
import { createGroundCover } from '../biome-scenery'
import { createFarm } from '../island-farm'
import type { MeshFactory } from '../island-meshes'
import { contactAge, crewAt, type Fixture } from './effect-fixtures'

export function carrotPullFixture(meshes: MeshFactory): Fixture {
  const crew = crewAt(meshes, -0.32, -0.65)
  crew.root.rotation.y = 0.83
  const rowCenter = { x: -0.32, z: 0.055 }
  const showPlot = createFarm(meshes, [rowCenter], () => 0)
  showPlot(['ripe'])
  const carrot = new TransformNode('Lifted carrot', meshes.scene)
  const liftedRoot = new TransformNode('Upright harvested carrot', meshes.scene)
  liftedRoot.parent = carrot
  const quarterTurn = Math.PI / 2
  liftedRoot.rotation.x = -quarterTurn
  buildHarvestedCarrot(meshes, liftedRoot)
  carrot.setEnabled(false)
  const pullAge = (time: number) => contactAge(time, 0.43, 1.02, 0.53) ?? 0
  function lift(time: number) {
    return 0.11 + 0.98 * Math.sin(pullAge(time) / 0.53 * Math.PI) ** 0.74
  }
  const restingArmPitch = 0.2
  const reachHeight = 0.44
  const reachGain = 2.18
  return {
    sourceAt(time) {
      const t = contactAge(time, 0.51, 1.02, 0.15)
      if (t !== undefined) return { x: -0.3 + t * 0.37, y: Math.max(0.135, lift(time) - 0.16), z: rowCenter.z, floor: farmFurrowTop }
    },
    pose(time) {
      const height = lift(time)
      const age = pullAge(time)
      showPlot([age > 0 ? 'tilled' : 'ripe'])
      carrot.setEnabled(age > 0)
      carrot.position.set(rowCenter.x + age * 0.35, height, rowCenter.z)
      carrot.rotation.z = -0.29 * Math.sin(age * 5)
      crew.arms[0].rotation.x = -Math.max(restingArmPitch, (height - reachHeight) * reachGain)
    },
  }
}

export function hiveTrafficFixture(meshes: MeshFactory): Fixture {
  const hive = new TransformNode('Long Acre hive', meshes.scene)
  buildHoneyHive(meshes, hive, 'light')
  crewAt(meshes, -1.25, -0.42, 1)
  const laneCount = 7
  const centerLane = 3
  const laneWidth = honeyHiveEntrance.width / laneCount
  return {
    sourceAt(time, index) {
      const inward = index % 5 === 0 || index % 5 === 1
      const distance = inward ? 0.86 + (index % 4) * 0.18 : 0
      return { x: (index % laneCount - centerLane) * laneWidth, y: honeyHiveEntrance.y + distance * 0.28, z: honeyHiveEntrance.z + distance, yaw: inward ? Math.PI + Math.sin(time * 5) * 0.09 : 0, pitch: inward ? -0.21 : 0.05, speed: inward ? 1.43 : 1, floor: honeyHiveEntrance.floor }
    },
  }
}

export function cloverStepFixture(meshes: MeshFactory): Fixture {
  meshes.box(0, -0.039, 0, 4.25, 0.078, 2.5, '#698557').receiveShadows = true
  const crew = crewAt(meshes, 0, 0, 1)
  const patchCount = 5
  for (let i = 0; i < patchCount; i++) {
    const x = -0.61 + Math.sin(i * 8) * 0.072
    const z = -0.94 + i * 0.43 + Math.sin(i * 3) * 0.094
    const patch = createGroundCover(meshes, false)
    patch.position.set(x, 0, z)
  }
  const path = (time: number) => -1.27 + Math.min(3.05, time) * 0.74
  return {
    sourceAt(time) {
      const t = contactAge(time, 0.407, 0.56, 0.14)
      if (t !== undefined) return { x: -0.48, y: 0.245, z: path(time - t) + 0.23, floor: 0.037 }
    },
    pose(time) {
      crew.root.position.set(-0.23, 0, path(time))
      crew.root.rotation.y = -0.15
      poseCrew(crew, (Math.min(time, 3.05) - 0.407) / 1.12 + 0.25, time < 3.05 ? 0.47 : 0, false)
    },
  }
}

export function slateFixture(meshes: MeshFactory): Fixture {
  const slope = meshes.box(-0.31, 0.41, -0.25, 1.83, 0.21, 2.8, '#707d82')
  slope.rotation.x = 0.26
  meshes.box(-0.27, -0.04, 0, 4.2, 0.085, 4.35, '#637075').receiveShadows = true
  for (let i = 0; i < 8; i++) {
    const z = -0.9 + i * 0.285
    const slab = meshes.box(-0.61 + Math.sin(i * 2.2) * 0.46, 0.52 - (z + 0.25) * 0.26, z, 0.48, 0.11, 0.38, i % 2 ? '#7c8d93' : '#62747c')
    slab.rotation.set(0.26, i * 0.92, -0.11)
  }
  createRock(meshes, -1.53, 0.98, 0.78, 0.93, false)
  crewAt(meshes, 1.11, 0.35, 1)
  return {
    sourceAt(time, index) {
      const release = contactAge(time, 0.33, 0.94, 0.23)
      if (release !== undefined) return { x: -0.46 + (index % 4) * 0.18, y: 0.57, z: 0.18 + release * 0.65, floor: 0.047 }
    },
  }
}

export function hedgeFixture(meshes: MeshFactory): Fixture {
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 0.46
    meshes.sphere(x, 0.76 + 0.095 * Math.cos(i * 3), 0.32, 0.78, 1.34, 1.02, i % 2 ? '#66854d' : '#527343', undefined, true, 8)
  }
  const crew = crewAt(meshes, -0.54, 1.27)
  crew.root.rotation.y = Math.PI
  poseCrew(crew, 0, 0, false, 'tool', 1, 1, 0, false, true)
  const pivot = new TransformNode('Hedge shears', meshes.scene)
  const blades = [-1, 1].map((side) => {
    const pivotSide = new TransformNode('Shear handle and blade', meshes.scene)
    pivotSide.parent = pivot
    meshes.box(0, 0, -0.219, 0.059, 0.052, 0.438, '#98835f', pivotSide)
    meshes.box(0, 0, 0.158, 0.081, 0.027, 0.327, '#a0ada4', pivotSide)
    return { side, pivotSide }
  })
  const clip = (time: number) => contactAge(time, 0.43, 0.71, 0.33) ?? 0.33
  return {
    sourceAt(time) {
      if (contactAge(time, 0.41, 0.71, 0.14) !== undefined) {
        return { x: -0.47 + 0.22 * Math.sin(time * 3), y: 1.26, z: 0.7, floor: 0.055 }
      }
    },
    pose(time) {
      pivot.position.set(-0.47 + 0.22 * Math.sin(time * 3), 1.26, 0.78)
      pivot.rotation.y = Math.PI
      const opening = 0.095 + Math.sin(clip(time) / 0.33 * Math.PI) * 0.38
      for (const { side, pivotSide } of blades) pivotSide.rotation.y = side * opening
    },
  }
}
