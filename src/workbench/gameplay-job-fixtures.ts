import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { poseCrew } from '../assets/crew'
import { buildHarvestedCarrot } from '../assets/barrow'
import { createFlatbed, poseFlatbed } from '../assets/flatbed'
import { brakeChipRoad, chalkDeck, grainSpillSet, hoistRig, washStation } from '../assets/geometry/workbench-job-fixtures'
import { createSupply } from '../assets/props'
import type { MeshFactory } from '../island-meshes'
import { flatbedGroundDrive } from '../vehicles/flatbed'
import { crateSize, truckBed, truckTailLip } from '../world'
import { contactAge, crewAt, type Fixture } from './effect-fixtures'

const half = 0.5

export function brakeChipsFixture(meshes: MeshFactory): Fixture {
  const truck = createFlatbed(meshes)
  meshes.box(...brakeChipRoad.box, meshes.paintSurface('gravel', brakeChipRoad.color)).receiveShadows = true
  const startZM = -1.96, brakingTravelM = 2.85, brakingDecayPerSecond = 2.2
  const peakPitchRad = -0.044, peakPitchS = 0.61, pitchFalloffPerSecond = 4.3, pitchCurvePower = 2
  const steeringRad = 0.033
  const chipStartS = 0.52, chipEndS = 1.3, chipGroupSize = 4, omittedChipSlot = 3, leftChipInterval = 3
  const tireOutsetM = 0.106, behindAxleM = 0.11, chipYM = 0.059, chipYawRad = 0.41, bounceFloorYM = 0.023
  const chipSpeedScale = 1.33, chipSpeedDecayPerSecond = 0.36
  const travel = (time: number) => startZM + brakingTravelM * (1 - Math.exp(-brakingDecayPerSecond * time))
  const { halfTrack, axles: [, frontAxle], radius } = flatbedGroundDrive.wheels
  return {
    sourceAt(time, index) {
      if (index % chipGroupSize === omittedChipSlot || time < chipStartS || time > chipEndS) return
      const side = index % leftChipInterval ? 1 : -1
      return {
        x: side * (halfTrack + tireOutsetM),
        y: chipYM,
        z: travel(time) + frontAxle - behindAxleM,
        yaw: side * chipYawRad,
        speed: chipSpeedScale - time * chipSpeedDecayPerSecond,
        floor: bounceFloorYM,
      }
    },
    pose(time) {
      const z = travel(time)
      truck.root.position.set(0, 0, z)
      truck.root.rotation.x = peakPitchRad * Math.exp(-Math.pow((time - peakPitchS) * pitchFalloffPerSecond, pitchCurvePower))
      poseFlatbed(truck, z / radius, steeringRad)
    },
  }
}

export function grainSpillFixture(meshes: MeshFactory): Fixture {
  const truck = createFlatbed(meshes)
  const truckZM = 1.28
  truck.root.position.z = truckZM
  const sack = new TransformNode('Tipped grain sack', meshes.scene)
  const { sack: { belly, neck, mouth, outletHeightM }, floor } = grainSpillSet
  const sackXM = 0.17, bedClearanceM = 0.12, insideTailgateM = 0.38
  const sackYM = truckBed.top + bedClearanceM, sackZM = truckZM + truckTailLip.z + insideTailgateM
  meshes.sphere(...belly.ellipsoid, belly.color, sack, true, belly.segments)
  meshes.cylinder(...neck.cylinder, neck.color, sack)
  meshes.cylinder(...mouth.cylinder, mouth.color, sack).receiveShadows = true
  const workerXM = 1.18, workerZM = -1.32, workerHeadingRad = -1.45
  const crew = crewAt(meshes, workerXM, workerZM, 1)
  crew.root.rotation.y = workerHeadingRad
  poseCrew(crew, 0, 0, false, 'crate')
  meshes.box(...floor.box, floor.color).receiveShadows = true
  const initialTiltRad = -0.48, tippingDurationS = 0.91, additionalTiltRad = 1.2
  const releaseStartS = 0.84, releaseEndS = 2.62, grainSpeedScale = 1.3, grainSpeedDecayPerSecond = 0.19, bounceFloorYM = 0.026
  const tip = (time: number) => initialTiltRad - Math.min(1, time / tippingDurationS) * additionalTiltRad
  return {
    sourceAt(time) {
      if (time > releaseStartS && time < releaseEndS) {
        const tilt = tip(time)
        return {
          x: sackXM,
          y: sackYM + Math.cos(tilt) * outletHeightM,
          z: sackZM + Math.sin(tilt) * outletHeightM,
          yaw: Math.PI,
          speed: grainSpeedScale - time * grainSpeedDecayPerSecond,
          floor: bounceFloorYM,
        }
      }
    },
    pose(time) {
      sack.position.set(sackXM, sackYM, sackZM)
      sack.rotation.x = tip(time)
    },
  }
}

