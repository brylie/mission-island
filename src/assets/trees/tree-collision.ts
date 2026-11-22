import { shrubGrowth, type FrondForm, type LogForm, type MoundForm, type SnagForm } from '../geometry/shrub-species.ts'
import { treeGrowth, type TreeForm } from '../geometry/tree-species.ts'
import { authoredAge, between, seedStreams, treeSpecies, type Stream, type TreeCollision, type TreeTemplateOptions } from './tree-catalog.ts'

// Each habit's first draws from the template's main stream fix its size. The growers call
// these same functions, so collision from treeCollision always matches the grown mesh.

export function treeSize(form: TreeForm, options: TreeTemplateOptions, random: Stream) {
  const old = options.age === 'old' && form.budget === 'tree'
  const authored = authoredAge(options.age)
  const fullHeight = between(random, form.height[authored]) * (old ? treeGrowth.old.height : 1)
  const height = fullHeight * (options.exposure === 'exposed' ? form.exposure.height : 1)
  const baseRadius = fullHeight * form.trunk.radius[authored] * (old ? treeGrowth.old.girth : 1)
  const collision: TreeCollision = { shape: 'upright', solid: true, radius: baseRadius, height }
  return { fullHeight, height, baseRadius, collision }
}

export function moundSize(form: MoundForm, options: TreeTemplateOptions, random: Stream) {
  const age = authoredAge(options.age)
  const exposed = options.exposure === 'exposed'
  // Some sheltered plants grow as a spreading vase rather than a column.
  const vase = !exposed && form.vase && random() < form.vase.chance ? form.vase : undefined
  const height = between(random, form.height[age]) * (exposed ? form.exposure.height : vase?.height ?? 1)
  const spread = between(random, form.spread[age]) * (exposed ? form.exposure.spread : vase?.spread ?? 1)
  const collision: TreeCollision = { shape: 'upright', solid: false, radius: spread, height }
  return { vase, height, spread, collision }
}

const parabolaVertex = 2
const halfWidth = 0.5

// Fronds draw their lengths frond by frond, so the patch reports its largest possible extent.
export function frondSize(form: FrondForm, options: TreeTemplateOptions): TreeCollision {
  const exposed = options.exposure === 'exposed'
  const longest = form.length[authoredAge(options.age)][1] * (exposed ? form.exposure.height : 1)
  const reach = form.patch[1] + longest * (exposed ? form.exposure.spread : 1)
  // growFronds lifts the blade above the stipe by rise·t − droop·t²; its peak tops the frond.
  const { stipe, rise, droop } = form.arc
  const peak = Math.min(1 - form.blade.start, Math.max(0, rise / (parabolaVertex * droop)))
  const lift = rise * peak - droop * peak * peak
  // A frond tilted across its run raises one blade edge by up to half the widest blade.
  const tilt = shrubGrowth.frondTilt / Math.hypot(1, shrubGrowth.frondTilt)
  const edge = Math.max(form.blade.width * longest, shrubGrowth.stipeWidth) * halfWidth * tilt
  return { shape: 'upright', solid: false, radius: reach, height: longest * (stipe * form.blade.start + lift) + edge }
}

export function snagSize(form: SnagForm, options: TreeTemplateOptions, random: Stream) {
  const height = between(random, form.height[authoredAge(options.age)])
  const radius = between(random, form.radius)
  const collision: TreeCollision = { shape: 'upright', solid: true, radius, height }
  return { height, radius, collision }
}

export function logSize(form: LogForm, options: TreeTemplateOptions, random: Stream) {
  const age = authoredAge(options.age)
  const length = between(random, form.length[age])
  const radius = between(random, form.radius[age])
  const axisHeight = radius * (1 - form.sink[age])
  const collision: TreeCollision = { shape: 'lying', solid: true, radius, length, axisHeight }
  return { length, radius, axisHeight, collision }
}

// Collision for one template without growing its mesh or touching any texture code.
export function treeCollision(options: TreeTemplateOptions): TreeCollision {
  const form = treeSpecies[options.species]
  const random = seedStreams(options.species, options.seed)(0)
  switch (form.habit) {
    case 'tree': return treeSize(form, options, random).collision
    case 'mound': return moundSize(form, options, random).collision
    case 'fronds': return frondSize(form, options)
    case 'snag': return snagSize(form, options, random).collision
    case 'log': return logSize(form, options, random).collision
  }
}
