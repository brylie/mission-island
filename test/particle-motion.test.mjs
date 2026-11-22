import { test } from 'node:test'
import assert from 'node:assert/strict'
import { launchParticle, particleAppearance, particleBurst, particleHeight, particleLoop } from '../src/particle-motion.ts'
import { particleRecipes } from '../src/assets/recipes/particle-recipes.ts'
import { particleAccents } from '../src/assets/recipes/particle-accents.ts'

const origin = { x: 2, y: 1, z: -3 }
const tuning = { strength: 1, footprint: 1 }

test('each effect can replay the same launch and drain before the timeline resets', () => {
  for (const [name, recipe] of Object.entries({ ...particleRecipes, ...particleAccents })) {
    const burst = (seed) => particleBurst(recipe, seed, 0.25, 2.9, tuning, () => origin)
    const particles = burst(123)
    assert.ok(particles.length > 0, name)
    assert.deepEqual(burst(123), particles, name)
    assert.notDeepEqual(burst(124), particles, name)
    assert.ok(particles.every(({ birth, life }) => birth >= 0.25 && birth < 2.9 && birth + life < 6.25), name)
    assert.deepEqual(particleBurst(recipe, 123, 0.25, 2.9, { ...tuning, strength: 0 }, () => origin), [])
  }
})

test('a moving source contributes only its contact strokes and retains its birth positions', () => {
  const sourceAt = (time) => time >= 0.5 && time < 1 ? { x: time, y: 0.1, z: 0, floor: 0.015 } : undefined
  const particles = particleBurst(particleRecipes['paddle-droplets'], 1, 0.25, 2.9, tuning, sourceAt)
  assert.ok(particles.length > 10)
  for (const particle of particles) {
    assert.ok(particle.birth >= 0.5 && particle.birth < 1)
    assert.ok(Math.abs(particle.x - particle.birth) <= 0.1)
    assert.equal(particle.floor, 0.015)
  }
})

test('a nozzle launch starts at the source and follows its pitch and heading', () => {
  const recipe = particleRecipes.extinguisher
  const flat = launchParticle(recipe, 23, 0, 1, origin, tuning)
  const pitched = launchParticle(recipe, 23, 0, 1, { ...origin, yaw: Math.PI / 2, pitch: Math.PI / 4 }, tuning)
  assert.deepEqual([pitched.x, pitched.y, pitched.z], [origin.x, origin.y, origin.z])
  const after = particleAppearance(recipe, pitched, 0.25, particleHeight(pitched, 0.25))
  assert.ok(after.x > origin.x + 1 && after.y > origin.y + 1)
  assert.ok(Math.abs(after.z - origin.z) < 0.4)
  assert.ok(particleHeight(flat, 0.25) < after.y)
  assert.equal(particleAppearance(recipe, flat, flat.life, particleHeight(flat, flat.life)).alpha, 0)
})

test('a frozen waterfall frame includes seeded particles still alive from the previous cycle', () => {
  const recipe = particleRecipes['waterfall-spray']
  const period = 6
  const loop = particleLoop(recipe, 2962, period, origin)
  const carryover = loop.filter((particle) => particle.birth < 0)
  assert.ok(carryover.length > 0)
  for (const particle of carryover) {
    const next = loop.find((candidate) => candidate.birth === particle.birth + period)
    assert.deepEqual({ ...next, birth: particle.birth }, particle)
    assert.ok(particle.birth + particle.life > 0)
  }
  assert.deepEqual(particleLoop(recipe, 2962, period, origin), loop)
})

test('deck sparks cross the impact height once, rebound, then fall out of the effect', () => {
  const spark = launchParticle(particleRecipes['ferry-repair-sparks'], 1, 0, 0, { ...origin, floor: 0 }, tuning)
  const { time, speed } = spark.bounce
  assert.ok(time > 0 && speed > 0)
  assert.equal(particleHeight(spark, time), 0)
  assert.ok(particleHeight(spark, time - 0.01) > 0)
  assert.ok(particleHeight(spark, time + 0.01) > 0)
  assert.ok(particleHeight(spark, time + 2 * speed / -spark.ay + 0.01) < 0)
})

test('eddy foam curves around its source before peeling away', () => {
  const recipe = { ...particleRecipes['eddy-foam-flecks'], spread: [0, 0, 0], variation: [0, 0, 0] }
  const eddy = { ...origin, x: 1, z: 0, orbit: { x: 0, z: 0, angularSpeed: Math.PI / 2, peelAfter: 1 } }
  const fleck = launchParticle(recipe, 1, 0, 0, eddy, tuning)
  const around = particleAppearance(recipe, fleck, 1, origin.y)
  const downstream = particleAppearance(recipe, fleck, 1.5, origin.y)
  assert.ok(Math.abs(around.x) < 0.001)
  assert.equal(around.z, 1)
  assert.ok(downstream.x < -0.4)
  assert.equal(downstream.z, 1)
})

test('window spatter clings to the pane before running down', () => {
  const recipe = particleRecipes['window-spatter']
  const drop = launchParticle(recipe, 1, 0, 0, origin, tuning)
  assert.equal(particleHeight(drop, 0.25), drop.y)
  assert.ok(particleHeight(drop, 0.64) < drop.y)
  assert.ok(particleAppearance(recipe, drop, 0.7, particleHeight(drop, 0.7)).stretch > 1)
})
