import type { Scene } from '@babylonjs/core/scene'
import { createParticleEffect } from './particle-effect'
import { particleBurst } from './particle-motion'
import type { Particle, ParticleOrigin, ParticleSource, ParticleTuning } from './particle-motion'
import { particleRecipes } from './assets/recipes/particle-recipes'
import { particleAccents } from './assets/recipes/particle-shelf-recipes'
import { smoothRange } from './wildlife-motion'
import type { WildlifeFrame } from './wildlife'

const recipes = { ...particleRecipes, ...particleAccents }
export type WorldEffectId = keyof typeof recipes
type Emitter = ReturnType<typeof createParticleEffect>

function seed(key: string) {
  let hash = 2166136261
  for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0
}

function emitter(scene: Scene, id: WorldEffectId, key: string) {
  return createParticleEffect(scene, 'World · ' + id + ' · ' + key, recipes[id], seed(key))
}

const off = { strength: 0, footprint: 1 }

export function createMovingEffects(scene: Scene) {
  const streams = new Map<string, { pool: Emitter, source?: ParticleSource, tuning?: ParticleTuning }>()
  const bursts = new Map<WorldEffectId, { pool: Emitter, particles: Particle[], sequence: number }>()
  let time = 0
  type Eye = Pick<ParticleSource, 'x' | 'y' | 'z'>
  let eye: Eye | undefined
  return {
    begin(at: number, camera: Eye, close: boolean) {
      if (at < time) for (const burst of bursts.values()) burst.particles = []
      time = at
      eye = close ? camera : undefined
    },
    emit(id: WorldEffectId, owner: string, source: ParticleSource, tuning: ParticleTuning) {
      if (!eye || Math.hypot(eye.x - source.x, eye.y - source.y, eye.z - source.z) > 34) return
      const key = id + ':' + owner
      let stream = streams.get(key)
      if (!stream) {
        stream = { pool: emitter(scene, id, owner) }
        streams.set(key, stream)
      }
      stream.source = source
      stream.tuning = tuning
    },
    burst(id: WorldEffectId, origin: ParticleSource, strength = 1, footprint = 1, length = 0.16, delay = 0) {
      if (!eye || Math.hypot(eye.x - origin.x, eye.y - origin.y, eye.z - origin.z) > 36) return
      let burst = bursts.get(id)
      if (!burst) {
        burst = { pool: emitter(scene, id, 'event'), particles: [], sequence: 0 }
        bursts.set(id, burst)
      }
      const recipe = recipes[id]
      const fresh = particleBurst(recipe, seed(id) + burst.sequence++, time + delay, time + delay + length, { strength, footprint }, () => origin)
      burst.particles = [...burst.particles, ...fresh].sort((a, b) => a.birth - b.birth)
    },
    finish() {
      for (const stream of streams.values()) {
        stream.pool.stream(time, stream.source, stream.tuning ?? off)
        if (!eye) stream.pool.draw(time, [])
        stream.source = undefined
        stream.tuning = undefined
      }
      for (const burst of bursts.values()) {
        burst.particles = burst.particles.filter((particle) => time < particle.birth + particle.life)
        burst.pool.draw(time, eye ? burst.particles : [])
      }
    },
  }
}

export interface LocalEffect {
  id: WorldEffectId
  anchor: ParticleSource
  origin?: ParticleOrigin
  range?: number
  cycle?: number
  tuning: ParticleTuning
  opacity(frame: WildlifeFrame): number
}

export function createLocalEffects(scene: Scene, placements: readonly LocalEffect[]) {
  const sites = placements.map((site, index) => {
    const key = 'site ' + index
    const period = site.cycle ?? 8
    const recipe = recipes[site.id]
    let pool: Emitter | undefined
    let particles: Particle[] = []
    return (frame: WildlifeFrame, overview: boolean) => {
      const { anchor } = site
      const { x, y, z } = frame.camera
      const range = site.range ?? 25
      const distance = Math.hypot(x - anchor.x, y - anchor.y, z - anchor.z)
      const opacity = overview ? 0 : site.opacity(frame) * (1 - smoothRange(range * 0.7, range, distance))
      if (opacity <= 0.015) {
        pool?.draw(0, [])
        return
      }
      if (!pool) {
        pool = emitter(scene, site.id, key)
        const cycle = particleBurst(recipe, seed(site.id + key), 0, period, site.tuning, site.origin ?? (() => anchor))
        const tail = cycle.filter((particle) => particle.birth + particle.life > period)
          .map((particle) => ({ ...particle, birth: particle.birth - period }))
        particles = [...tail, ...cycle]
      }
      pool.draw(frame.time % period, particles, opacity)
    }
  })
  return (frame: WildlifeFrame, overview: boolean) => {
    for (const draw of sites) draw(frame, overview)
  }
}
