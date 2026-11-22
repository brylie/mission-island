import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { BlackAndWhitePostProcess } from '@babylonjs/core/PostProcesses/blackAndWhitePostProcess'
import { treeSpeciesStudy } from '../assets/recipes/workbench-tree-species'
import type { MeshFactory } from '../island-meshes'
import { surfaces } from '../materials'
import { buildTreeTemplate, type TreeTemplate } from '../assets/trees/tree-template'
import {
  treeAges,
  treeExposures,
  treeSpecies,
  treeSpeciesIds,
  treeTiers,
  type TreeAge,
  type TreeExposure,
  type TreeSpecies,
  type TreeTemplateOptions,
  type TreeTier,
} from '../assets/trees/tree-catalog'
import { control, range, type Entry, type Values } from './subject'

const half = 0.5
const decimals = 2
const greyscaleRatio = 1
const { seed, count, gap, layouts, looks, silhouette, tierSwitch } = treeSpeciesStudy
type Layout = keyof typeof layouts
type Look = keyof typeof looks
interface Placed { options: TreeTemplateOptions, template: TreeTemplate, x: number }

const speciesChoices = Object.fromEntries(treeSpeciesIds.map((id) => [id, treeSpecies[id].name]))
const choices = <T extends string>(names: readonly T[]) => Object.fromEntries(names.map((name) => [name, name[0].toUpperCase() + name.slice(1)]))

// The templates a layout shows, left to right. Entries that share a slot stand on the same spot.
function arrangement(layout: Layout, base: TreeTemplateOptions, seeds: number): TreeTemplateOptions[][] {
  const run = Array.from({ length: seeds }, (_, i) => ({ ...base, seed: base.seed + i }))
  switch (layout) {
    case 'seeds': return run.map((options) => [options])
    case 'family': return (['young', 'mature'] as const).flatMap((age) => run.map((options) => [{ ...options, age }]))
    case 'growth': return treeAges.flatMap((age) => treeExposures.map((exposure) => [{ ...base, age, exposure }]))
    case 'tiers': return run.flatMap((options) => treeTiers.map((tier) => [{ ...options, tier }]))
    case 'distance': return run.map((options) => treeTiers.map((tier) => ({ ...options, tier })))
    case 'lineup': return treeSpeciesIds.map((species) => [{ ...base, species }])
  }
}

// Packs slots left to right by their actual footprint, so wind-bent crowns never overlap.
function placeRow(meshes: MeshFactory, slots: TreeTemplateOptions[][]): Placed[] {
  const built = slots.map((slot) => {
    const templates = slot.map((options) => {
      const template = buildTreeTemplate(meshes, options)
      for (const part of template.parts) meshes.shadows.addShadowCaster(part)
      return { options, template, ...template.root.getHierarchyBoundingVectors(true) }
    })
    return { templates, minX: Math.min(...templates.map(({ min }) => min.x)), maxX: Math.max(...templates.map(({ max }) => max.x)) }
  })
  const width = built.reduce((sum, { minX, maxX }) => sum + maxX - minX + gap, -gap)
  let cursor = -width * half
  const placed: Placed[] = []
  for (const { templates, minX, maxX } of built) {
    for (const { options, template } of templates) {
      template.root.position.set(cursor - minX, 0, 0)
      placed.push({ options, template, x: cursor - minX })
    }
    cursor += maxX - minX + gap
  }
  return placed
}

