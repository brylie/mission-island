import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { poseCrew } from '../assets/crew'
import { fishingFloatRestHeight } from '../assets/fishing'
import { createFlatbed, poseFlatbed } from '../assets/flatbed'
import { createDockDeck, createDockPile, createHarborBoat } from '../assets/waterfront'
import { aimFishingRod, createFishingGear, poseCastLine } from '../fishing-line-view'
import type { MeshFactory } from '../island-meshes'
import { flatbedGroundDrive } from '../vehicles/flatbed'
import { harborDockPiles } from '../world'
import { contactAge, crewAt, type Fixture } from './effect-fixtures'

const dockWood = '#9e7951'
const water = '#44848d'

export function bobberFixture(meshes: MeshFactory): Fixture {
  const dockX = -2.5, firstBoardZ = 1.47, deckTop = 0.1, boardCount = 7
  meshes.box(0, -0.12, 0, 4.35, 0.24, 3.52, water, undefined, false)
  createDockDeck(meshes, dockX, firstBoardZ, deckTop, boardCount)
  const crew = crewAt(meshes, -1.17, -0.08)
  crew.root.position.y = deckTop
  const facing = { heading: Math.PI * 0.5, casting: null }
  crew.root.rotation.y = facing.heading
  poseCrew(crew, 0, 0, false, 'tool', 0.85)
  const [kit] = createFishingGear(meshes.scene, meshes, [crew])
  const [hand] = kit.gear
  hand.grip.setEnabled(true)
  hand.paddle.setEnabled(false)
  kit.bobber.isVisible = kit.line.isVisible = true
  aimFishingRod(facing, kit, 0)
  const tug = (time: number) => contactAge(time, 0.39, 0.94, 0.41) ?? 0
  const tugDistance = (age: number) => Math.sin(age / 0.41 * Math.PI)
  return {
    sourceAt(time) {
      const age = contactAge(time, 0.413, 0.94, 0.14)
      if (age !== undefined) return { x: 0.32 + tugDistance(age) * 0.16, y: 0.018, z: 0.02 }
    },
    pose(time) {
      const pull = tugDistance(tug(time))
      kit.bobber.position.set(0.32 + 0.19 * pull, fishingFloatRestHeight - 0.126 * pull + 0.012 * Math.sin(time * 6.2), 0.02)
      poseCastLine(kit, 0)
    },
  }
}

export function slipwayFixture(meshes: MeshFactory): Fixture {
  const truck = createFlatbed(meshes)
  const apron = meshes.paintSurface('concrete', '#778681')
  meshes.box(0, -0.061, -0.15, 4.7, 0.122, 9, apron).receiveShadows = true
  meshes.box(0.94, 0.013, 0.15, 1.25, 0.023, 2.5, '#508f98', undefined, false)
  meshes.box(-0.94, 0.013, 0.15, 1.25, 0.023, 2.5, '#508f98', undefined, false)
  for (const side of [-1, 1]) meshes.box(side * 2.2, 0.005, -0.12, 0.08, 0.018, 8.7, '#c2c3ad', undefined, false)
  const travel = (time: number) => -2.85 + Math.min(time, 3.16) * 1.18
  return {
    sourceAt(time, index) {
      const z = travel(time) + flatbedGroundDrive.wheels.axles[1]
      if (z < -0.91 || z > 1.28) return
      const side = index % 3 ? 1 : -1
      return { x: flatbedGroundDrive.wheels.halfTrack * side, y: 0.071, z, yaw: side > 0 ? 0.17 : -1.35, speed: 0.85 + time * 0.14, floor: 0.031 }
    },
    pose(time) {
      truck.root.position.set(0, 0.013, travel(time))
      poseFlatbed(truck, Math.min(time, 3.16) * 3.4, 0)
    },
  }
}

