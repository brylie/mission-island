import { Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem'
import type { Scene } from '@babylonjs/core/scene'
import { createParticleTexture } from './particle-texture'

export function createExtinguisherSpray(scene: Scene) {
  const mist = new ParticleSystem('Extinguisher spray', 200, scene)
  mist.particleTexture = createParticleTexture(scene, 'mist')
  const outlet = Vector3.Zero()
  const low = Vector3.Zero()
  const high = Vector3.Zero()
  mist.emitter = outlet
  mist.createPointEmitter(low, high)
  mist.blendMode = ParticleSystem.BLENDMODE_STANDARD
  mist.updateSpeed = 1 / 60
  mist.emitRate = 155
  mist.minEmitPower = 7.5
  mist.maxEmitPower = 12
  mist.minLifeTime = 0.28
  mist.maxLifeTime = 0.52
  mist.gravity.set(0, -2.1, 0)
  mist.addSizeGradient(0, 0.13, 0.23)
  mist.addSizeGradient(0.42, 0.4, 0.68)
  mist.addSizeGradient(1, 0.7, 0.97)
  mist.addColorGradient(0, new Color4(0.96, 1, 1, 0.83))
  mist.addColorGradient(0.45, new Color4(0.86, 0.94, 0.98, 0.56))
  mist.addColorGradient(1, new Color4(0.87, 0.95, 0.98, 0))

  let emitting = false
  const frame = 1 / 60
  function update(tool: TransformNode, active: boolean) {
    if (active) {
      const x = Math.sin(tool.rotation.y)
      const z = Math.cos(tool.rotation.y)
      outlet.set(tool.position.x + x * 0.37, tool.position.y + 0.98, tool.position.z + z * 0.37)
      low.set(x - 0.16, -0.22, z - 0.16)
      high.set(x + 0.16, 0.13, z + 0.16)
    }
    if (active === emitting) return
    emitting = active
    if (active) mist.start()
    else mist.stop()
  }

  return {
    update,
    setRate(rate: number) {
      mist.emitRate = rate
    },
    setPlaybackSpeed(speed: number) {
      mist.updateSpeed = speed * frame
    },
    seek(tool: TransformNode, emittingTime: number, timeSinceStop: number) {
      mist.reset()
      emitting = false
      mist.updateSpeed = frame
      if (emittingTime > 0) {
        update(tool, true)
        for (let t = 0; t < Math.min(emittingTime, mist.maxLifeTime); t += frame) mist.animate(true)
      }
      if (timeSinceStop > 0 || emittingTime === 0) {
        mist.stop()
        emitting = false
        for (let t = 0; t < Math.min(timeSinceStop, mist.maxLifeTime); t += frame) mist.animate(true)
      }
      mist.updateSpeed = 0
    },
  }
}
