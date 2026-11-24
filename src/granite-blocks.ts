import { graniteBlockForm as form, graniteOutcropShape as shape } from './assets/geometry/granite-outcrops.ts'
import type { GraniteRock, GraniteSlab } from './highwood-outcrops.ts'
import { groundHeight } from './terrain.ts'

// Highwood's granite as weathered blocks ("woolsacks"): each a stack of rings from foot to
// crown, every ring a superellipse in plan (a rectangle with its corners worn round), bent
// by slow waves that twist up the block, then closed by a low, uneven dome. Faces stay
// flat triangles, so the rock reads faceted like the rest of the island.

export type Corner = [number, number, number]

export interface RockFacet {
  corners: [Corner, Corner, Corner]
  // The outward normal, not normalised.
  normal: Corner
}

const half = 0.5
const square = 2
const turn = Math.PI * square
// Rings are shrunk by the most the waves can add, so a block stays inside its slab's footprint.
const envelope = 1 + form.waves.reduce((sum, wave) => sum + wave.share, 0)

const between = (random: () => number, [least, most]: readonly [number, number]) => least + random() * (most - least)
const spread = (random: () => number, share: number) => (random() - half) * (share + share)

// A point on a superellipse of exponent `n` at `angle`, as (along, across) in units of the half size.
function superellipse(angle: number, n: number): [number, number] {
  const c = Math.cos(angle), s = Math.sin(angle), power = square / n
  return [Math.sign(c) * Math.abs(c) ** power, Math.sign(s) * Math.abs(s) ** power]
}

const minus = (a: Corner, b: Corner): Corner => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]

// The faces are wound as the old slab mesh was, so the outward normal is the reversed cross product.
function facet(a: Corner, b: Corner, c: Corner): RockFacet {
  const ab = minus(b, a), ac = minus(c, a)
  const normal: Corner = [ab[2] * ac[1] - ab[1] * ac[2], ab[0] * ac[2] - ab[2] * ac[0], ab[1] * ac[0] - ab[0] * ac[1]]
  return { corners: [a, b, c], normal }
}

// The flat triangles of one block of a rock. `foot` sinks the block's lowest ring into the
// ground under it, for the lowest block of a stack; upper blocks get a closed underside.
export function graniteBlockFacets(rock: GraniteRock, slab: GraniteSlab, foot: boolean, random: () => number): RockFacet[] {
  const kind = slab.form ?? 'block'
  const sides = form.sides[kind], rings = form.rings[kind]
  const n = between(random, form.squareness[kind])
  const tilt = rock.kind === 'outcrop' ? shape.tiltM.outcrop : shape.tiltM.clitter
  const tiltU = spread(random, tilt * half) / slab.length, tiltV = spread(random, tilt * half) / slab.width
  const waves = form.waves.map((wave) => ({ ...wave, phase: random() * turn, drift: spread(random, wave.driftRad) }))
  const sagAngle = random() * turn, sag = random() * form.crownSag * slab.height
  const cos = Math.cos(slab.heading), sin = Math.sin(slab.heading)
  const cx = rock.x + slab.dx, cz = rock.z + slab.dz, baseY = rock.ground + slab.base
  // Each angle keeps its own jitter up the block, so a bump runs from foot to crown.
  const angles = Array.from({ length: sides }, (_, k) => (k + random() * half) / sides * turn)
  const jitters = angles.map(() => 1 + spread(random, form.jitter))
  const place = (u: number, v: number, y: number): Corner => [cx + u * cos - v * sin, y + u * tiltU + v * tiltV, cz + u * sin + v * cos]
  const ring = (share: number, radius: number) => {
    const size = radius * (1 + spread(random, form.ringJitter)) / envelope
    return angles.map((angle, k) => {
      const wave = waves.reduce((sum, w) => sum + w.share * Math.sin(w.lobes * angle + w.phase + w.drift * share), 0)
      const [along, across] = superellipse(angle, n)
      const r = size * (1 + wave) * jitters[k]
      const dip = sag * share * share * (1 + Math.cos(angle - sagAngle)) * half
      return place(along * r * slab.length * half, across * r * slab.width * half, baseY + share * slab.height - dip)
    })
  }
  const layers = rings.map(([share, radius]) => ring(share, radius))
  if (foot) {
    // The foot spreads into the ground under each point and sinks below it, or below the ring
    // where the ground is higher. Where the ground falls away downhill, the face down to it is
    // broken into rough steps of bedrock, each ring flaring out further than the one above by
    // an uneven amount, so the face slopes out into the hill rather than standing as a wall.
    const embed = rock.kind === 'outcrop' ? shape.embedM.outcrop : shape.embedM.clitter
    const lowest = layers[0]
    const feet = lowest.map(([x, y, z]) => {
      const fx = cx + (x - cx) * form.footFlare, fz = cz + (z - cz) * form.footFlare
      return Math.min(y, groundHeight({ x: fx, z: fz })) - embed
    })
    const drop = Math.max(...lowest.map(([, y], k) => y - feet[k]))
    const steps = Math.min(form.skirt.maxSteps, Math.ceil(drop / form.skirt.stepM))
    for (let step = 1; step <= steps; step++) {
      const share = step / steps
      layers.unshift(lowest.map(([x, y, z], k) => {
        const out = 1 + (form.footFlare - 1) * (step < steps ? step - random() * form.skirt.jitter : step) / steps
        return [cx + (x - cx) * out, y + (feet[k] - y) * share, cz + (z - cz) * out]
      }))
    }
  }
  const facets: RockFacet[] = []
  for (let level = 0; level + 1 < layers.length; level++) {
    const low = layers[level], high = layers[level + 1]
    for (let k = 0; k < sides; k++) {
      const j = (k + 1) % sides
      // Alternate the diagonal, so the facets don't all lean the same way.
      if ((k + level) % square === 0) facets.push(facet(low[k], low[j], high[j]), facet(low[k], high[j], high[k]))
      else facets.push(facet(low[k], low[j], high[k]), facet(low[j], high[j], high[k]))
    }
  }
  const crown = place(0, 0, baseY + slab.height - sag * half), top = layers.at(-1) ?? []
  for (let k = 0; k < sides; k++) facets.push(facet(crown, top[k], top[(k + 1) % sides]))
  if (!foot) {
    // A shallow rounded underside, like the crown turned over.
    const under = place(0, 0, baseY - form.crownSag * slab.height), bottom = layers[0]
    for (let k = 0; k < sides; k++) facets.push(facet(under, bottom[(k + 1) % sides], bottom[k]))
  }
  return facets
}
