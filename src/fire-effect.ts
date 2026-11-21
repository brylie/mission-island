import { Color4 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem'
import type { Scene } from '@babylonjs/core/scene'
import { lookoutFireSeeds, lookoutFlame } from './assets/effects/lookout-fire'
import { createParticleEffect } from './particle-effect'
import { lookoutParticleHeights, particleRecipes } from './assets/particle-recipes'
import { createParticleTexture } from './assets/particle-texture'
import { groundHeight } from './terrain'

export function createLookoutFire(scene: Scene, x: number, z: number, visitPreview = false) {
  const y = groundHeight({ x, z })
  const { emitter, lifetime, emitPower, gravity, sizeGradients, colorGradients, angularSpeed, emission } = lookoutFlame
  const flame = new ParticleSystem('Lookout flames', lookoutFlame.capacity, scene)
  flame.particleTexture = createParticleTexture(scene, 'flame')
  flame.emitter = new Vector3(x, y + emitter.height, z)
  flame.createBoxEmitter(new Vector3(...emitter.minDirection), new Vector3(...emitter.maxDirection), new Vector3(...emitter.minPoint), new Vector3(...emitter.maxPoint))
  flame.minLifeTime = lifetime[0]
  flame.maxLifeTime = lifetime[1]
  flame.minEmitPower = emitPower[0]
  flame.maxEmitPower = emitPower[1]
  flame.gravity.set(...gravity)
  flame.blendMode = ParticleSystem.BLENDMODE_ADD
  for (const [key, min, max] of sizeGradients) flame.addSizeGradient(key, min, max)
  for (const [key, r, g, b, a] of colorGradients) flame.addColorGradient(key, new Color4(r, g, b, a))
  flame.minAngularSpeed = angularSpeed[0]
  flame.maxAngularSpeed = angularSpeed[1]

  const smoke = createParticleEffect(scene, 'Lookout smoke', particleRecipes['rising-smoke'], lookoutFireSeeds.smoke)
  const embers = createParticleEffect(scene, 'Lookout embers', particleRecipes.fire, lookoutFireSeeds.embers)
  const smokeSource = { x, y: y + lookoutParticleHeights.smoke, z }
  const emberSource = { x, y: y + lookoutParticleHeights.embers, z }

  let burning = false
  return {
    pose(time: number, intensity: number) {
      flame.emitRate = intensity * (emission.baseRate + emission.pulseAmplitude * Math.sin(time * emission.pulseSpeed))
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
