import { poseCrew, poseSkiffCrew, poseSwimming, skiffCrewSeats } from '../assets/crew'
import { createSchoolFish } from '../assets/fish'
import { createFishingFloat } from '../assets/fishing'
import { eddyStage, submergedStage, wadingRocks, waterTrayGeometry } from '../assets/geometry/workbench-water-fixtures'
import { createRock } from '../assets/props'
import { createHarborBoat } from '../assets/waterfront'
import type { MeshFactory } from '../island-meshes'
import { createIslandMaterial } from '../materials'
import { contactAge, crewAt, type Fixture } from './effect-fixtures'

const alternatingSides = 2
const squared = 2
const half = 0.5
const quarterTurn = Math.PI * half

function waterTray(meshes: MeshFactory, width: number, depth: number) {
  const { y, thickness, color } = waterTrayGeometry
  meshes.box(0, y, 0, width, thickness, depth, color, undefined, false).receiveShadows = true
}

export function wakeFixture(meshes: MeshFactory): Fixture {
  waterTray(meshes, ...waterTrayGeometry.wake)
  const boat = createHarborBoat(meshes)
  boat.rotation.y = 0
  const crew = crewAt(meshes, 0, 0, 1)
  crew.root.parent = boat
  crew.root.position.copyFrom(skiffCrewSeats[1])
  poseSkiffCrew(crew, 0, 1, false, 1)
  const runStartZM = -1, runDurationS = 3, initialPaceMps = 0.97, halfAccelerationMps2 = 0.09
  const foamOutsetM = 0.59, foamYM = 0.016, foamBehindCenterM = 2.18, foamYawRad = 0.59
  const foamSpeedScale = 0.87, foamSpeedRisePerSecond = 0.17
  const hullYM = 0.035, bobRadPerSecond = 3, bobM = 0.027, rollRadPerSecond = 2.6, rollRad = 0.031
  function run(time: number) {
    const elapsed = Math.min(time, runDurationS)
    return runStartZM + initialPaceMps * elapsed + halfAccelerationMps2 * elapsed ** squared
  }
  return {
    sourceAt(time, index) {
      const side = index % alternatingSides ? -1 : 1
      const speed = foamSpeedScale + foamSpeedRisePerSecond * time
      return { x: side * foamOutsetM, y: foamYM, z: run(time) - foamBehindCenterM, yaw: -side * foamYawRad, speed }
    },
    pose(time) {
      boat.position.set(0, hullYM + Math.sin(time * bobRadPerSecond) * bobM, run(time))
      boat.rotation.z = Math.sin(time * rollRadPerSecond) * rollRad
    },
  }
}

export function wadingFixture(meshes: MeshFactory): Fixture {
  waterTray(meshes, ...waterTrayGeometry.wading)
  const crew = crewAt(meshes, 0, 0, 0)
  for (const [x, z, size, angle, light] of wadingRocks) createRock(meshes, x, z, size, angle, light)
  const startZM = -1.8, walkDurationS = 3, initialPaceMps = 0.84, speedUpStartS = 1.2, halfAccelerationMps2 = 0.21
  const firstStepS = 0.35, stepPeriodS = 0.68, stepContactS = 0.145
  const toeOutsetM = 0.19, toeLeadM = 0.22, rippleYM = 0.016, toeYawRad = 0.18, yawPerStepRad = 0.07
  const rippleSpeedScale = 0.75, rippleSpeedPerStep = 0.22, dropletYM = 0.046, dropletFloorYM = 0.014
  const waderYM = -0.1, stridePeriodS = stepPeriodS * alternatingSides, startCycle = 0.25
  const startingStride = 0.57, strideRisePerSecond = 0.095, strideRiseEndS = 2.8
  function run(time: number) {
    const elapsed = Math.min(time, walkDurationS)
    return startZM + initialPaceMps * elapsed + halfAccelerationMps2 * Math.max(0, elapsed - speedUpStartS) ** squared
  }
  function step(time: number) {
    const age = contactAge(time, firstStepS, stepPeriodS, stepContactS)
    if (age === undefined) return
    const beat = Math.floor((time - firstStepS) / stepPeriodS)
    const side = beat % alternatingSides ? -1 : 1
    return {
      x: toeOutsetM * side,
      y: rippleYM,
      z: run(time - age) + toeLeadM,
      yaw: side * (toeYawRad + beat * yawPerStepRad),
      speed: rippleSpeedScale + beat * rippleSpeedPerStep,
    }
  }
  return {
    sourceAt: step,
    accents: [{ id: 'wading-drops', sourceAt: (time) => {
      const hit = step(time)
      if (hit) return { ...hit, y: dropletYM, floor: dropletFloorYM }
    } }],
    pose(time) {
      crew.root.position.set(0, waderYM, run(time))
      const cycle = (Math.min(time, walkDurationS) - firstStepS) / stridePeriodS + startCycle
      const stride = time < walkDurationS ? startingStride + Math.min(time, strideRiseEndS) * strideRisePerSecond : 0
      poseCrew(crew, cycle, stride, false)
    },
  }
}

