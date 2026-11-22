import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { poseCrew } from '../assets/crew'
import { fishingFloatRestHeight } from '../assets/fishing'
import { createFlatbed, poseFlatbed } from '../assets/flatbed'
import { bobberStage, bootTrailStage, hullDrainStage, mooringStage, slipwayStage } from '../assets/geometry/workbench-water-fixtures'
import { createDockDeck, createDockPile, createHarborBoat } from '../assets/waterfront'
import { aimFishingRod, createFishingGear, poseCastLine } from '../fishing-line-view'
import type { MeshFactory } from '../island-meshes'
import { flatbedGroundDrive } from '../vehicles/flatbed'
import { harborDockPiles } from '../world'
import { contactAge, crewAt, type Fixture } from './effect-fixtures'

const half = 0.5
const stepsPerStride = 2

export function bobberFixture(meshes: MeshFactory): Fixture {
  const { water, deck } = bobberStage
  const [, , deckTop] = deck
  meshes.box(...water.box, water.color, undefined, false)
  createDockDeck(meshes, ...deck)
  const anglerXM = -1.17, anglerZM = -0.08, rodReach = 0.85
  const crew = crewAt(meshes, anglerXM, anglerZM)
  crew.root.position.y = deckTop
  const facing = { heading: Math.PI * half, casting: null }
  crew.root.rotation.y = facing.heading
  poseCrew(crew, 0, 0, false, 'tool', rodReach)
  const [kit] = createFishingGear(meshes.scene, meshes, [crew])
  const [hand] = kit.gear
  hand.grip.setEnabled(true)
  hand.paddle.setEnabled(false)
  kit.bobber.isVisible = kit.line.isVisible = true
  aimFishingRod(facing, kit, 0)
  const tugStartS = 0.39, tugPeriodS = 0.94, tugDurationS = 0.41
  const floatRestXM = 0.32, floatZM = 0.02, floatPullXM = 0.19
  const dipM = 0.126, bobM = 0.012, bobRadPerSecond = 6.2
  const rippleStartS = 0.413, rippleDurationS = 0.14, rippleYM = 0.018, ripplePullXM = 0.16
  const tugDistance = (age: number) => Math.sin(age / tugDurationS * Math.PI)
  return {
    sourceAt(time) {
      const age = contactAge(time, rippleStartS, tugPeriodS, rippleDurationS)
      if (age !== undefined) return { x: floatRestXM + tugDistance(age) * ripplePullXM, y: rippleYM, z: floatZM }
    },
    pose(time) {
      const pull = tugDistance(contactAge(time, tugStartS, tugPeriodS, tugDurationS) ?? 0)
      kit.bobber.position.set(
        floatRestXM + floatPullXM * pull,
        fishingFloatRestHeight - dipM * pull + bobM * Math.sin(time * bobRadPerSecond),
        floatZM,
      )
      poseCastLine(kit, 0)
    },
  }
}

export function slipwayFixture(meshes: MeshFactory): Fixture {
  const truck = createFlatbed(meshes)
  const { apron, puddles, edgeStripes } = slipwayStage
  meshes.box(...apron.box, meshes.paintSurface('concrete', apron.color)).receiveShadows = true
  for (const x of puddles.x) meshes.box(x, puddles.y, puddles.z, ...puddles.size, puddles.color, undefined, false)
  for (const x of edgeStripes.x) meshes.box(x, edgeStripes.y, edgeStripes.z, ...edgeStripes.size, edgeStripes.color, undefined, false)
  const { axles: [, frontAxle], halfTrack } = flatbedGroundDrive.wheels
  const startZM = -2.85, driveDurationS = 3.16, paceMps = 1.18
  const truckYM = 0.013, wheelRadPerSecond = 3.4
  const sprayStartZM = -0.91, sprayEndZM = 1.28, leftSprayInterval = 3
  const sprayYM = 0.071, rightSprayYawRad = 0.17, leftSprayYawRad = -1.35, waterFloorYM = 0.031
  const spraySpeedScale = 0.85, spraySpeedRisePerSecond = 0.14
  const travel = (time: number) => startZM + Math.min(time, driveDurationS) * paceMps
  return {
    sourceAt(time, index) {
      const z = travel(time) + frontAxle
      if (z < sprayStartZM || z > sprayEndZM) return
      const side = index % leftSprayInterval ? 1 : -1
      return {
        x: halfTrack * side,
        y: sprayYM,
        z,
        yaw: side > 0 ? rightSprayYawRad : leftSprayYawRad,
        speed: spraySpeedScale + time * spraySpeedRisePerSecond,
        floor: waterFloorYM,
      }
    },
    pose(time) {
      truck.root.position.set(0, truckYM, travel(time))
      poseFlatbed(truck, Math.min(time, driveDurationS) * wheelRadPerSecond, 0)
    },
  }
}

