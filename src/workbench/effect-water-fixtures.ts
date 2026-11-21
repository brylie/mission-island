import { poseCrew, poseSkiffCrew, poseSwimming, skiffCrewSeats } from '../assets/crew'
import { createSchoolFish } from '../assets/fish'
import { createFishingFloat } from '../assets/fishing'
import { createRock } from '../assets/props'
import { createHarborBoat } from '../assets/waterfront'
import type { MeshFactory } from '../island-meshes'
import { createIslandMaterial } from '../materials'
import { contactAge, crewAt, type Fixture } from './effect-fixtures'

function waterTray(meshes: MeshFactory, width: number, depth: number) {
  meshes.box(0, -0.11, 0, width, 0.22, depth, '#387b83', undefined, false).receiveShadows = true
}

export function wakeFixture(meshes: MeshFactory): Fixture {
  waterTray(meshes, 6.4, 11.2)
  const boat = createHarborBoat(meshes)
  boat.rotation.y = 0
  const crew = crewAt(meshes, 0, 0, 1)
  crew.root.parent = boat
  crew.root.position.copyFrom(skiffCrewSeats[1])
  poseSkiffCrew(crew, 0, 1, false, 1)
  const run = (time: number) => -1 + 0.97 * Math.min(time, 3) + 0.09 * Math.min(time, 3) ** 2
  return {
    sourceAt(time, index) {
      const side = index % 2 ? -1 : 1
      const speed = 0.87 + 0.17 * time
      return { x: side * 0.59, y: 0.016, z: run(time) - 2.18, yaw: -side * 0.59, speed }
    },
    pose(time) {
      boat.position.set(0, 0.035 + Math.sin(time * 3) * 0.027, run(time))
      boat.rotation.z = Math.sin(time * 2.6) * 0.031
    },
  }
}

export function wadingFixture(meshes: MeshFactory): Fixture {
  waterTray(meshes, 4.6, 6.15)
  const crew = crewAt(meshes, 0, 0, 0)
  createRock(meshes, 1.7, -0.55, 0.61, 0.4, true)
  createRock(meshes, -1.7, 1.55, 0.73, 1.85, false)
  const run = (time: number) => -1.8 + 0.84 * Math.min(time, 3) + 0.21 * Math.max(0, Math.min(time, 3) - 1.2) ** 2
  function step(time: number) {
    const age = contactAge(time, 0.35, 0.68, 0.145)
    if (age === undefined) return
    const beat = Math.floor((time - 0.35) / 0.68)
    const side = beat % 2 ? -1 : 1
    return { x: 0.19 * side, y: 0.016, z: run(time - age) + 0.22, yaw: side * (0.18 + beat * 0.07), speed: 0.75 + beat * 0.22 }
  }
  return {
    sourceAt: step,
    accents: [{ id: 'wading-drops', sourceAt: (time) => {
      const hit = step(time)
      if (hit) return { ...hit, y: 0.046, floor: 0.014 }
    } }],
    pose(time) {
      crew.root.position.set(0, -0.1, run(time))
      poseCrew(crew, (Math.min(time, 3) - 0.35) / 1.36 + 0.25, time < 3 ? 0.57 + Math.min(time, 2.8) * 0.095 : 0, false)
    },
  }
}

export function fishThrashFixture(meshes: MeshFactory): Fixture {
  waterTray(meshes, 5, 4.4)
  const fish = createSchoolFish(meshes, meshes.paint('#a8b293'))
  fish.scaling.setAll(1.64)
  fish.rotation.y = 0.95
  const bobber = createFishingFloat(meshes)
  bobber.position.set(-0.52, 0.03, 0.22)
  const crew = crewAt(meshes, 1.8, -1.35)
  crew.root.rotation.y = -1.4
  const reach = 0.96
  const pop = { x: 0, y: 0.022, z: 0.05 }
  return {
    sourceAt(time) {
      const hit = contactAge(time, 0.35, reach, 0.29)
      if (hit !== undefined && (hit < 0.083 || hit > 0.174)) return pop
    },
    accents: [{ id: 'fish-spray', sourceAt: (time) => {
      if (contactAge(time, 0.35, reach, 0.16) !== undefined) return { ...pop, y: 0.1, floor: 0.017 }
    } }],
    pose(time) {
      const jump = contactAge(time, 0.3, reach, 0.55)
      const lift = jump === undefined ? 0 : Math.sin(Math.PI * jump / 0.55)
      fish.position.set(lift * 0.14, -0.21 + lift * 0.63, 0.05)
      fish.rotation.x = -lift * 0.79
      fish.rotation.z = lift * Math.sin(time * 27) * 0.77
      bobber.position.y = 0.04 + lift * 0.061 + 0.018 * Math.sin(time * 7)
    },
  }
}

export function submergedFixture(meshes: MeshFactory): Fixture {
  const surface = 0.94
  meshes.box(0, -0.79, 0, 5.8, 0.18, 3.85, '#3b6566')
  meshes.box(0, 0.03, -1.89, 5.8, 1.81, 0.1, '#326e79')
  const glass = createIslandMaterial(meshes.scene, 'Water cross section', '#589fa4', true)
  glass.alpha = 0.24
  const tray = meshes.box(0, surface - 0.017, 0, 5.8, 0.034, 3.72, glass, undefined, false)
  tray.alphaIndex = 1
  for (const [x, z, size] of [[-2.15, -0.9, 0.61], [2.15, -0.73, 0.68], [-1.72, 0.99, 0.39]]) {
    createRock(meshes, x, z, size, x, false, -0.7)
  }
  const crew = crewAt(meshes, 0, 0, 1)
  const pace = (time: number) => -1.65 + 0.62 * Math.min(time, 3.15)
  return {
    sourceAt(time, index) {
      return { x: pace(time) + 1.08, y: 0.48 + Math.sin(time * 6 + index % 2 * Math.PI) * 0.06, z: -0.02, ceiling: surface - 0.009 }
    },
    accents: [{ id: 'surface-pops', sourceAt: (time) => {
      if (time >= 0.66) return { x: pace(time - 0.43) + 0.98, y: surface + 0.012, z: -0.18 }
    } }],
    pose(time) {
      poseSwimming(crew, time, 1)
      crew.root.position.set(pace(time), 0.015, 0.08)
      crew.root.rotation.x = 1.18
      crew.root.rotation.y = Math.PI / 2
    },
  }
}

export function eddyFixture(meshes: MeshFactory): Fixture {
  waterTray(meshes, 5.8, 5.6)
  createRock(meshes, 0, 0, 1.48, 0.7, false)
  createRock(meshes, -0.85, 0.66, 0.45, -1.1, true)
  const crew = crewAt(meshes, 2.23, 0.71, 1)
  crew.root.rotation.y = -Math.PI / 2
  for (const x of [-2.15, 2.22]) meshes.box(x, 0.015, 0, 0.72, 0.06, 5.6, '#6d7771')
  return {
    sourceAt(time, index) {
      const angle = -1.72 + 0.58 * Math.sin(time * 4.2) + 0.33 * (index % 3)
      const radius = 0.89 + (index % 4) * 0.095
      return { x: Math.cos(angle) * radius, y: 0.015, z: Math.sin(angle) * radius, orbit: { x: 0, z: 0, angularSpeed: 2.16, peelAfter: 1.07 + (index % 4) * 0.14 } }
    },
  }
}
