import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createSchoolFish } from './assets/fish'
import { wingedAnimalGeometry } from './assets/geometry/winged-animal'
import { ambientFlockStyle, ambientSchoolStyle } from './assets/recipes/ambient-wildlife'
import type { MeshFactory } from './island-meshes'
import type { Weather } from './protocol'
import type { Point } from './world'
import { createMovingEffects } from './world-particles'
import { birdActivity, schoolAvoidance } from './wildlife-motion'

export interface WildlifeFrame {
  time: number
  delta: number
  seek?: boolean
  weather: Weather
  weatherAt?: (time: number) => Weather
  camera: { x: number, y: number, z: number }
  threats: readonly Point[]
}

interface School {
  swim: (time: number) => Point
  deep: Point
  level: number
  isWater: (point: Point) => boolean
}

const schoolVisibleHeightM = 47
const schoolVisibleRangeM = 75
const stressThresholdM = 0.14
const fleeResponsePerSecond = 4.7
const returnResponsePerSecond = 0.83
const headingLookAheadS = 0.065
const fleeHeadingBias = 0.11
const restoredPositionEpsilonM = 0.001
const headingResponsePerSecond = 6

export function createSchools(meshes: MeshFactory, groups: readonly School[]) {
  const { color, count, size, formation, swim: style } = ambientSchoolStyle
  const paint = meshes.paint(color)
  paint.backFaceCulling = false
  const schools = groups.map((group) => ({
    ...group,
    flee: { x: 0, z: 0 },
    heading: undefined as number | undefined,
    fish: Array.from({ length: count }, (_, i) => {
      const node = createSchoolFish(meshes, paint)
      node.scaling.setAll(size.smallest + i % size.groups * size.step)
      return node
    }),
  }))
  return ({ time, delta, camera, threats, seek }: WildlifeFrame) => {
    for (const school of schools) {
      const { swim, deep, level, flee, fish, isWater } = school
      const origin = swim(time)
      const visible = camera.y - level < schoolVisibleHeightM && Math.hypot(origin.x - camera.x, origin.z - camera.z) < schoolVisibleRangeM
      for (const node of fish) node.setEnabled(visible)
      if (seek) {
        school.heading = undefined
        flee.x = flee.z = 0
      }
      if (!visible) continue
      const aim = schoolAvoidance(origin, threats, deep)
      const stressed = Math.hypot(aim.x, aim.z) > stressThresholdM
      const factor = 1 - Math.exp(-delta * (stressed ? fleeResponsePerSecond : returnResponsePerSecond))
      flee.x += (aim.x - flee.x) * factor
      flee.z += (aim.z - flee.z) * factor
      const ahead = swim(time + headingLookAheadS)
      const target = Math.atan2(ahead.x - origin.x + (aim.x - flee.x) * fleeHeadingBias, ahead.z - origin.z + (aim.z - flee.z) * fleeHeadingBias)
      if (school.heading === undefined || (!stressed && Math.hypot(flee.x, flee.z) < restoredPositionEpsilonM)) school.heading = target
      else {
        const turn = target - school.heading
        school.heading += Math.atan2(Math.sin(turn), Math.cos(turn)) * (1 - Math.exp(-delta * headingResponsePerSecond))
      }
      const sin = Math.sin(school.heading), cos = Math.cos(school.heading)
      const spread = 1 + Math.hypot(flee.x, flee.z) * formation.scatterGain
      for (const [i, node] of fish.entries()) {
        const wave = Math.sin(time * (stressed ? style.startledRadPerSecond : style.calmRadPerSecond) + i * style.fishPhaseRad)
        const side = (i % formation.across - 1) * formation.lateralSpacingM * spread + wave * style.swayM
        const along = (formation.rowCenter - Math.floor(i / formation.across)) * formation.rowSpacingM * spread - Math.abs(side) * formation.vShape
        const position = { x: origin.x + flee.x + side * cos + along * sin, z: origin.z + flee.z - side * sin + along * cos }
        const valid = isWater(position)
        node.position.set(
          valid ? position.x : origin.x + side * formation.shoreInset,
          level - formation.depthM + wave * style.liftM,
          valid ? position.z : origin.z + along * formation.shoreInset,
        )
        node.rotation.y = school.heading + wave * style.yawRad
        node.rotation.z = wave * style.rollRad
      }
    }
  }
}

interface Flock {
  center: Point & { y: number }
  landing: Point & { y: number }
  roost: Point & { y: number }
  color: string
  range: number
  count: number
  bat?: boolean
}

