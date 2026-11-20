import { Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem'
import type { Scene } from '@babylonjs/core/scene'
import { createParticleTexture } from './particle-texture'

export function createLookoutFire(scene: Scene, x = 0, z = 0) {
  const texture = createParticleTexture(scene, 'flame')
  const smokeTexture = createParticleTexture(scene, 'smoke')
  const flame = new ParticleSystem('Lookout flames', 380, scene)
  flame.particleTexture = texture
  flame.emitter = new Vector3(x, 0.15, z)
  flame.createBoxEmitter(new Vector3(-0.33, 0.74, -0.33), new Vector3(0.33, 1.45, 0.33),
    new Vector3(-1.14, 0, -0.92), new Vector3(1.14, 0.18, 0.92))
  flame.minLifeTime = 0.31
  flame.maxLifeTime = 0.84
  flame.minEmitPower = 1.3
  flame.maxEmitPower = 3.1
  flame.gravity.set(0, 0.9, 0)
  flame.blendMode = ParticleSystem.BLENDMODE_ADD
  flame.addSizeGradient(0, 0.32, 0.72)
  flame.addSizeGradient(0.28, 0.46, 0.92)
  flame.addSizeGradient(1, 0.13, 0.43)
  flame.addColorGradient(0, new Color4(1, 0.62, 0.12, 0.8))
  flame.addColorGradient(0.48, new Color4(1, 0.28, 0.038, 0.76))
  flame.addColorGradient(1, new Color4(0.74, 0.06, 0.015, 0))
  flame.minAngularSpeed = -1.6
  flame.maxAngularSpeed = 1.6

  const smoke = new ParticleSystem('Lookout smoke', 210, scene)
  smoke.particleTexture = smokeTexture
  smoke.emitter = new Vector3(x, 0.62, z)
  smoke.createBoxEmitter(new Vector3(0.09, 0.65, -0.27), new Vector3(0.51, 1.13, 0.32),
    new Vector3(-0.69, 0, -0.52), new Vector3(0.69, 0.25, 0.52))
  smoke.minLifeTime = 1.3
  smoke.maxLifeTime = 3.1
  smoke.minEmitPower = 1.35
  smoke.maxEmitPower = 2.6
  smoke.gravity.set(0.46, 0.09, -0.05)
  smoke.blendMode = ParticleSystem.BLENDMODE_STANDARD
  smoke.addSizeGradient(0, 0.45, 0.75)
  smoke.addSizeGradient(0.44, 1, 1.66)
  smoke.addSizeGradient(1, 2, 3.1)
  smoke.addColorGradient(0, new Color4(0.30, 0.27, 0.25, 0.18))
  smoke.addColorGradient(0.29, new Color4(0.31, 0.32, 0.32, 0.42))
  smoke.addColorGradient(1, new Color4(0.54, 0.57, 0.57, 0))
  smoke.minAngularSpeed = -0.4
  smoke.maxAngularSpeed = 0.4

  let burning = false
  return {
    pose(time: number, intensity: number, speed = 1, seek = false) {
      flame.emitRate = intensity * (143 + 26 * Math.sin(time * 8.5))
      smoke.emitRate = intensity * 36
      const active = intensity > 0
      if (seek) {
        flame.reset()
        smoke.reset()
        burning = false
      }
      if (active !== burning) {
        if (active) {
          flame.start()
          smoke.start()
        } else {
          flame.stop()
          smoke.stop()
        }
        burning = active
      }
      if (seek && active) {
        for (const particles of [flame, smoke]) {
          particles.updateSpeed = 1 / 60
          for (let t = 0; t < Math.min(time, particles.maxLifeTime); t += 1 / 60) particles.animate(true)
        }
      }
      flame.updateSpeed = smoke.updateSpeed = speed / 60
    },
  }
}
