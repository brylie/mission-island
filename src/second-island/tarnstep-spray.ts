import type { Scene } from '@babylonjs/core/scene'
import { createParticleEffect } from '../particle-effect'
import { particleLoop } from '../particle-motion'
import { particleRecipes } from '../particle-recipes'
import type { WildlifeFrame } from '../wildlife'
import { phenomenonStrength, smoothRange } from '../wildlife-motion'
import { fallsX, fallsY } from './terrain'

const z = 169
export const tarnstepSpraySource = { x: fallsX(z), y: fallsY(z) + 0.08, z }
export const tarnstepSpraySeed = 2962

export function createTarnstepSpray(scene: Scene) {
  const source = tarnstepSpraySource
  const recipe = particleRecipes['waterfall-spray']
  const spray = createParticleEffect(scene, 'Tarnstep spray', recipe, tarnstepSpraySeed)
  const duration = 6
  const particles = particleLoop(recipe, tarnstepSpraySeed, duration, source)
  return ({ time, weather, camera }: WildlifeFrame) => {
    const distance = Math.hypot(camera.x - source.x, camera.y - source.y, camera.z - source.z)
    const strength = phenomenonStrength('spray', weather) * (1 - smoothRange(32, 50, distance))
    spray.draw(time % duration, strength > 0.01 ? particles : [], strength)
  }
}
