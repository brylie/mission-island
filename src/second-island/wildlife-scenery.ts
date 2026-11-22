import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { saltwindFlockColors, saltwindHareColor, saltwindMallardModel, saltwindRoostTree } from '../assets/geometry/saltwind-wildlife'
import { createTree } from '../assets/props'
import { createGullFlock } from '../gull-flock'
import { saltwindGullStops } from '../gull-sites'
import { createHare } from '../hare'
import type { MeshFactory } from '../island-meshes'
import { createCoastalFish } from '../school-fish'
import { createFlocks, createSchools } from '../wildlife'
import type { WildlifeFrame } from '../wildlife'
import { saltwindWildlifeSites } from '../worlds/saltwind/layout/scenery'
import { previewSandspit, sandspitShallows } from './sandspit-school'
import { lowerLake, seaLevel } from './sites'
import type { MapPoint } from './sites'
import { groundHeight, surfaceHeight, waterHeight } from './terrain'
import type { ScenerySolids } from './walking'

const perchClearance = 0.15
const birdFlockRange = 22
const birdFlockSize = 5
const batFlockRange = 14
const batFlockSize = 3
const lakeSchoolPatrolSpeed = 0.23
const lakeSchoolPatrolRadiusX = 4
const lakeSchoolPatrolRadiusZ = 2
const lakeSchoolMinimumDepth = 0.4
const mallardWaterClearance = 0.24
const mallardPatrolSpan = 12
const mallardPatrolSpeed = 0.25
const mallardGroupSize = 3
const harePatrolSpan = 6
const meadowHareSpeed = 0.83
const forestHareSpeed = 0.75
const hareGroupSize = 2
const wildlifeViewRange = 117
const sandspitThreatRange = 1.9
const patrolPhaseOffset = 0.66
const patrolRadiusOffset = 0.54
const patrolDepthRatio = 0.69
const patrolBobFrequency = 2
const patrolBobHeight = 0.06
const hareStrideFrequency = 5
const hareGroundClearance = 0.16
const hareHopHeight = 0.25

export function createSaltwindWildlife(meshes: MeshFactory, solids: ScenerySolids) {
  const { alderCrownRoost, reedwaterBats, mirrorLakeSchool, meadowHares, forestHares } = saltwindWildlifeSites
  const { x: roostX, z: roostZ } = alderCrownRoost.tree
  const { height: roostHeight, support, perchHeightRatio } = saltwindRoostTree
  const roostGround = groundHeight(roostX, roostZ)
  createTree(meshes, roostX, roostZ, roostHeight, 0, roostGround)
  solids.add({
    x: roostX,
    z: roostZ,
    bottom: roostGround,
    top: roostGround + roostHeight * support.heightRatio,
    width: support.width,
    depth: support.depth,
    heading: 0,
  })
  const roost = { x: roostX, y: roostGround + roostHeight * perchHeightRatio, z: roostZ }
  const perch = ({ x, z }: MapPoint) => ({ x, z, y: surfaceHeight(x, z) + perchClearance })
  const gulls = createGullFlock(meshes, saltwindGullStops.map((stop) => ({ ...stop, y: surfaceHeight(stop.x, stop.z) })))
  const flocks = createFlocks(meshes, [
    { center: alderCrownRoost.flockCenter, range: birdFlockRange, count: birdFlockSize, color: saltwindFlockColors.bird, landing: perch(alderCrownRoost.landing), roost },
    { center: reedwaterBats.flockCenter, range: batFlockRange, count: batFlockSize, color: saltwindFlockColors.bat, bat: true, landing: perch(reedwaterBats.perch), roost: perch(reedwaterBats.perch) },
  ])
  const schools = createSchools(meshes, [{
    swim: (time) => ({
      x: lowerLake.x + mirrorLakeSchool.offset.x + lakeSchoolPatrolRadiusX * Math.sin(time * lakeSchoolPatrolSpeed),
      z: lowerLake.z + mirrorLakeSchool.offset.z + lakeSchoolPatrolRadiusZ * Math.cos(time * lakeSchoolPatrolSpeed),
    }),
    deep: mirrorLakeSchool.deep,
    level: lowerLake.y,
    isWater: ({ x, z }) => waterHeight(x, z) === lowerLake.y && groundHeight(x, z) < lowerLake.y - lakeSchoolMinimumDepth,
  }])
  const sandspit = previewSandspit()
  const sandspitFish = createCoastalFish(meshes, sandspitShallows, seaLevel)
  const animals = [
    {
      name: 'Mallards',
      kind: 'duck',
      x: lowerLake.x,
      z: lowerLake.z,
      y: lowerLake.y + mallardWaterClearance,
      span: mallardPatrolSpan,
      speed: mallardPatrolSpeed,
      count: mallardGroupSize,
    },
    { name: 'Hares', kind: 'hare', ...meadowHares, y: 0, span: harePatrolSpan, speed: meadowHareSpeed, count: hareGroupSize },
    { name: 'Forest hares', kind: 'hare', ...forestHares, y: 0, span: harePatrolSpan, speed: forestHareSpeed, count: hareGroupSize },
  ].flatMap((animal) => Array.from({ length: animal.count }, (_, index) => {
    const root = animal.kind === 'hare' ? createHare(meshes, animal.name, saltwindHareColor) : new TransformNode(animal.name, meshes.scene)
    if (animal.kind === 'duck') {
      const { body, head, segments } = saltwindMallardModel
      meshes.sphere(...body, root, false, segments)
      meshes.sphere(...head, root, false, segments)
    }
    return { ...animal, root, index }
  }))
  return (frame: WildlifeFrame, overview: boolean) => {
    flocks(frame)
    gulls(frame)
    schools(frame)
    const school = sandspit(frame.time, frame.threats.map(({ x, z }) => ({ x, z, range: sandspitThreatRange })), frame.seek)
    sandspitFish(frame, overview ? undefined : school)
    const { time, camera } = frame
    for (const animal of animals) {
      const { root, index, x, z, span, kind, speed, y } = animal
      const visible = !overview && Math.hypot(camera.x - x, camera.z - z) < wildlifeViewRange
      root.setEnabled(visible)
      if (!visible) continue
      const angle = time * speed + index * patrolPhaseOffset, r = span + index * patrolRadiusOffset
      const px = x + r * Math.cos(angle), pz = z + r * patrolDepthRatio * Math.sin(angle)
      const h = kind === 'hare'
        ? groundHeight(px, pz) + hareGroundClearance + Math.abs(Math.sin(time * hareStrideFrequency + index)) * hareHopHeight
        : y
      root.position.set(px, h + Math.sin(angle * patrolBobFrequency + index) * patrolBobHeight, pz)
      root.rotation.y = Math.atan2(-Math.sin(angle), Math.cos(angle) * patrolDepthRatio)
    }
  }
}
