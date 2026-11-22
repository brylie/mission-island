import { blend, hash } from '../../math/noise.ts'
import { seededRandom } from '../../seeded-random.ts'
import { bilberry, bracken, deadfallLog, heather, juniper, pineSnag } from '../geometry/shrub-species.ts'
import { alder, aspen, birch, birchSapling, pineSapling, rowan, scotsPine, type treeDetail, willow } from '../geometry/tree-species.ts'

// The species catalog, template options and seeded randomness. It imports no rendering or
// texture code, so the host can size collision without growing a mesh.

export const treeSpecies = {
  'scots-pine': scotsPine,
  'birch': birch,
  'aspen': aspen,
  'rowan': rowan,
  'alder': alder,
  'willow': willow,
  'pine-snag': pineSnag,
  'deadfall-log': deadfallLog,
  'juniper': juniper,
  'heather': heather,
  'bilberry': bilberry,
  'bracken': bracken,
  'pine-sapling': pineSapling,
  'birch-sapling': birchSapling,
} as const

export type TreeSpecies = keyof typeof treeSpecies
export const treeSpeciesIds = Object.keys(treeSpecies) as TreeSpecies[]
export const treeAges = ['young', 'mature', 'old'] as const
export const treeExposures = ['sheltered', 'exposed'] as const
export const treeTiers = ['near', 'far'] as const
export type TreeAge = typeof treeAges[number]
export type TreeExposure = typeof treeExposures[number]
export type TreeTier = typeof treeTiers[number]
export type FoliageRecipe = 'needles' | 'broadleaf'
export type TreeDetail = typeof treeDetail[TreeTier]
// Authored tables hold young and mature values; an old plant starts from mature.
export const authoredAge = (age: TreeAge) => age === 'old' ? 'mature' : age

export interface TreeTemplateOptions {
  species: TreeSpecies
  age: TreeAge
  exposure: TreeExposure
  // A whole number. Fractions are dropped, so 1 and 1.7 grow the same tree.
  seed: number
  tier: TreeTier
}

// Upright stems collide as a vertical cylinder from the template origin; a lying log runs
// along +x from the origin, with its axis at the given height above the ground. Shrubs and
// fronds are soft cover: they report their extent but are not solid.
export type TreeCollision =
  | { shape: 'upright', solid: boolean, radius: number, height: number }
  | { shape: 'lying', solid: true, radius: number, length: number, axisHeight: number }

const uint32Range = 0x1_0000_0000
const bipolarSpan = 2
const half = 0.5
const fnvOffset = 0x811c9dc5
const fnvPrime = 0x01000193
// Noise keys live far from the stream keys that limbs, pads and stems use.
const noiseKeyOffset = 7_000_000

export type Stream = () => number
export type Streams = (key: number) => Stream

// A salt from the species id itself, so adding or reordering species never rerolls a placed tree.
function speciesSalt(species: TreeSpecies) {
  let salt = fnvOffset
  for (const letter of species) salt = Math.imul(salt ^ letter.charCodeAt(0), fnvPrime)
  return salt >>> 0
}

// Every limb and pad draws from its own keyed stream, so changing one branch count
// leaves the rest of the tree where it was, and the same seed grows the same tree at every age.
export function seedStreams(species: TreeSpecies, seed: number): Streams {
  const salt = speciesSalt(species)
  return (key) => seededRandom(Math.floor(hash(key, Math.trunc(seed), salt) * uint32Range))
}

// A key for per-vertex noise that also varies with the seed and species.
export const noiseKey = (streams: Streams, key: number) => Math.floor(streams(key + noiseKeyOffset)() * uint32Range)

export const mix = blend
export const between = (random: Stream, [min, max]: readonly [number, number]) => min + (max - min) * random()
// A draw centred on zero, from -amount to +amount.
export const centered = (random: Stream, amount: number) => (random() - half) * bipolarSpan * amount

// A repeatable per-vertex wobble that agrees for a ring's seam duplicates.
export const wobble = (key: number, amount: number) => (ring: number, side: number) => (hash(ring, side, key) - half) * bipolarSpan * amount