export function hullDrainFixture(meshes: MeshFactory): Fixture {
  const boat = createHarborBoat(meshes)
  const { hull, cradle: { z: cradleZ, rail, feet }, floor, puddle } = hullDrainStage
  boat.position.set(...hull.position)
  boat.rotation.set(hull.pitchRad, Math.PI, 0)
  for (const z of cradleZ) {
    meshes.box(0, rail.y, z, ...rail.size, rail.color)
    for (const x of feet.x) meshes.box(x, feet.y, z, ...feet.size, feet.color)
  }
  meshes.box(...floor.box, floor.color).receiveShadows = true
  meshes.cylinder(...puddle.position, puddle.diameter, puddle.diameter, puddle.height, puddle.sides, puddle.color, undefined, false)
  const workerXM = 1.7, workerZM = 1.69, workerHeadingRad = -1.7
  const crew = crewAt(meshes, workerXM, workerZM, 1)
  crew.root.rotation.y = workerHeadingRad
  const bung = new Vector3(...hull.drainOutlet)
  const streamEndS = 2.38, dripStartS = 2.4, dripPeriodS = 0.22, dripDurationS = 0.079
  const decelerationEndS = 2.9, drainSpeedScale = 1.18, drainSpeedDecayPerSecond = 0.2, floorYM = 0.026
  return {
    sourceAt(time) {
      if (time > streamEndS && contactAge(time, dripStartS, dripPeriodS, dripDurationS) === undefined) return
      const { x, y, z } = Vector3.TransformCoordinates(bung, boat.computeWorldMatrix(true))
      return { x, y, z, speed: drainSpeedScale - Math.min(time, decelerationEndS) * drainSpeedDecayPerSecond, floor: floorYM }
    },
  }
}

export function mooringShakeFixture(meshes: MeshFactory): Fixture {
  const { water, deck, piles, rope } = mooringStage
  const [, , deckTop] = deck
  meshes.box(...water.box, water.color, undefined, false)
  createDockDeck(meshes, ...deck)
  const [pile] = harborDockPiles
  const bottom = piles.top - (pile.top - pile.bottom)
  for (const x of piles.x) createDockPile(meshes, { ...pile, x, z: piles.z, top: piles.top, bottom })
  const workerXM = -1.44, workerZM = -0.95
  const crew = crewAt(meshes, workerXM, workerZM)
  crew.root.position.y = deckTop
  const { segment: { width, height, depth, color } } = rope
  const segments = Array.from({ length: rope.segments }, () => meshes.box(0, 0, 0, width, height, depth, color, undefined, false))
  const span = rope.endX - rope.startX, segmentSpan = span / segments.length
  const shakeStartS = 0.37, shakePeriodS = 0.98, shakeDurationS = 0.63, sprayDurationS = 0.17
  const shakeRadPerSecond = 25, phaseAlongRopeRad = 7, shakeDecayPerSecond = 6, shakeHeightM = 0.145
  const firstSprayFraction = 0.12, sprayStations = 13, sprayStationSpacing = 0.063, floorYM = 0.018
  const wave = (time: number) => contactAge(time, shakeStartS, shakePeriodS, shakeDurationS)
  function lineHeight(time: number, along: number) {
    const age = wave(time)
    const snap = age === undefined ? 0 : Math.sin(age * shakeRadPerSecond - along * phaseAlongRopeRad) * Math.exp(-age * shakeDecayPerSecond) * shakeHeightM
    return rope.endY + Math.sin(along * Math.PI) * (snap - rope.sagM)
  }
  return {
    sourceAt(time, index) {
      const age = wave(time)
      if (age === undefined || age > sprayDurationS) return
      const along = firstSprayFraction + index % sprayStations * sprayStationSpacing
      return { x: rope.startX + along * span, y: lineHeight(time, along), z: rope.z, floor: floorYM }
    },
    pose(time) {
      for (const [index, segment] of segments.entries()) {
        const a = index / segments.length, b = (index + 1) / segments.length
        const start = lineHeight(time, a), end = lineHeight(time, b), rise = end - start
        segment.position.set(rope.startX + span * (a + b) * half, (start + end) * half, rope.z)
        segment.rotation.z = Math.atan2(rise, segmentSpan)
        segment.scaling.x = Math.hypot(segmentSpan, rise) / width
      }
    },
  }
}

export function bootTrailFixture(meshes: MeshFactory): Fixture {
  const { water, deck } = bootTrailStage
  const [, , deckTop] = deck
  meshes.box(...water.box, water.color, undefined, false)
  createDockDeck(meshes, ...deck)
  const crew = crewAt(meshes, 0, 0, 1)
  const startZM = -1.38, walkMps = 0.89, walkDurationS = 3
  const firstStepS = 0.34, stepPeriodS = 0.49, stepContactS = 0.09
  const footClearanceM = 0.005, stampClearanceM = 0.007
  const stampOutsetM = 0.175, stampLeadM = 0.21, stampYawRad = 0.14
  const stridePeriodS = stepPeriodS * stepsPerStride, startCycle = 0.25, strideAmount = 0.54
  const stride = (time: number) => startZM + walkMps * Math.min(walkDurationS, time)
  return {
    sourceAt(time) {
      const age = contactAge(time, firstStepS, stepPeriodS, stepContactS)
      if (age === undefined) return
      const step = Math.floor((time - firstStepS) / stepPeriodS)
      const side = step % stepsPerStride ? -1 : 1
      return { x: stampOutsetM * side, y: deckTop + stampClearanceM, z: stride(time - age) + stampLeadM, yaw: side * stampYawRad }
    },
    pose(time) {
      crew.root.position.set(0, deckTop + footClearanceM, stride(time))
      const cycle = (Math.min(time, walkDurationS) - firstStepS) / stridePeriodS + startCycle
      poseCrew(crew, cycle, time > walkDurationS ? 0 : strideAmount, false)
    },
  }
}
