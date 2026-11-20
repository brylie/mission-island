import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import type { MeshFactory } from '../island-meshes'
import { createRecipeMaterial } from '../materials'
import { gameplaySurfaceFamilies, standardSurfaceFamilies, surfaceRecipes, surfaceRepeatMeters } from '../surface-recipes'
import type { SurfaceRecipe, SurfaceSettings } from '../surface-recipes'
import { boxSurfaceUVs, cylinderSurfaceUVs } from '../surface-uvs'
import { groundHeight } from '../terrain'
import { harborDock } from '../world'
import type { FieldSite } from './field-site'
import { control, range, type Entry, type Values } from './subject'

const galleryFamilies = { catalog: standardSurfaceFamilies, gameplay: gameplaySurfaceFamilies }

const hill = { x: -9, z: 35.7 }
const trail = { x: -45, z: -23 }
type ReviewSite = Pick<FieldSite, 'name' | 'offset'> & Omit<NonNullable<FieldSite['surface']>, 'recipe' | 'settings'>

const sites: Partial<Record<SurfaceRecipe['id'], ReviewSite>> = {
  'meadow-turf': {
    name: 'Grassy rise west of the lookout', target: 'meadow',
    offset: { ...hill, y: groundHeight(hill) + .12 }, radius: 5.4, alpha: 2.3, beta: 1.1,
  },
  'path-gravel': {
    name: 'Harbor trail', target: 'harbor-trail',
    offset: { ...trail, y: groundHeight(trail) + .08 }, radius: 3.1, alpha: 2.05, beta: .98,
  },
  'weathered-board': {
    name: 'Harbor dock', target: 'dock',
    offset: { x: harborDock.x, y: harborDock.top, z: -33.25 }, radius: 3.1, alpha: .88, beta: .98,
  },
}

function settingsOf(values: Values): SurfaceSettings {
  return {
    spacingMm: Number(values.spacing),
    wear: Number(values.wear),
    relief: Number(values.relief),
    tint: String(values.tint),
  }
}

function swatchWidth(recipe: SurfaceRecipe) {
  return Math.min(2.4, Math.max(.12, surfaceRepeatMeters(recipe, {}) * 2.55))
}

export const surfaceStudies: Entry[] = surfaceRecipes.map(recipe => {
  const { id, name, family, spacing, wear, colors, description } = recipe
  const site = sites[id]
  const curved = family === 'Timber' || family === 'Metal'
  const width = swatchWidth(recipe)
  const step = spacing.mm < 5 ? .1 : 1
  const minSpacing = step === 1 ? Math.floor(spacing.mm / 2) : Math.floor(spacing.mm * 5) / 10
  return {
    id, name, group: family, description, swatch: colors[1],
    source: gameplaySurfaceFamilies.some(group => group === family) ? 'src/gameplay-surface-recipes.ts' : 'src/surface-recipes.ts',
    previewRadius: width * 1.5,
    fieldSite: site && (values => {
      const { name, offset, ...view } = site
      return { name, offset, surface: { ...view, recipe, settings: settingsOf(values) } }
    }),
    controls: [
      ...(curved ? [control('shape', 'Sample shape', 'tile', { tile: 'Tile', cylinder: 'Cylinder' }, true)] : []),
      range('spacing', `${spacing.label} (mm)`, spacing.mm, minSpacing, spacing.mm * 2, step, true),
      range('wear', wear.label, wear.amount, 0, 1, .01, true),
      range('relief', 'Surface relief', 1, 0, 2, .05, true),
      { type: 'color', key: 'tint', label: 'Surface tint', value: colors[1], rebuild: true },
    ],
    create(meshes, values) {
      const settings = settingsOf(values)
      const material = createRecipeMaterial(meshes.scene, recipe, settings)
      if (values.shape === 'cylinder') {
        const diameter = width * .65, height = width * .89
        const cylinder = meshes.cylinder(0, height / 2, 0, diameter, diameter, height, 96, material, undefined, false)
        cylinderSurfaceUVs(cylinder, diameter, height, surfaceRepeatMeters(recipe, settings))
      } else {
        const tile = meshes.box(0, width * .043, 0, width, width * .086, width, material, undefined, false)
        boxSurfaceUVs(tile)
      }
    },
  }
})

function galleryLabel(meshes: MeshFactory, text: string, x: number, z: number) {
  const texture = new DynamicTexture(text, { width: 256, height: 64 }, meshes.scene, true)
  const context = texture.getContext()
  context.font = '29px sans-serif'
  const fontSize = Math.min(29, Math.floor(29 * 234 / context.measureText(text).width))
  texture.drawText(text, null, 43, `${fontSize}px sans-serif`, '#f0e9dc', '#233331', true)
  const material = new StandardMaterial(text, meshes.scene)
  material.disableLighting = true
  material.emissiveTexture = texture
  const half = .67, depth = .155, y = .09
  meshes.surface(text, [
    x + half, y, z - depth, x - half, y, z - depth,
    x - half, y, z + depth, x + half, y, z + depth,
  ], [0, 2, 1, 0, 3, 2], material, undefined, [0, 1, 1, 1, 1, 0, 0, 0])
}

export function createSurfaceGallery(meshes: MeshFactory, spacing: number, collection: keyof typeof galleryFamilies) {
  for (const [familyIndex, family] of galleryFamilies[collection].entries()) {
    const group = surfaceRecipes.filter(recipe => recipe.family === family)
    for (const [i, recipe] of group.entries()) {
      const x = (1 - familyIndex % 3) * 4.65 + (1 - i) * 1.46
      const z = (Math.floor(familyIndex / 3) - 1) * 2.4
      const material = createRecipeMaterial(meshes.scene, recipe, { spacingMm: recipe.spacing.mm * spacing }, 128)
      const width = swatchWidth(recipe)
      const tile = meshes.box(x, width * .035, z, width, width * .07, width, material, undefined, false)
      boxSurfaceUVs(tile)
      tile.scaling.x = tile.scaling.z = 1.34 / width
      tile.scaling.y = .85 / width
      galleryLabel(meshes, recipe.name, x, z + .86)
    }
  }
}
