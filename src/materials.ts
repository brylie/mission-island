import { Constants } from '@babylonjs/core/Engines/constants'
import { RawCubeTexture } from '@babylonjs/core/Materials/Textures/rawCubeTexture'
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import type { Scene } from '@babylonjs/core/scene'
import { createRecipeTextures, createTextureSample } from './surface-textures'
import type { SurfaceRecipe, SurfaceSettings } from './surface-recipes'
import type { MetalType } from './surface-textures'

export const surfaces = {
  water: { name: 'Water', color: '#237d8b', pattern: 0, scale: 1 },
  gravel: { name: 'Gravel', color: '#c4b285', pattern: 1, scale: 1.6 },
  sand: { name: 'Sand', color: '#e1c580', pattern: 2, scale: 1 },
  concrete: { name: 'Concrete', color: '#b9bdbb', pattern: 3, scale: 1.3 },
  wood: { name: 'Wood', color: '#78573a', pattern: 4, scale: 1 },
  stone: { name: 'Stone', color: '#939d89', pattern: 5, scale: 1 },
  leaves: { name: 'Leaves', color: '#5c904c', pattern: 6, scale: 1 },
  metal: { name: 'Metal', color: '#647975', pattern: 7, scale: 1.6 },
  grass: { name: 'Grass', color: '#739856', pattern: 8, scale: 1.35 },
} as const

export function createIslandMaterial(scene: Scene, name: string, color: string, glow = false) {
  const material = new StandardMaterial(name, scene)
  material.diffuseColor = Color3.FromHexString(color)
  material.specularColor = Color3.Black()
  if (glow) material.emissiveColor = material.diffuseColor.scale(0.45)
  return material
}

export type SurfaceName = keyof typeof surfaces

interface SurfaceAppearance {
  grainSize?: number
  contrast?: number
  relief?: number
  striations?: number
  metalType?: MetalType
  oxidation?: number
  abrasion?: number
}

const reflectionMaps = new WeakMap<Scene, RawCubeTexture>()
function studioReflection(scene: Scene) {
  const existing = reflectionMaps.get(scene)
  if (existing) return existing
  const size = 32
  const faces = Array.from({ length: 6 }, (_, face) => {
    const data = new Uint8Array(size * size * 4)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const panel = face !== 3 && (x > 5 && x < 23 && y > 4 && y < 15)
        const value = panel ? 247 : 46 + (face === 2 ? 69 : 19) + (size - y) * 2
        data.set([value * 0.93, value * 0.98, value, 255], (y * size + x) * 4)
      }
    }
    return data
  })
  const texture = new RawCubeTexture(scene, faces, size, Constants.TEXTUREFORMAT_RGBA, Constants.TEXTURETYPE_UNSIGNED_BYTE)
  reflectionMaps.set(scene, texture)
  return texture
}

export function createSurfaceMaterial(scene: Scene, surface: SurfaceName, color?: string, appearance: SurfaceAppearance = {}) {
  const gravel = surface === 'gravel'
  const concrete = surface === 'concrete'
  const metal = surface === 'metal'
  const tint = color ?? surfaces[surface].color
  const relief = gravel ? 2.4 : concrete ? 1.25 : metal ? 0.9 : surface === 'wood' ? 0.75 : 0.44
  const { diffuse, normal, finishMap } = createTextureSample(scene, surface, 1 / (appearance.grainSize ?? 1), (gravel ? 0.65 : concrete ? 0.35 : 0.36) * (appearance.contrast ?? 1), relief * (appearance.relief ?? 1), {
    striations: appearance.striations,
    metal: metal
      ? {
          type: appearance.metalType ?? 'steel',
          color,
          oxidation: appearance.oxidation ?? 0,
          abrasion: appearance.abrasion ?? 0.34,
        }
      : undefined,
  })
  if (gravel || concrete || metal) {
    const material = new PBRMaterial(surface, scene)
    material.albedoColor = metal ? Color3.White() : Color3.FromHexString(tint)
    material.albedoTexture = diffuse
    material.bumpTexture = normal
    material.metallic = Number(metal)
    material.roughness = metal ? 1 : gravel ? 0.97 : 0.87
    if (metal && finishMap) {
      material.reflectionTexture = studioReflection(scene)
      material.metallicTexture = finishMap
      material.useRoughnessFromMetallicTextureAlpha = false
      material.useRoughnessFromMetallicTextureGreen = true
      material.useMetallnessFromMetallicTextureBlue = true
    }
    return material
  }
  const material = createIslandMaterial(scene, surface, tint)
  material.diffuseTexture = diffuse
  material.bumpTexture = normal
  return material
}

// Recipe textures take UV coordinates in metres on the surface of the mesh.
export function createRecipeMaterial(scene: Scene, recipe: SurfaceRecipe, settings: SurfaceSettings = {}, resolution: 128 | 256 = 256) {
  const { diffuse, normal, finishMap, emissive } = createRecipeTextures(scene, recipe, settings, resolution)
  const material = new PBRMaterial(recipe.name, scene)
  material.albedoTexture = diffuse
  material.bumpTexture = normal
  material.metallic = Number(recipe.family === 'Metal')
  material.roughness = 1
  material.metallicTexture = finishMap
  material.useRoughnessFromMetallicTextureAlpha = false
  material.useRoughnessFromMetallicTextureGreen = true
  material.useMetallnessFromMetallicTextureBlue = true
  if (emissive) {
    material.emissiveTexture = emissive
    material.emissiveColor = Color3.White()
  }
  if (recipe.family === 'Metal') material.reflectionTexture = studioReflection(scene)
  return material
}
