import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { surfaceFieldViews, surfaceGallery, surfaceSwatch } from '../assets/geometry/workbench-material-studies'
import { surfaceControlsPreset } from '../assets/recipes/workbench-material-studies'
import type { MeshFactory } from '../island-meshes'
import { createRecipeMaterial } from '../materials'
import { gameplaySurfaceFamilies, standardSurfaceFamilies, surfaceRecipes, surfaceRepeatMeters } from '../assets/surface-recipes'
import type { SurfaceRecipe, SurfaceSettings } from '../assets/surface-recipes'
import { boxSurfaceUVs, cylinderSurfaceUVs } from '../surface-uvs'
import { groundHeight } from '../terrain'
import { harborDock } from '../world'
import type { FieldSite } from './field-site'
import { control, range, type Entry, type Values } from './subject'

const galleryFamilies = { catalog: standardSurfaceFamilies, gameplay: gameplaySurfaceFamilies }

const { meadow, trail, dock } = surfaceFieldViews
const halves = 2
type ReviewSite = Pick<FieldSite, 'name' | 'offset'> & Omit<NonNullable<FieldSite['surface']>, 'recipe' | 'settings'>

const sites: Partial<Record<SurfaceRecipe['id'], ReviewSite>> = {
  'meadow-turf': {
    name: 'Grassy rise west of the lookout',
    target: 'meadow',
    offset: { ...meadow.location, y: groundHeight(meadow.location) + meadow.aboveGround },
    radius: meadow.radius,
    alpha: meadow.alpha,
    beta: meadow.beta,
  },
  'path-gravel': {
    name: 'Harbor trail',
    target: 'harbor-trail',
    offset: { ...trail.location, y: groundHeight(trail.location) + trail.aboveGround },
    radius: trail.radius,
    alpha: trail.alpha,
    beta: trail.beta,
  },
  'weathered-board': {
    name: 'Harbor dock',
    target: 'dock',
    offset: { x: harborDock.x, y: harborDock.top, z: dock.z },
    radius: dock.radius,
    alpha: dock.alpha,
    beta: dock.beta,
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
  const { min, max, repeats } = surfaceSwatch.width
  return Math.min(max, Math.max(min, surfaceRepeatMeters(recipe, {}) * repeats))
}

export const surfaceStudies: Entry[] = surfaceRecipes.map((recipe) => {
  const { id, name, family, spacing, wear, colors, description } = recipe
  const site = sites[id]
  const curved = family === 'Timber' || family === 'Metal'
  const width = swatchWidth(recipe)
  const { fineSpacing, standardSpacing, maximumSpacingScale, wearLimits, relief } = surfaceControlsPreset
  const fine = spacing.mm < fineSpacing.belowMm
  const step = fine ? fineSpacing.step : standardSpacing.step
  const minSpacing = fine
    ? Math.floor(spacing.mm * fineSpacing.minimumScale) / fineSpacing.minimumDivisor
    : Math.floor(spacing.mm / standardSpacing.minimumDivisor)
  return {
    id,
    name,
    group: family,
    description,
    swatch: colors[1],
    source: gameplaySurfaceFamilies.some((group) => group === family) ? 'src/assets/recipes/gameplay-surfaces.ts' : 'src/assets/recipes/standard-surfaces.ts',
    cameraRadius: width * surfaceSwatch.cameraDistance,
    fieldSite: site && ((values) => {
      const { name, offset, ...view } = site
      return { name, offset, surface: { ...view, recipe, settings: settingsOf(values) } }
    }),
    controls: [
      ...(curved ? [control('shape', 'Sample shape', 'tile', { tile: 'Tile', cylinder: 'Cylinder' }, true)] : []),
      range('spacing', `${spacing.label} (mm)`, spacing.mm, minSpacing, spacing.mm * maximumSpacingScale, step, true),
      range('wear', wear.label, wear.amount, ...wearLimits, true),
      range('relief', 'Surface relief', ...relief, true),
      { type: 'color', key: 'tint', label: 'Surface tint', value: colors[1], rebuild: true },
    ],
    create(meshes, values) {
      const settings = settingsOf(values)
      const material = createRecipeMaterial(meshes.scene, recipe, settings)
      if (values.shape === 'cylinder') {
        const { diameterRatio, heightRatio, sides } = surfaceSwatch.cylinder
        const diameter = width * diameterRatio
        const height = width * heightRatio
        const cylinder = meshes.cylinder(0, height / halves, 0, diameter, diameter, height, sides, material, undefined, false)
        cylinderSurfaceUVs(cylinder, diameter, height, surfaceRepeatMeters(recipe, settings))
      }
      else {
        const { centerRatio, heightRatio } = surfaceSwatch.tile
        const tile = meshes.box(0, width * centerRatio, 0, width, width * heightRatio, width, material, undefined, false)
        boxSurfaceUVs(tile)
      }
    },
  }
})

function galleryLabel(meshes: MeshFactory, text: string, x: number, z: number) {
  const { label } = surfaceGallery
  const texture = new DynamicTexture(text, { width: label.width, height: label.height }, meshes.scene, true)
  const context = texture.getContext()
  context.font = `${label.fontSize}px sans-serif`
  const fontSize = Math.min(label.fontSize, Math.floor(label.fontSize * label.textWidth / context.measureText(text).width))
  texture.drawText(text, null, label.baseline, `${fontSize}px sans-serif`, label.ink, label.background, true)
  const material = new StandardMaterial(text, meshes.scene)
  material.disableLighting = true
  material.emissiveTexture = texture
  const { halfWidth: half, halfDepth: depth, y } = label
  meshes.surface(text, [
    x + half,
    y,
    z - depth,
    x - half,
    y,
    z - depth,
    x - half,
    y,
    z + depth,
    x + half,
    y,
    z + depth,
  ], [...label.triangles], material, undefined, [...label.uvs])
}

export function createSurfaceGallery(meshes: MeshFactory, spacing: number, collection: keyof typeof galleryFamilies) {
  const { columns, familySpacing, sampleSpacing, rowSpacing, textureResolution, tile: shape, label } = surfaceGallery
  for (const [familyIndex, family] of galleryFamilies[collection].entries()) {
    const group = surfaceRecipes.filter((recipe) => recipe.family === family)
    for (const [i, recipe] of group.entries()) {
      const x = (1 - familyIndex % columns) * familySpacing + (1 - i) * sampleSpacing
      const z = (Math.floor(familyIndex / columns) - 1) * rowSpacing
      const material = createRecipeMaterial(meshes.scene, recipe, { spacingMm: recipe.spacing.mm * spacing }, textureResolution)
      const width = swatchWidth(recipe)
      const tile = meshes.box(x, width * shape.centerRatio, z, width, width * shape.heightRatio, width, material, undefined, false)
      boxSurfaceUVs(tile)
      tile.scaling.x = tile.scaling.z = shape.displayWidth / width
      tile.scaling.y = shape.displayHeight / width
      galleryLabel(meshes, recipe.name, x, z + label.offsetZ)
    }
  }
}
