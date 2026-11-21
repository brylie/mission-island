import { Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem'
import type { Scene } from '@babylonjs/core/scene'
import { createParticleEffect } from './particle-effect'
import { lookoutParticleHeights, particleRecipes } from './particle-recipes'
import { createParticleTexture } from './particle-texture'
import { groundHeight } from './terrain'

export function createLookoutFire(scene: Scene, x: number, z: number, visitPreview = false) {
  const y = groundHeight({ x, z })
  const flame = new ParticleSystem('Lookout flames', 380, scene)
  flame.particleTexture = createParticleTexture(scene, 'flame')
  flame.emitter = new Vector3(x, y + 0.15, z)
  flame.createBoxEmitter(new Vector3(-0.33, 0.74, -0.33), new Vector3(0.33, 1.45, 0.33), new Vector3(-1.14, 0, -0.92), new Vector3(1.14, 0.18, 0.92))
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

  const smoke = createParticleEffect(scene, 'Lookout smoke', particleRecipes['rising-smoke'], 1293)
  const embers = createParticleEffect(scene, 'Lookout embers', particleRecipes.fire, 1294)
  const smokeSource = { x, y: y + lookoutParticleHeights.smoke, z }
  const emberSource = { x, y: y + lookoutParticleHeights.embers, z }

  let burning = false
  return {
    pose(time: number, intensity: number) {
      flame.emitRate = intensity * (143 + 26 * Math.sin(time * 8.5))
      const active = intensity > 0
      if (active !== burning) {
        if (active) flame.start()
        else {
          flame.stop()
          if (visitPreview) flame.reset()
        }
        burning = active
      }
      const tuning = { strength: intensity, footprint: 1 }
      const effectTime = visitPreview && !active ? 0 : time
      smoke.stream(effectTime, smokeSource, tuning)
      embers.stream(effectTime, emberSource, tuning)
    },
  }
}