export function hullDrainFixture(meshes: MeshFactory): Fixture {
  const boat = createHarborBoat(meshes)
  boat.position.set(0, 1.02, -0.28)
  boat.rotation.set(0.175, Math.PI, 0)
  for (const z of [-1.45, 0.91]) {
    meshes.box(0, 0.51, z, 2.57, 0.17, 0.25, dockWood)
    for (const x of [-0.98, 0.98]) meshes.box(x, 0.235, z, 0.21, 0.47, 0.22, '#7f6b4d')
  }
  meshes.box(0, -0.056, 0, 3.95, 0.112, 6.65, '#818b79').receiveShadows = true
  meshes.cylinder(0, 0.015, 2.36, 0.94, 0.94, 0.025, 14, '#527b7b', undefined, false)
  const crew = crewAt(meshes, 1.7, 1.69, 1)
  crew.root.rotation.y = -1.7
  const bung = new Vector3(0, -0.245, -2.23)
  return {
    sourceAt(time) {
      if (time > 2.38 && contactAge(time, 2.4, 0.22, 0.079) === undefined) return
      const { x, y, z } = Vector3.TransformCoordinates(bung, boat.computeWorldMatrix(true))
      return { x, y, z, speed: 1.18 - Math.min(time, 2.9) * 0.2, floor: 0.026 }
    },
  }
}

export function mooringShakeFixture(meshes: MeshFactory): Fixture {
  meshes.box(0, -0.096, 0, 5.55, 0.193, 3.28, water, undefined, false)
  const firstBoardZ = -0.63, deckTop = 0.11, boardCount = 2
  createDockDeck(meshes, 0, firstBoardZ, deckTop, boardCount)
  const pileZ = -0.18, pileTop = 0.75
  const [pile] = harborDockPiles
  const pileBottom = pileTop - (pile.top - pile.bottom)
  for (const x of [-1.65, 1.65]) createDockPile(meshes, { ...pile, x, z: pileZ, top: pileTop, bottom: pileBottom })
  const crew = crewAt(meshes, -1.44, -0.95)
  crew.root.position.y = deckTop
  const rope = Array.from({ length: 12 }, () => meshes.box(0, 0, 0, 0.28, 0.035, 0.041, '#d0ac76', undefined, false))
  const wave = (time: number) => contactAge(time, 0.37, 0.98, 0.63)
  function lineHeight(time: number, along: number) {
    const t = wave(time)
    const snap = t === undefined ? 0 : Math.sin(t * 25 - along * 7) * Math.exp(-t * 6) * 0.145
    return 0.67 + Math.sin(along * Math.PI) * (snap - 0.235)
  }
  return {
    sourceAt(time, index) {
      const t = wave(time)
      if (t === undefined || t > 0.17) return
      const along = 0.12 + index % 13 * 0.063
      return { x: -1.65 + along * 3.3, y: lineHeight(time, along), z: -0.15, floor: 0.018 }
    },
    pose(time) {
      for (const [index, segment] of rope.entries()) {
        const a = index / rope.length, b = (index + 1) / rope.length
        const rise = lineHeight(time, b) - lineHeight(time, a)
        segment.position.set(-1.65 + 3.3 * (a + b) / 2, (lineHeight(time, a) + lineHeight(time, b)) / 2, -0.15)
        segment.rotation.z = Math.atan2(rise, 3.3 / rope.length)
        segment.scaling.x = Math.hypot(3.3 / rope.length, rise) / 0.28
      }
    },
  }
}

export function bootTrailFixture(meshes: MeshFactory): Fixture {
  meshes.box(0, -0.079, 0, 4.05, 0.158, 4.2, water, undefined, false)
  const firstBoardZ = 1.96, deckTop = 0.067, boardCount = 9
  createDockDeck(meshes, 0, firstBoardZ, deckTop, boardCount)
  const crew = crewAt(meshes, 0, 0, 1)
  const stride = (time: number) => -1.38 + 0.89 * Math.min(3, time)
  const footClearance = 0.005, stampClearance = 0.007
  return {
    sourceAt(time) {
      const age = contactAge(time, 0.34, 0.49, 0.09)
      if (age === undefined) return
      const step = Math.floor((time - 0.34) / 0.49)
      const side = step % 2 ? -1 : 1
      return { x: 0.175 * side, y: deckTop + stampClearance, z: stride(time - age) + 0.21, yaw: side * 0.14 }
    },
    pose(time) {
      crew.root.position.set(0, deckTop + footClearance, stride(time))
      poseCrew(crew, (Math.min(time, 3) - 0.34) / 0.98 + 0.25, time > 3 ? 0 : 0.54, false)
    },
  }
}
