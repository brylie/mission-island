import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Scene } from '@babylonjs/core/scene'
import { extinguisherNozzle } from './assets/props'
import { createParticleEffect } from './particle-effect'
import { particleRecipes } from './assets/particle-recipes'

const { height, center, length } = extinguisherNozzle
const nozzleTip = new Vector3(0, height, center + length / 2)
const nozzleForward = new Vector3(0, 0, 1)

export function extinguisherSource(tool: TransformNode) {
  const matrix = tool.computeWorldMatrix(true)
  const { x, y, z } = Vector3.TransformCoordinates(nozzleTip, matrix)
  const forward = Vector3.TransformNormal(nozzleForward, matrix)
  return {
    x,
    y,
    z,
    yaw: Math.atan2(forward.x, forward.z),
    pitch: Math.atan2(forward.y, Math.hypot(forward.x, forward.z)),
  }
}

export function createExtinguisherSpray(scene: Scene, seed: number) {
  const spray = createParticleEffect(scene, 'Extinguisher plume', particleRecipes.extinguisher, seed)
  const tuning = { strength: 1, footprint: 1 }
  return (time: number, tool: TransformNode, active: boolean) =>
    spray.stream(time, active ? extinguisherSource(tool) : undefined, tuning)
}
