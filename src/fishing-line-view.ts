import type { Scene } from '@babylonjs/core/scene'
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { CreateLines } from '@babylonjs/core/Meshes/Builders/linesBuilder'
import { createSkiffGear, type createCrew } from './assets/crew'
import { createFishingFloat, fishingFloatRestHeight } from './assets/fishing'
import type { createMeshFactory } from './island-meshes'
import { castTravelSeconds } from './charged-actions'
import type { Player } from './protocol'
import { fishingFloatDip } from './starter-effect-cues'
import { waterLevel } from './terrain'

type Meshes = ReturnType<typeof createMeshFactory>
type FishingKit = ReturnType<typeof createFishingGear>[number]

// Each crewmate's rod, paddles, bobber and line, drawn from the host's casting state.
export function createFishingGear(scene: Scene, meshes: Meshes, crew: ReturnType<typeof createCrew>[]) {
  return crew.map((character) => {
    const gear = createSkiffGear(meshes, character)
    const bobber = createFishingFloat(meshes)
    const linePoints = [Vector3.Zero(), Vector3.Zero(), Vector3.Zero()]
    const line = CreateLines('Fishing line', { points: linePoints, updatable: true }, scene)
    line.color = Color3.FromHexString('#eee7c7')
    line.isPickable = false
    line.isVisible = false
    bobber.isVisible = false
    return { gear, bobber, linePoints, line, tip: new Vector3(0, -1.425, 0) }
  })
}

export function updateFishingLine(player: Player, kit: FishingKit, gripIndex: number, time: number) {
  const { gear, bobber, linePoints, tip } = kit
  if (player.casting && gripIndex >= 0) {
    const { bobber: target, elapsed } = player.casting
    Vector3.TransformCoordinatesToRef(tip, gear[gripIndex].rod.computeWorldMatrix(true), linePoints[0])
    const flight = Math.min(1, elapsed / castTravelSeconds)
    const progress = player.casting.fight?.progress ?? 0
    const pulling = player.casting.fight?.pulling
    linePoints[2].set(target.x + (player.x - target.x) * progress * 0.88, waterLevel + fishingFloatRestHeight - fishingFloatDip(player.casting) + Math.sin(time * (pulling ? 13 : 5)) * (pulling ? 0.09 : 0.025), target.z + (player.z - target.z) * progress * 0.88)
    Vector3.LerpToRef(linePoints[0], linePoints[2], flight, bobber.position)
    bobber.position.y += Math.sin(flight * Math.PI) * 1.25
    drawFishingLine(kit, flight)
  }
}

function drawFishingLine({ bobber, line, linePoints }: FishingKit, flight: number) {
  Vector3.LerpToRef(linePoints[0], bobber.position, 0.55, linePoints[1])
  linePoints[1].y -= 0.13 * flight
  linePoints[2].copyFrom(bobber.position)
  CreateLines('Fishing line', { points: linePoints, instance: line })
}

export function poseCastLine(kit: FishingKit, gripIndex: number) {
  const { gear, linePoints, tip } = kit
  Vector3.TransformCoordinatesToRef(tip, gear[gripIndex].rod.computeWorldMatrix(true), linePoints[0])
  drawFishingLine(kit, 1)
}

export function aimFishingRod(player: Pick<Player, 'heading' | 'casting'>, kit: FishingKit, gripIndex: number) {
  const tool = kit.gear[gripIndex]
  if (!tool) return
  const { grip, rod } = tool
  grip.computeWorldMatrix(true)
  const lean = player.casting?.fight?.pulling ? 0.21 : 0.07
  rod.rotationQuaternion = Quaternion.Inverse(grip.absoluteRotationQuaternion)
    .multiply(Quaternion.RotationYawPitchRoll(player.heading, lean, Math.PI))
}
