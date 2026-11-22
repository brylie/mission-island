import type { Scene } from '@babylonjs/core/scene'
import { createParticleEffect } from '../particle-effect'
import { particleLoop } from '../particle-motion'
import { particleRecipes } from '../assets/recipes/particle-recipes'
import type { WildlifeFrame } from '../wildlife'
import { phenomenonStrength, smoothRange } from '../wildlife-motion'
import { fallsX, fallsY } from './terrain'

const emitterClearance = 0.08
const sprayFadeNear = 32
const sprayFadeFar = 50
const drawStrengthFloor = 0.01

const z = 169
export const tarnstepSpraySource = { x: fallsX(z), y: fallsY(z) + emitterClearance, z }
export const tarnstepSpraySeed = 2962

export function createTarnstepSpray(scene: Scene) {
  const source = tarnstepSpraySource
  const recipe = particleRecipes['waterfall-spray']
  const spray = createParticleEffect(scene, 'Tarnstep spray', recipe, tarnstepSpraySeed)
  const duration = 6
  const particles = particleLoop(recipe, tarnstepSpraySeed, duration, source)
  return ({ time, weather, camera }: WildlifeFrame) => {
    const distance = Math.hypot(camera.x - source.x, camera.y - source.y, camera.z - source.z)
    const strength = phenomenonStrength('spray', weather) * (1 - smoothRange(sprayFadeNear, sprayFadeFar, distance))
    spray.draw(time % duration, strength > drawStrengthFloor ? particles : [], strength)
  }
}
