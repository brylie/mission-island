import type { ParticleRecipe } from './particle-recipes.ts'
import { seededRandom } from './seeded-random.ts'

export interface ParticleSource {
  x: number
  y: number
  z: number
  yaw?: number
  pitch?: number
  floor?: number
  ceiling?: number
  speed?: number
  orbit?: { x: number, z: number, angularSpeed: number, peelAfter: number }
}

export interface ParticleTuning {
  strength: number
  footprint: number
  wind?: number
}

export type ParticleOrigin = (birth: number, index: number) => ParticleSource | undefined

const between = (a: number, b: number, t: number) => a + (b - a) * t

function floorBounce(floor: number | undefined, restitution: number | undefined, y: number, vy: number, ay: number) {
  if (floor === undefined || !restitution || ay >= 0) return
  const incoming = Math.sqrt(vy * vy - 2 * ay * Math.max(0, y - floor))
  return { time: (vy + incoming) / -ay, speed: incoming * restitution, floor }
}

export function launchParticle(recipe: ParticleRecipe, seed: number, index: number, birth: number, source: ParticleSource, tuning: ParticleTuning) {
  const random = seededRandom(seed ^ Math.imul(index + 1, 0x9e3779b9))
  const signed = () => 2 * random() - 1
  const { spread, velocity, variation, acceleration } = recipe
  const { footprint, wind = 0 } = tuning
  const yaw = source.yaw ?? 0
  const pitch = source.pitch ?? 0
  const sin = Math.sin(yaw), cos = Math.cos(yaw)
  const rise = Math.sin(pitch), forward = Math.cos(pitch)
  const ox = spread[0] * signed() * footprint
  const oy = spread[1] * signed()
  const oz = spread[2] * signed() * footprint
  const speed = source.speed ?? 1
  const vx = (velocity[0] + variation[0] * signed()) * footprint * speed + (recipe.wind ?? 0) * wind
  const up = (velocity[1] + variation[1] * signed()) * speed
  const vz = (velocity[2] + variation[2] * signed()) * footprint * speed
  const along = vz * forward - up * rise
  const vy = up * forward + vz * rise
  const y = source.y + oy
  return {
    birth,
    life: between(...recipe.life, random()),
    floor: source.floor ?? -Infinity,
    ceiling: source.ceiling ?? Infinity,
    x: source.x + ox * cos + oz * sin,
    y,
    z: source.z - ox * sin + oz * cos,
    vx: vx * cos + along * sin,
    vy,
    vz: -vx * sin + along * cos,
    yaw,
    orbit: source.orbit,
    adhesion: recipe.adhesion ?? 0,
    bounce: floorBounce(source.floor, recipe.bounce, y, vy, acceleration[1]),
    ax: acceleration[0] * cos + acceleration[2] * sin,
    ay: acceleration[1],
    az: -acceleration[0] * sin + acceleration[2] * cos,
    size: between(...recipe.size, random()) * (recipe.surface === 'ground' ? footprint : 1),
    phase: random() * Math.PI * 2,
    spin: signed() * (recipe.spin ?? 0),
    tilt: (recipe.tilt ?? 0) + (recipe.wind ?? 0) * wind * 0.08,
  }
}

export type Particle = ReturnType<typeof launchParticle>

export function particleHeight(particle: Particle, age: number) {
  const moving = Math.max(0, age - particle.adhesion)
  const bounce = particle.bounce
  if (bounce && moving >= bounce.time) {
    const rebound = moving - bounce.time
    return bounce.floor + rebound * (bounce.speed + rebound * particle.ay / 2)
  }
  return particle.y + moving * (particle.vy + moving * particle.ay / 2)
}

export function particleDensity(recipe: ParticleRecipe, tuning: ParticleTuning) {
  return recipe.rate * Math.max(0, Math.min(2, tuning.strength))
}

export function particleBurst(recipe: ParticleRecipe, seed: number, start: number, stop: number, tuning: ParticleTuning, sourceAt: ParticleOrigin) {
  const density = particleDensity(recipe, tuning)
  const particles: Particle[] = []
  for (let index = 0; index < (stop - start) * density; index++) {
    const birth = start + (index + 0.5) / density
    if (birth >= stop) break
    const source = sourceAt(birth, index)
    if (source) particles.push(launchParticle(recipe, seed, index, birth, source, tuning))
  }
  return particles
}

export function particleLoop(recipe: ParticleRecipe, seed: number, duration: number, source: ParticleSource) {
  const cycle = particleBurst(recipe, seed, 0, duration, { strength: 1, footprint: 1 }, () => source)
  const carryover = cycle.filter((particle) => particle.birth + particle.life > duration)
    .map((particle) => ({ ...particle, birth: particle.birth - duration }))
  return [...carryover, ...cycle]
}

function orbitPosition(particle: Particle, orbit: NonNullable<ParticleSource['orbit']>, age: number) {
  const arc = orbit.angularSpeed * Math.min(age, orbit.peelAfter)
  const { x, z } = orbit
  const dx = particle.x - x, dz = particle.z - z
  const across = Math.cos(arc) * dx - Math.sin(arc) * dz
  const downstream = Math.sin(arc) * dx + Math.cos(arc) * dz
  const peel = Math.max(0, age - orbit.peelAfter) * orbit.angularSpeed * 0.73
  return { x: x + across - downstream * peel, z: z + downstream + across * peel }
}

export function particleAppearance(recipe: ParticleRecipe, particle: Particle, age: number, y: number) {
  const progress = age / particle.life
  const flutter = (recipe.flutter ?? 0) * Math.sin(age * 7 + particle.phase) * Math.min(1, age * 4)
  const start = particle.orbit ? orbitPosition(particle, particle.orbit, age) : particle
  const bounce = particle.bounce
  const travel = bounce ? Math.min(age, bounce.time) + Math.max(0, age - bounce.time) * 0.6 : age
  return {
    x: start.x + travel * (particle.vx + age * particle.ax / 2) + flutter,
    y,
    z: start.z + travel * (particle.vz + age * particle.az / 2) + flutter * 0.42,
    size: particle.size * between(1, recipe.growth, progress),
    stretch: 1 + (recipe.stretch ?? 0) * Math.max(0, progress - 0.24),
    widthScale: recipe.wingbeat ? 0.31 + 0.69 * Math.abs(Math.cos(age * recipe.wingbeat + particle.phase)) : 1,
    yaw: particle.yaw,
    angle: particle.tilt + (recipe.spin ? particle.phase + particle.spin * age : 0),
    alpha: recipe.opacity * Math.min(1, progress / recipe.fadeIn) * (1 - progress),
    progress,
  }
}