export function hoistFixture(meshes: MeshFactory): Fixture {
  const { liftZM, posts, beam, hook: { shaft, jaw, offsetAboveCrateM }, chain } = hoistRig
  const crate = createSupply(meshes, 'crate')
  const hook = new TransformNode('Hoist hook', meshes.scene)
  meshes.cylinder(...shaft.cylinder, shaft.color, hook)
  meshes.box(...jaw.box, jaw.color, hook).rotation.z = jaw.tiltRad
  for (const x of posts.x) meshes.box(x, posts.y, liftZM, ...posts.size, posts.color)
  meshes.box(...beam.box, beam.color)
  const linkPatternLength = 2
  const links = Array.from({ length: chain.count }, (_, index) => {
    const [width, height, depth] = index % linkPatternLength ? chain.acrossBeam : chain.alongBeam
    const link = meshes.sphere(0, 0, 0, width, height, depth, chain.color, undefined, false)
    link.name = 'Chain link'
    return link
  })
  const workerXM = 1.11, workerZM = 0.5, workerHeadingRad = -1.96
  const crew = crewAt(meshes, workerXM, workerZM)
  crew.root.rotation.y = workerHeadingRad
  const startingClearanceM = 0.02, liftTravelM = 0.92, liftResponsePerSecond = 1.8, liftStartS = 0.42
  const lift = (time: number) => startingClearanceM + liftTravelM * Math.max(0, 1 - Math.exp(-liftResponsePerSecond * (time - liftStartS)))
  const shakeStartS = 0.46, shakePeriodS = 0.78, shakeWindowS = 0.16
  const flakeSwayM = 0.02, flakeSwayRadPerSecond = 14, flakeBaseYM = 1.3, maximumFlakeSpawnYM = 2.52
  const flakeLayers = 4, flakeLayerSpacingM = 0.1, bounceFloorYM = 0.026
  const linkSwayRadPerSecond = 18, linkPhaseSpanRad = 10, linkSwayM = 0.021
  return {
    sourceAt(time, index) {
      if (contactAge(time, shakeStartS, shakePeriodS, shakeWindowS) === undefined) return
      return {
        x: flakeSwayM * Math.sin(time * flakeSwayRadPerSecond),
        y: Math.min(maximumFlakeSpawnYM, flakeBaseYM + lift(time) + (index % flakeLayers) * flakeLayerSpacingM),
        z: liftZM,
        floor: bounceFloorYM,
      }
    },
    pose(time) {
      const clearance = lift(time)
      crate.position.set(0, crateSize * half + clearance, liftZM)
      hook.position.set(0, crateSize + clearance + offsetAboveCrateM, liftZM)
      const chainSpan = chain.anchorYM - hook.position.y
      for (const [index, link] of links.entries()) {
        const fraction = (index + half) / links.length
        const y = hook.position.y + chainSpan * fraction
        const sway = Math.sin(time * linkSwayRadPerSecond - fraction * linkPhaseSpanRad)
        link.position.set(sway * (1 - fraction) * linkSwayM, y, liftZM)
        link.scaling.y = Math.max(chain.minimumHeightM, chainSpan / links.length + chain.overlapM)
      }
    },
  }
}

