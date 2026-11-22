import { barrowLegPose } from '../barrow-gait'
import { waterLevel } from '../terrain'
import type { createCrew } from './crew'

type Crew = ReturnType<typeof createCrew>

const halfTurnsPerTurn = 2
const forwardReachPitch = -Math.PI / halfTurnsPerTurn

const airborneLookPitch = -0.06
const cargoLookPitch = 0.13
const effortLookScale = 0.07
const reachLookYawScale = 0.09
const strideLookRollScale = -0.042
const airborneKneeBend = 0.46
const airborneKneeAsymmetry = 0.19
const groundedKneeBend = 0.08
const recoveryKneeBend = 0.88
const airborneHipSwing = 0.35
const kneeHipCounterSwing = 0.36
const airborneArmPitch = -0.8
const armSwingScale = 0.77
const throwArmPitch = -1.75
const crateArmPitch = -1.22
const crateWindupScale = 0.67
const barrowArmPitch = -1.15
const toolArmPitch = -1.36

export function poseCrew(crew: Crew, cycle: number, stride: number, airborne: boolean, carrying?: 'crate' | 'extinguisher' | 'toolbox' | 'tool' | 'barrow', reach = 0, blend = 1, winding = 0, throwing = false, rightHandRaised = false) {
  const phase = cycle * Math.PI * halfTurnsPerTurn
  const swing = Math.sin(phase) * stride
  const effort = Math.max(reach, Number(rightHandRaised), winding)
  const pitch = airborne ? airborneLookPitch : carrying === 'crate' || carrying === 'barrow' ? cargoLookPitch : effort * effortLookScale
  crew.look(pitch, (Number(rightHandRaised) - reach) * reachLookYawScale, strideLookRollScale * swing, blend)
  for (const [i, leg] of crew.legs.entries()) {
    const side = i === 0 ? -1 : 1
    const recovery = Math.max(0, -side * Math.cos(phase))
    const bend = airborne ? airborneKneeBend - side * airborneKneeAsymmetry : stride * (groundedKneeBend + recoveryKneeBend * recovery * recovery)
    const pose = carrying === 'barrow' && !airborne
      ? barrowLegPose(cycle, i, stride)
      : { hip: airborne ? side * airborneHipSwing : swing * side - bend * kneeHipCounterSwing, knee: bend }
    leg.rotation.x += (pose.hip - leg.rotation.x) * blend
    crew.knees[i](pose.knee, blend)
    const arm = crew.arms[i]
    arm.rotation.z *= 1 - blend
    const swinging = airborne ? airborneArmPitch : -swing * side * armSwingScale
    const relaxed = throwing
      ? throwArmPitch
      : carrying === 'crate'
        ? crateArmPitch - winding * crateWindupScale
        : carrying === 'barrow'
          ? barrowArmPitch
          : (carrying === 'extinguisher' || carrying === 'tool') && i === 0 ? toolArmPitch : swinging
    const reachAmount = i === 0 ? reach : Number(rightHandRaised)
    const forward = relaxed + (forwardReachPitch - relaxed) * reachAmount
    arm.rotation.x += (forward - arm.rotation.x) * blend
  }
  crew.fitSwimwear()
}

const swimCycleSeconds = 1.6
const swimPitch = 0.06
const swimPitchSpeedScale = 0.22
const swimLookCounterPitch = 0.64
const swimLookYaw = 0.025
const swimArmPitch = -0.86
const swimReachBase = 0.2
const swimReachSpeedScale = 0.46
const swimSweepBase = 0.7
const swimSweepVariation = 0.44
const kickMidpoint = 0.5
const swimHipPitch = 0.21
const swimHipKick = 0.18
const swimHipKickSpeedScale = 0.21
const swimHipAlternate = 0.05
const swimKneeBend = 0.13
const swimKneeKick = 0.33
const swimKneeKickSpeedScale = 0.42
const swimmerDepth = 1.01
const swimBobHeight = 0.036

export function poseSwimming(crew: Crew, time: number, speed: number, blend = 1) {
  const stroke = time * Math.PI * halfTurnsPerTurn / swimCycleSeconds
  crew.root.rotation.x = swimPitch + swimPitchSpeedScale * speed
  crew.look(-crew.root.rotation.x * swimLookCounterPitch, swimLookYaw * Math.sin(stroke), 0, blend)
  for (const [i, arm] of crew.arms.entries()) {
    const side = i === 0 ? -1 : 1
    const reach = swimArmPitch - Math.cos(stroke) * (swimReachBase + swimReachSpeedScale * speed)
    const sweep = side * (swimSweepBase + Math.sin(stroke) * swimSweepVariation)
    arm.rotation.x += (reach - arm.rotation.x) * blend
    arm.rotation.z += (sweep - arm.rotation.z) * blend
    const kick = kickMidpoint + kickMidpoint * Math.cos(stroke)
    crew.legs[i].rotation.x = swimHipPitch - kick * (swimHipKick + swimHipKickSpeedScale * speed) + side * swimHipAlternate * Math.sin(stroke)
    crew.knees[i](swimKneeBend + kick * (swimKneeKick + swimKneeKickSpeedScale * speed), blend)
  }
  crew.fitSwimwear()
}

export function swimmingHeight(time: number) {
  return waterLevel - swimmerDepth + swimBobHeight * Math.sin(time * Math.PI * halfTurnsPerTurn / swimCycleSeconds)
}

const fishingLookPitch = 0.10
const paddlingLookPitch = 0.055
const paddlingLookPitchStroke = 0.035
const fishingLookYaw = 0.15
const paddlingLookYawStroke = 0.07
const seatedKneeBend = 1.05
const seatedHipPitch = -1.27
const outerPaddleArmRoll = 0.38
const innerPaddleArmRoll = 0.96
const outerFishingArmPitch = -1.39
const innerFishingArmPitch = -1.07
const outerPaddleArmPitch = -0.58
const innerPaddleArmPitch = -1.88
const outerPaddleStrokeScale = 0.60
const innerPaddleStrokeScale = 0.35

export function poseSkiffCrew(crew: Crew, stroke: number, side: number, fishing: boolean, blend: number) {
  crew.look(fishing ? fishingLookPitch : paddlingLookPitch + stroke * paddlingLookPitchStroke, side * (fishing ? fishingLookYaw : paddlingLookYawStroke * stroke), 0, blend)
  for (const [i, leg] of crew.legs.entries()) {
    crew.knees[i](seatedKneeBend, blend)
    leg.rotation.x += (seatedHipPitch - leg.rotation.x) * blend
    const arm = crew.arms[i]
    const outerArm = i === (side < 0 ? 0 : 1)
    const across = fishing ? 0 : side * (outerArm ? outerPaddleArmRoll : innerPaddleArmRoll)
    arm.rotation.z += (across - arm.rotation.z) * blend
    const pose = fishing
      ? outerArm ? outerFishingArmPitch : innerFishingArmPitch
      : outerArm ? outerPaddleArmPitch + stroke * outerPaddleStrokeScale : innerPaddleArmPitch + stroke * innerPaddleStrokeScale
    arm.rotation.x += (pose - arm.rotation.x) * blend
  }
  crew.fitSwimwear()
}