export function fishThrashFixture(meshes: MeshFactory): Fixture {
  waterTray(meshes, ...waterTrayGeometry.fishThrash)
  const fish = createSchoolFish(meshes, meshes.paint('#a8b293'))
  const fishScale = 1.64, fishHeadingRad = 0.95
  fish.scaling.setAll(fishScale)
  fish.rotation.y = fishHeadingRad
  const bobber = createFishingFloat(meshes)
  const floatXM = -0.52, initialFloatYM = 0.03, floatZM = 0.22
  bobber.position.set(floatXM, initialFloatYM, floatZM)
  const anglerXM = 1.8, anglerZM = -1.35, anglerHeadingRad = -1.4
  const crew = crewAt(meshes, anglerXM, anglerZM)
  crew.root.rotation.y = anglerHeadingRad
  const thrashPeriodS = 0.96, contactStartS = 0.35, rippleDurationS = 0.29, sprayDurationS = 0.16
  const rippleGapStartS = 0.083, rippleGapEndS = 0.174
  const fishZM = 0.05, rippleYM = 0.022, sprayYM = 0.1, floorYM = 0.017
  const pop = { x: 0, y: rippleYM, z: fishZM }
  const jumpStartS = 0.3, jumpDurationS = 0.55, restingFishYM = -0.21, jumpHeightM = 0.63, jumpSideM = 0.14
  const jumpPitchRad = 0.79, thrashRadPerSecond = 27, thrashRollRad = 0.77
  const restingFloatYM = 0.04, floatJumpM = 0.061, floatBobM = 0.018, floatBobRadPerSecond = 7
  return {
    sourceAt(time) {
      const hit = contactAge(time, contactStartS, thrashPeriodS, rippleDurationS)
      if (hit !== undefined && (hit < rippleGapStartS || hit > rippleGapEndS)) return pop
    },
    accents: [{ id: 'fish-spray', sourceAt: (time) => {
      if (contactAge(time, contactStartS, thrashPeriodS, sprayDurationS) !== undefined) return { ...pop, y: sprayYM, floor: floorYM }
    } }],
    pose(time) {
      const jump = contactAge(time, jumpStartS, thrashPeriodS, jumpDurationS)
      const lift = jump === undefined ? 0 : Math.sin(Math.PI * jump / jumpDurationS)
      fish.position.set(lift * jumpSideM, restingFishYM + lift * jumpHeightM, fishZM)
      fish.rotation.x = -lift * jumpPitchRad
      fish.rotation.z = lift * Math.sin(time * thrashRadPerSecond) * thrashRollRad
      bobber.position.y = restingFloatYM + lift * floatJumpM + floatBobM * Math.sin(time * floatBobRadPerSecond)
    },
  }
}

export function submergedFixture(meshes: MeshFactory): Fixture {
  const { surfaceY, bed, backWall, water, rocks, rockGroundY } = submergedStage
  meshes.box(...bed.box, bed.color)
  meshes.box(...backWall.box, backWall.color)
  const glass = createIslandMaterial(meshes.scene, 'Water cross section', water.color, true)
  glass.alpha = water.opacity
  const tray = meshes.box(0, surfaceY - water.centerBelowSurfaceM, 0, water.width, water.thickness, water.depth, glass, undefined, false)
  tray.alphaIndex = 1
  for (const [x, z, size] of rocks) createRock(meshes, x, z, size, x, false, rockGroundY)
  const crew = crewAt(meshes, 0, 0, 1)
  const startXM = -1.65, swimMps = 0.62, swimDurationS = 3.15
  const swimmerYM = 0.015, swimmerZM = 0.08, swimmerPitchRad = 1.18
  const bubbleLeadM = 1.08, bubbleYM = 0.48, bubbleZM = -0.02, bubbleSwayM = 0.06, bubbleSwayRadPerSecond = 6
  const bubbleClearanceM = 0.009, popStartS = 0.66, popLagS = 0.43, popLeadM = 0.98, popHeightM = 0.012, popZM = -0.18
  const pace = (time: number) => startXM + swimMps * Math.min(time, swimDurationS)
  return {
    sourceAt(time, index) {
      return {
        x: pace(time) + bubbleLeadM,
        y: bubbleYM + Math.sin(time * bubbleSwayRadPerSecond + index % alternatingSides * Math.PI) * bubbleSwayM,
        z: bubbleZM,
        ceiling: surfaceY - bubbleClearanceM,
      }
    },
    accents: [{ id: 'surface-pops', sourceAt: (time) => {
      if (time >= popStartS) return { x: pace(time - popLagS) + popLeadM, y: surfaceY + popHeightM, z: popZM }
    } }],
    pose(time) {
      poseSwimming(crew, time, 1)
      crew.root.position.set(pace(time), swimmerYM, swimmerZM)
      crew.root.rotation.x = swimmerPitchRad
      crew.root.rotation.y = quarterTurn
    },
  }
}

export function eddyFixture(meshes: MeshFactory): Fixture {
  waterTray(meshes, ...waterTrayGeometry.eddy)
  const { rocks, banks } = eddyStage
  for (const [x, z, size, angle, light] of rocks) createRock(meshes, x, z, size, angle, light)
  const viewerXM = 2.23, viewerZM = 0.71
  const crew = crewAt(meshes, viewerXM, viewerZM, 1)
  crew.root.rotation.y = -quarterTurn
  for (const x of banks.x) meshes.box(x, banks.y, 0, ...banks.size, banks.color)
  const inletAngleRad = -1.72, inletSwayRad = 0.58, inletSwayRadPerSecond = 4.2
  const inletLanes = 3, laneAngleRad = 0.33, radiusM = 0.89, radialBands = 4, radialSpacingM = 0.095
  const foamYM = 0.015, orbitRadPerSecond = 2.16, initialPeelS = 1.07, peelDelayPerBandS = 0.14
  return {
    sourceAt(time, index) {
      const angle = inletAngleRad + inletSwayRad * Math.sin(time * inletSwayRadPerSecond) + laneAngleRad * (index % inletLanes)
      const band = index % radialBands
      const radius = radiusM + band * radialSpacingM
      return {
        x: Math.cos(angle) * radius,
        y: foamYM,
        z: Math.sin(angle) * radius,
        orbit: { x: 0, z: 0, angularSpeed: orbitRadPerSecond, peelAfter: initialPeelS + band * peelDelayPerBandS },
      }
    },
  }
}