export function washFixture(meshes: MeshFactory): Fixture {
  const { basin, supports, water, produce } = washStation
  const metal = meshes.paintSurface('metal', basin.color)
  meshes.box(...basin.floor, metal)
  for (const x of basin.corners.x) {
    for (const z of basin.corners.z) meshes.box(x, basin.corners.y, z, ...basin.corners.size, metal)
    meshes.box(x, supports.y, supports.z, ...supports.size, supports.color)
  }
  for (const z of basin.rims.z) meshes.box(0, basin.rims.y, z, ...basin.rims.size, metal)
  meshes.box(...water.box, water.color, undefined, false)
  const workerXM = 0.19, workerZM = -0.832
  const crew = crewAt(meshes, workerXM, workerZM, 1)
  poseCrew(crew, 0, 0, false, 'tool', 1, 1, 0, false, true)
  const [leftArm, rightArm] = crew.arms
  for (let index = 0; index < produce.count; index++) {
    const carrot = new TransformNode('Produce in rinsing trough', meshes.scene)
    carrot.position.set(
      produce.firstXM - index * produce.spacingXM,
      produce.heightM,
      produce.centerZM + Math.sin(index * produce.staggerPhaseStepRad) * produce.staggerM,
    )
    carrot.rotation.set(produce.pitchRad, index * produce.headingStepRad, produce.rollRad)
    buildHarvestedCarrot(meshes, carrot)
  }
  const rinseStartS = 0.33, rinsePeriodS = 0.77, rinseWindowS = 0.44
  const splashSwayM = 0.32, splashSwayRadPerSecond = 4, splashYM = 0.969, splashZM = 0.082, bounceFloorYM = 0.9
  const scrubRadPerSecond = 10.5, leftPitchRad = -1.53, leftScrubRad = 0.085, rightPitchRad = -1.41, rightScrubRad = 0.115
  return {
    sourceAt(time) {
      if (contactAge(time, rinseStartS, rinsePeriodS, rinseWindowS) !== undefined) {
        return { x: Math.sin(time * splashSwayRadPerSecond) * splashSwayM, y: splashYM, z: splashZM, floor: bounceFloorYM }
      }
    },
    pose(time) {
      const scrub = Math.sin(time * scrubRadPerSecond)
      leftArm.rotation.x = leftPitchRad + scrub * leftScrubRad
      rightArm.rotation.x = rightPitchRad - scrub * rightScrubRad
    },
  }
}

export function chalkFixture(meshes: MeshFactory): Fixture {
  const { planks, line } = chalkDeck
  const wood = meshes.paintSurface('wood', planks.color)
  const centerPlank = (planks.count - 1) * half
  for (let index = 0; index < planks.count; index++) {
    meshes.box(0, planks.y, (index - centerPlank) * planks.spacingM, ...planks.size, wood).receiveShadows = true
  }
  const leftXM = -1.73, rightXM = 1.7, crewZM = -0.33, leftHeadingRad = 1.15, rightHeadingRad = -1.13
  const left = crewAt(meshes, leftXM, crewZM)
  const right = crewAt(meshes, rightXM, crewZM, 1)
  left.root.rotation.y = leftHeadingRad
  right.root.rotation.y = rightHeadingRad
  poseCrew(left, 0, 0, false, 'tool', 1)
  poseCrew(right, 0, 0, false, 'tool', 1)
  const cords = Array.from({ length: line.cord.sections }, () => meshes.box(0, 0, 0, ...line.cord.size, line.cord.color, undefined, false))
  const mark = meshes.box(...line.mark.box, line.mark.color, undefined, false)
  const halfSpan = line.cord.spanM * half
  const snapStartS = 0.61, snapPeriodS = 0.91, vibrationWindowS = 0.27, dustWindowS = 0.087
  const tautYM = 0.039, vibrationRadPerSecond = 18, vibrationDecayPerSecond = 10, vibrationAmplitudeM = 0.23, markVisibility = 0.76
  const dustSlots = 24, dustSpacingM = 0.121, dustYM = 0.034, bounceFloorYM = 0.01
  const centerDustSlot = (dustSlots - 1) * half
  function cordHeight(time: number, u: number) {
    const age = contactAge(time, snapStartS, snapPeriodS, vibrationWindowS) ?? vibrationWindowS
    return tautYM + Math.abs(Math.sin(age * vibrationRadPerSecond)) * Math.exp(-age * vibrationDecayPerSecond) * Math.sin(u * Math.PI) * vibrationAmplitudeM
  }
  return {
    sourceAt(time, index) {
      if (contactAge(time, snapStartS, snapPeriodS, dustWindowS) !== undefined) {
        return { x: (index % dustSlots - centerDustSlot) * dustSpacingM, y: dustYM, z: line.z, floor: bounceFloorYM }
      }
    },
    pose(time) {
      mark.visibility = time < snapStartS ? 0 : markVisibility
      for (const [index, cord] of cords.entries()) {
        const a = index / cords.length, b = (index + 1) / cords.length
        const start = cordHeight(time, a), end = cordHeight(time, b)
        cord.position.set(-halfSpan + (a + b) * halfSpan, (start + end) * half, line.z)
        cord.rotation.z = Math.atan2(end - start, line.cord.spanM / cords.length)
      }
    },
  }
}
