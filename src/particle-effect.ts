import { Sprite } from '@babylonjs/core/Sprites/sprite'
import { SpriteManager } from '@babylonjs/core/Sprites/spriteManager'
import type { Scene } from '@babylonjs/core/scene'
import { launchParticle, particleAppearance, particleDensity, particleHeight } from './particle-motion'
import type { Particle, ParticleSource, ParticleTuning } from './particle-motion'
import { particleTextureSize, createParticleTexture } from './particle-texture'
import { createSurfaceParticles } from './particle-surface'
import type { ParticleRecipe } from './particle-recipes'

function createBillboards(scene: Scene, name: string, recipe: ParticleRecipe, capacity: number) {
  const manager = new SpriteManager(name, '', capacity, particleTextureSize, scene)
  manager.texture = createParticleTexture(scene, recipe.shape)
  manager.disableDepthWrite = true
  manager.isPickable = false
  const sprites = Array.from({ length: capacity }, () => new Sprite(name, manager))
  manager.sprites.length = 0
  return {
    paint(index: number, frame: ReturnType<typeof particleAppearance>, r: number, g: number, b: number, a: number) {
      const sprite = sprites[index]
      manager.sprites[index] = sprite
      sprite.position.set(frame.x, frame.y, frame.z)
      sprite.height = frame.size
      sprite.width = frame.size * recipe.aspect
      sprite.angle = frame.angle
      sprite.color.set(r, g, b, a)
    },
    finish(count: number) {
      manager.sprites.length = count
    },
  }
}

export function createParticleEffect(scene: Scene, name: string, recipe: ParticleRecipe, seed: number) {
  const capacity = Math.ceil(recipe.rate * 2 * recipe.life[1]) + 2
  const pool = recipe.surface ? createSurfaceParticles(scene, name, recipe, capacity) : createBillboards(scene, name, recipe, capacity)
  const [r, g, b] = recipe.color
  const [fadeR, fadeG, fadeB] = recipe.fadeTo ?? recipe.color

  function draw(time: number, particles: readonly Particle[], opacity = 1) {
    let count = 0
    for (const particle of particles) {
      if (particle.birth > time || count === capacity) break
      const age = time - particle.birth
      if (age >= particle.life) continue
      const y = particleHeight(particle, age)
      if (y < particle.floor || y >= particle.ceiling) continue
      const frame = particleAppearance(recipe, particle, age, y)
      const { progress, alpha } = frame
      pool.paint(count++, frame, r + (fadeR - r) * progress, g + (fadeG - g) * progress, b + (fadeB - b) * progress, alpha * opacity)
    }
    pool.finish(count)
    return count
  }

  let live: Particle[] = []
  let previous = 0
  let carry = 0
  let sequence = 0
  return {
    draw,
    stream(time: number, source: ParticleSource | undefined, tuning: ParticleTuning) {
      if (time < previous) {
        live = []
        carry = 0
        sequence = 0
      }
      let first = 0
      while (first < live.length && live[first].birth + recipe.life[1] <= time) first++
      if (first) live.splice(0, first)
      const delta = Math.min(.08, Math.max(0, time - previous))
      previous = time
      if (source && tuning.strength > 0) {
        const density = particleDensity(recipe, tuning)
        const emitted = carry + delta * density
        for (let i = 1; i <= emitted; i++) {
          const birth = time - delta + (i - carry) / density
          live.push(launchParticle(recipe, seed, sequence++, birth, source, tuning))
        }
        carry = emitted % 1
      } else carry = 0
      return draw(time, live)
    },
  }
}