export function wingedAnimal(meshes: MeshFactory, color: string, bat: boolean) {
  const { body, birdWing, batWing, wingFaces } = wingedAnimalGeometry
  const root = new TransformNode(bat ? 'Night bat' : 'Flock member', meshes.scene)
  const material = meshes.paint(color)
  material.backFaceCulling = false
  meshes.sphere(0, 0, 0, ...body.size, material, root, false, body.segments)
  const wings = [-1, 1].map((side) => {
    const outline = (bat ? batWing : birdWing).flatMap(([x, y, z]) => [x === 0 ? x : side * x, y, z])
    return meshes.surface(bat ? 'Bat membrane' : 'Flight feathers', outline, [...wingFaces], material, root)
  })
  return { root, wings }
}

const maxContinuousGapS = 0.35
const flockVisibleMarginM = 86
const flockVisibleHeightM = 90
const takeoffThreshold = 0.84
const takeoffFeatherStrength = 0.91
const takeoffFeatherFootprint = 0.86
const takeoffFeatherDurationS = 0.27
const minimumBatActivity = 0.015
const restingRows = 2
const half = 0.5

export function createFlocks(meshes: MeshFactory, groups: readonly Flock[]) {
  const effects = createMovingEffects(meshes.scene)
  const flocks = groups.map((group) => ({ ...group, previousGround: 0, members: Array.from({ length: group.count }, () => wingedAnimal(meshes, group.color, Boolean(group.bat))) }))
  const { orbit, resting, wings: wingStyle } = ambientFlockStyle
  let previousTime = -Infinity
  return ({ time, weather, camera, seek }: WildlifeFrame) => {
    const regular = !seek && time > previousTime && time - previousTime < maxContinuousGapS
    previousTime = time
    effects.begin(time, camera, !seek)
    const { roost, landing, bat } = birdActivity(time, weather)
    for (const flock of flocks) {
      const { center, landing: meadow, roost: tree, range, members } = flock
      const motion = flock.bat ? ambientFlockStyle.bat : ambientFlockStyle.bird
      const visible = Math.hypot(center.x - camera.x, center.z - camera.z) < range + flockVisibleMarginM && camera.y < center.y + flockVisibleHeightM
      const perchWeight = flock.bat ? 1 - bat : roost
      const groundWeight = flock.bat ? 0 : landing
      const leave = regular && flock.previousGround >= takeoffThreshold && groundWeight < takeoffThreshold
      flock.previousGround = groundWeight
      if (leave) effects.burst('takeoff-feathers', meadow, takeoffFeatherStrength, takeoffFeatherFootprint, takeoffFeatherDurationS)
      const rest = perchWeight + groundWeight
      for (const [i, { root, wings }] of members.entries()) {
        root.setEnabled(visible && (!flock.bat || bat > minimumBatActivity))
        if (!root.isEnabled()) continue
        const t = time * motion.orbitRadPerSecond - i * orbit.phaseStepRad
        const lane = i % orbit.orbitLanes - 1
        const breadth = range + lane * orbit.laneSpacingM
        const x = center.x + Math.cos(t) * breadth
        const z = center.z + Math.sin(t) * breadth * orbit.depthRatio
        const y = center.y + Math.sin(t * orbit.climbCyclesPerTurn) * motion.heightM + i * orbit.heightPerMemberM
        const onGround = lane * resting.lateralSpacingM
        const row = i % restingRows
        root.position.set(
          x * (1 - rest) + (tree.x + onGround) * perchWeight + (meadow.x + onGround) * groundWeight,
          y * (1 - rest) + tree.y * perchWeight + meadow.y * groundWeight + row * resting.heightOffsetM * rest,
          z * (1 - rest) + tree.z * perchWeight + meadow.z * groundWeight + (row - half) * resting.depthSpacingM * rest,
        )
        root.rotation.y = Math.atan2(-Math.sin(t), Math.cos(t) * orbit.depthRatio) * (1 - rest) + rest * (resting.yawRad + i * resting.yawPerMemberRad)
        const flap = Math.sin(time * motion.flapRadPerSecond + i * wingStyle.phaseStepRad) * wingStyle.flapRad * (1 - rest) + rest * wingStyle.foldedPitchRad
        wings[0].rotation.z = flap
        wings[1].rotation.z = -flap
        wings[0].rotation.y = -rest * wingStyle.foldedSweepRad
        wings[1].rotation.y = rest * wingStyle.foldedSweepRad
      }
    }
    effects.finish()
  }
}