function describe(placed: Placed[]) {
  const { collision } = placed[0].template
  const solid = collision.solid ? 'trunk' : 'soft cover'
  const size = collision.shape === 'upright'
    ? `${solid} r ${collision.radius.toFixed(decimals)} m, ${collision.height.toFixed(1)} m tall`
    : `log r ${collision.radius.toFixed(decimals)} m, ${collision.length.toFixed(1)} m long`
  // Group by tier and budget class, so near beside far and mixed species each show their own budget.
  const groups = new Map<string, { name: string, budget: string, triangles: number[] }>()
  for (const name of treeTiers) for (const { options, template } of placed) {
    if (options.tier !== name) continue
    const budget = `${template.budgetClass} budget ${template.budget.join('–')}`
    const group = groups.get(name + budget) ?? { name, budget, triangles: [] }
    group.triangles.push(template.triangles)
    groups.set(name + budget, group)
  }
  const tiers = [...groups.values()].map(({ name, budget, triangles }) =>
    `${name} ${Math.min(...triangles).toLocaleString()}–${Math.max(...triangles).toLocaleString()} (${budget})`).join(' · ')
  return `${tiers} triangles per template · ${placed.length} templates · first: ${size}`
}

function applyLook(meshes: MeshFactory, placed: Placed[], look: Look) {
  if (look !== 'silhouette') return
  // Unlit and untinted, so every species reads as the same flat shape.
  const shape = new StandardMaterial('Highwood silhouette', meshes.scene)
  shape.disableLighting = true
  shape.emissiveColor = Color3.FromHexString(silhouette.shape)
  for (const { template } of placed) for (const part of template.parts) {
    part.material = shape
    part.useVertexColors = false
  }
  meshes.scene.clearColor = Color4.FromHexString(`${silhouette.sky}ff`)
}

export const treeSpeciesEntry: Entry = {
  id: 'highwood-species',
  name: 'Highwood species',
  group: 'Plants',
  source: 'src/assets/trees/tree-template.ts',
  description: 'Procedural Scots pine, birch, aspen, rowan, alder, willow, deadwood, juniper, heather, bilberry, bracken and saplings. Compare seeds, ages, wind exposure, silhouettes and the distant tier. Exposed forms lean toward +x, downwind.',
  readout: 'Template triangles',
  ground: { height: 0, color: surfaces.grass.color },
  controls: [
    control('species', 'Species', 'scots-pine', speciesChoices, true),
    control('age', 'Age', 'mature', choices(treeAges), true),
    control('exposure', 'Exposure', 'sheltered', choices(treeExposures), true),
    control('tier', 'Detail tier', 'near', choices(treeTiers), true),
    control('layout', 'Compare', 'seeds', { ...layouts }, true),
    control('look', 'Look', 'colour', { ...looks }, true),
    { type: 'number', key: 'seed', label: 'First seed', value: seed[0], min: seed[1], max: seed[2], step: seed[3], rebuild: true },
    range('count', 'Seeds side by side', ...count, true),
    range('switch', 'Tier switch distance (m)', ...tierSwitch),
  ],
  create(meshes, values: Values, _reportError, observe) {
    const base: TreeTemplateOptions = {
      species: values.species as TreeSpecies,
      age: values.age as TreeAge,
      exposure: values.exposure as TreeExposure,
      tier: values.tier as TreeTier,
      seed: Number(values.seed),
    }
    const placed = placeRow(meshes, arrangement(values.layout as Layout, base, Number(values.count)))
    applyLook(meshes, placed, values.look as Look)
    const summary = describe(placed)
    observe(summary)
    let greyscale: BlackAndWhitePostProcess | undefined
    let shown = ''
    return ({ camera }, settings) => {
      const view = meshes.scene.activeCamera
      if (settings.look === 'greyscale' && view && !greyscale) greyscale = new BlackAndWhitePostProcess('Highwood greyscale', greyscaleRatio, view)
      if (settings.layout !== 'distance') return
      // Each seed stands twice on one spot; show whichever tier this camera distance calls for.
      const limit = Number(settings.switch)
      let far = 0
      for (const { options, template, x } of placed) {
        const distance = Math.hypot(camera.x - x, camera.y, camera.z)
        const useFar = distance > limit
        if (useFar && options.tier === 'far') far++
        template.root.setEnabled((options.tier === 'far') === useFar)
      }
      const state = `${summary} · ${far ? `${far} far` : 'all near'} beyond ${limit} m`
      if (state !== shown) observe(shown = state)
    }
  },
}
