import { materialSample, textureGallery } from '../assets/geometry/workbench-material-studies'
import { materialControlsPreset } from '../assets/recipes/workbench-material-studies'
import { createIslandMaterial, createSurfaceMaterial, surfaces } from '../materials'
import type { SurfaceName } from '../materials'
import { createOceanMaterial } from '../ocean'
import { createTextureSample, noiseTypes } from '../assets/surface-textures'
import type { MetalType } from '../assets/surface-textures'
import { createSurfaceGallery, surfaceStudies } from './surface-studies'
import { createSurfaceShader } from './surface-preview'
import { control, range, type Control, type Entry } from './subject'

const shaderDuration = 12

export const materialStudies: Entry[] = [
  {
    id: 'texture-gallery',
    name: 'Texture gallery',
    group: 'Materials',
    source: 'src/assets/surface-recipes.ts',
    description: 'Compare 54 named finishes across the Surface catalog and Gameplay surfaces galleries. Open a swatch from the Library to inspect its scale, wear, and relief.',
    cameraRadius: textureGallery.cameraRadius,
    topView: true,
    controls: [
      control('pattern', 'Gallery', 'catalog', { catalog: 'Surface catalog', gameplay: 'Gameplay surfaces', ...noiseTypes, surface: 'Original samples' }, true),
      range('spacing', 'Feature spacing', ...materialControlsPreset.gallerySpacing, true),
    ],
    create(meshes, values) {
      const spacing = Number(values.spacing)
      if (values.pattern === 'catalog' || values.pattern === 'gameplay') return createSurfaceGallery(meshes, spacing, values.pattern)
      const { grid, palette, sampleHeight, tile } = textureGallery
      const family = String(values.pattern)
      const repeated = family === 'surface' ? undefined : createTextureSample(meshes.scene, family, 1 / spacing, sampleHeight).diffuse
      for (const [i, surface] of palette.entries()) {
        const color = surfaces[surface].color
        const material = repeated
          ? createIslandMaterial(meshes.scene, surface, color)
          : createSurfaceMaterial(meshes.scene, surface, undefined, { grainSize: spacing })
        if (repeated && 'diffuseTexture' in material) material.diffuseTexture = repeated
        const x = (1 - i % grid.columns) * grid.spacing
        const z = (Math.floor(i / grid.columns) - 1) * grid.spacing
        meshes.box(x, tile.y, z, ...tile.size, material, undefined, false).receiveShadows = true
      }
    },
  },
  ...surfaceStudies,
  {
    id: 'shader-drafts',
    name: 'Shader drafts',
    group: 'Materials',
    source: 'src/workbench/surface.frag.glsl',
    duration: shaderDuration,
    description: 'A stage for iterating on the editable shader source.',
    controls: [control('surface', 'Substance', 'water', Object.fromEntries(
      Object.entries(surfaces).map(([key, value]) => [key, value.name]),
    ), true)],
    create(meshes, values, reportError) {
      const surface = surfaces[values.surface as SurfaceName]
      const draft = createSurfaceShader(meshes.scene, surface.pattern, reportError)
      meshes.box(0, materialSample.tile.y, 0, ...materialSample.tile.size, draft.shader, undefined, false)
      return ({ lighting, time }) => draft.apply(lighting, surface.color, surface.scale, 1, time)
    },
  },
  ...Object.entries(surfaces).map(([id, surface]): Entry => ({
    id,
    name: surface.name,
    group: 'Materials',
    swatch: surface.color,
    source: 'src/materials.ts',
    duration: id === 'water' ? shaderDuration : undefined,
    description: id === 'metal'
      ? 'Compare steel, brass, and copper with brushed wear and oxidation.'
      : 'Adjust the surface finish and compare it under different lighting.',
    controls: materialControls(id as SurfaceName),
    create(meshes, values) {
      const name = id as SurfaceName
      const color = typeof values.color === 'string' ? values.color : undefined
      const grainSize = Number(values.size ?? 1)
      const strength = Number(values.detail ?? 1)
      const water = id === 'water' ? createOceanMaterial(meshes.scene, 'preview') : undefined
      water?.setAppearance(color ?? surface.color, grainSize, strength)
      const finish = water?.material ?? createSurfaceMaterial(meshes.scene, name, color, {
        grainSize,
        contrast: strength,
        relief: Number(values.relief ?? 1),
        striations: id === 'wood' ? Number(values.striations) : undefined,
        metalType: id === 'metal' ? values.metal as MetalType : undefined,
        abrasion: id === 'metal' ? Number(values.abrasion) : undefined,
        oxidation: id === 'metal' ? Number(values.oxidation) : undefined,
      })
      const { block, cylinder, sphere, tile } = materialSample
      let sample
      switch (values.shape) {
        case 'sphere':
          sample = meshes.sphere(0, sphere.y, 0, ...sphere.size, finish, undefined, false, sphere.segments)
          break
        case 'cylinder':
          sample = meshes.cylinder(0, cylinder.y, 0, cylinder.diameter, cylinder.diameter, cylinder.height, cylinder.sides, finish, undefined, false)
          break
        case 'tile':
          sample = meshes.box(0, tile.y, 0, ...tile.size, finish, undefined, false)
          break
        default:
          sample = meshes.box(0, block.y, 0, ...block.size, finish, undefined, false)
      }
      sample.receiveShadows = true
      return water ? ({ time }) => water.pose(time) : undefined
    },
  })),
]

function materialControls(surface: SurfaceName): Control[] {
  const { metal, grainSize, contrast: contrastRange, relief: reliefRange, striations } = materialControlsPreset
  const defaultShape = ['water', 'sand', 'gravel', 'grass', 'concrete'].includes(surface) ? 'tile' : 'sphere'
  const shape = control('shape', 'Sample shape', defaultShape, { sphere: 'Sphere', cylinder: 'Cylinder', tile: 'Tile', block: 'Block' }, true)
  if (surface === 'metal') {
    return [
      shape,
      control('metal', 'Metal', 'steel', { steel: 'Steel', brass: 'Brass', copper: 'Copper' }, true),
      range('abrasion', 'Abrasion', ...metal.abrasion, true),
      range('oxidation', 'Oxidation', ...metal.oxidation, true),
      range('size', 'Scratch spacing', ...metal.scratchSpacing, true),
    ]
  }
  const features = {
    water: ['Water tint', 'Wave size', 'Choppiness', ''],
    gravel: ['Stone tone', 'Chip size', 'Stone contrast', 'Chip relief'],
    sand: ['Sand tone', 'Ripple spacing', 'Ripple contrast', 'Ripple relief'],
    concrete: ['Cement tone', 'Aggregate size', 'Mottling', 'Pitting'],
    wood: ['Timber tone', 'Grain spacing', 'Grain contrast', 'Grain relief'],
    stone: ['Stone tone', 'Grain size', 'Vein contrast', 'Surface relief'],
    leaves: ['Leaf tone', 'Leaf size', 'Vein contrast', 'Vein relief'],
    grass: ['Grass tone', 'Blade spacing', 'Patch contrast', 'Ground relief'],
  }[surface]
  const [tone, size, contrast, relief] = features
  const choices: Control[] = [
    shape,
    { type: 'color', key: 'color', label: tone, value: surfaces[surface].color, rebuild: true },
    range('size', size, ...grainSize, true),
    range('detail', contrast, ...contrastRange, true),
  ]
  if (relief) choices.push(range('relief', relief, ...reliefRange, true))
  if (surface === 'wood') choices.push(range('striations', 'Grain striations', ...striations, true))
  return choices
}
