import type { Body, ContactEquation, Shape, World } from 'cannon-es'

type ImpactSurface = 'ground' | 'bed'

type CrateImpact = { item: number, x: number, y: number, z: number, strength: number, surface: ImpactSurface }

// Approach speed (m/s) below which a touch is a resting contact, and the speed of a hard drop.
export const minImpactSpeed = 0.45
const hardImpactSpeed = 6.5
export const impactDebounceSeconds = 0.18

export function impactStrength(speed: number) {
  if (!Number.isFinite(speed) || speed < minImpactSpeed) return 0
  return Math.min(1, (speed - minImpactSpeed) / (hardImpactSpeed - minImpactSpeed) * 0.9 + 0.1)
}

type Candidate = { speed: number, surface: ImpactSurface, x: number, y: number, z: number }

// Keep the strongest contact per crate across substeps, then apply the per-crate debounce.
export function createImpactFilter(crates: number) {
  const pending = new Map<number, Candidate>()
  const lastAt = Array.from({ length: crates }, () => -Infinity)
  const quietSteps = Array.from({ length: crates }, () => 0)
  return {
    offer(item: number, candidate: Candidate) {
      if (quietSteps[item] > 0) return
      const current = pending.get(item)
      if (!current || candidate.speed > current.speed) pending.set(item, candidate)
    },
    // Teleports such as a restore or a water respawn are not impacts.
    quiet(item: number, steps = 8) {
      quietSteps[item] = Math.max(quietSteps[item], steps)
      pending.delete(item)
    },
    drain(time: number): CrateImpact[] {
      const impacts: CrateImpact[] = []
      for (const [item, { speed, surface, x, y, z }] of pending) {
        const strength = impactStrength(speed)
        if (!strength || time - lastAt[item] < impactDebounceSeconds) continue
        lastAt[item] = time
        impacts.push({ item, x, y, z, strength: Math.round(strength * 1000) / 1000, surface })
      }
      pending.clear()
      for (let i = 0; i < quietSteps.length; i++) quietSteps[i] = Math.max(0, quietSteps[i] - 1)
      return impacts
    },
  }
}

type BodyContact = { bodyA: Body | null, bodyB: Body | null }
type ShapeContact = { shapeA: Shape | null, shapeB: Shape | null }

function approachSpeed(contacts: readonly ContactEquation[], matches: (contact: ContactEquation) => boolean) {
  let speed = 0
  for (const contact of contacts) {
    if (matches(contact)) speed = Math.max(speed, contact.getImpactVelocityAlongNormal())
  }
  return speed
}

const between = (a: object, b: object, i: object, j: object) => (i === a && j === b) || (i === b && j === a)

// Cannon raises both contact events before solving, so the contact still holds the approach speed.
// Body pairs cover the terrain heightfield, props and other crates. Truck contacts use shape pairs,
// so a crate that rests against a rail still reports its later landing on the bed deck.
export function watchCrateImpacts(world: World, crates: readonly Body[], truck: Body, bedShape: Shape) {
  const filter = createImpactFilter(crates.length)
  const index = new Map(crates.map((body, i) => [body, i]))
  const offer = (bodyA: Body, bodyB: Body, surface: ImpactSurface, matches: (contact: ContactEquation) => boolean) => {
    // Between two crates, the lower-numbered crate carries the sound.
    const item = index.get(bodyA) ?? index.get(bodyB)
    if (item === undefined) return
    const { x, y, z } = crates[item].position
    filter.offer(item, { speed: approachSpeed(world.contacts, matches), surface, x, y, z })
  }
  world.addEventListener('beginContact', ({ bodyA, bodyB }: BodyContact) => {
    if (!bodyA || !bodyB || bodyA === truck || bodyB === truck) return
    offer(bodyA, bodyB, 'ground', (contact) => between(bodyA, bodyB, contact.bi, contact.bj))
  })
  world.addEventListener('beginShapeContact', ({ shapeA, shapeB }: ShapeContact) => {
    const bodyA = shapeA?.body
    const bodyB = shapeB?.body
    if (!bodyA || !bodyB || (bodyA !== truck && bodyB !== truck)) return
    const surface = shapeA === bedShape || shapeB === bedShape ? 'bed' : 'ground'
    offer(bodyA, bodyB, surface, (contact) => between(shapeA, shapeB, contact.si, contact.sj))
  })
  return filter
}
