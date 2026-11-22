import { Constants } from '@babylonjs/core/Engines/constants'
import { RawCubeTexture } from '@babylonjs/core/Materials/Textures/rawCubeTexture'
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import type { Scene } from '@babylonjs/core/scene'
import { createRecipeTextures, createTextureSample } from './assets/surface-textures'
import type { SurfaceRecipe, SurfaceSettings } from './assets/surface-recipes'
import type { MetalType } from './assets/surface-textures'
import { rgba8 } from './assets/rgba8'
import { materialDetail, studioReflectionLook, surfacePresets, surfaceTextureResolution, type SurfaceTextureResolution } from './assets/recipes/surface-sampling'

export const surfaces = surfacePresets
const glowStrength = 0.45
const cubeFaces = 6

export function createIslandMaterial(scene: Scene, name: string, color: string, glow = false) {
  const material = new StandardMaterial(name, scene)
  material.diffuseColor = Color3.FromHexString(color)
  material.specularColor = Color3.Black()
  if (glow) material.emissiveColor = material.diffuseColor.scale(glowStrength)
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
  const { resolution: size, panel, ambient, tint } = studioReflectionLook
  const faces = Array.from({ length: cubeFaces }, (_, face) => {
    const data = new Uint8Array(size * size * rgba8.stride)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const lit = face !== panel.hiddenFace && (x > panel.left && x < panel.right && y > panel.top && y < panel.bottom)
        const value = lit ? panel.brightness : ambient.floor + (face === ambient.brighterFace ? ambient.brighterAdd : ambient.standardAdd) + (size - y) * ambient.heightGradient
        data.set([value * tint.red, value * tint.green, value, rgba8.max], (y * size + x) * rgba8.stride)
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
  const relief = surface in materialDetail.relief
    ? materialDetail.relief[surface as keyof typeof materialDetail.relief]
    : materialDetail.relief.default
  const { diffuse, normal, finishMap } = createTextureSample(scene, surface, 1 / (appearance.grainSize ?? 1), (gravel ? materialDetail.contrast.gravel : concrete ? materialDetail.contrast.concrete : materialDetail.contrast.default) * (appearance.contrast ?? 1), relief * (appearance.relief ?? 1), {
    striations: appearance.striations,
    metal: metal
      ? {
          type: appearance.metalType ?? 'steel',
          color,
          oxidation: appearance.oxidation ?? 0,
          abrasion: appearance.abrasion ?? materialDetail.metalAbrasion,
        }
      : undefined,
  })
  if (gravel || concrete || metal) {
    const material = new PBRMaterial(surface, scene)
    material.albedoColor = metal ? Color3.White() : Color3.FromHexString(tint)
    material.albedoTexture = diffuse
    material.bumpTexture = normal
    material.metallic = Number(metal)
    material.roughness = metal ? materialDetail.roughness.metal : gravel ? materialDetail.roughness.gravel : materialDetail.roughness.concrete
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
export function createRecipeMaterial(scene: Scene, recipe: SurfaceRecipe, settings: SurfaceSettings = {}, resolution: SurfaceTextureResolution = surfaceTextureResolution.full) {
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
