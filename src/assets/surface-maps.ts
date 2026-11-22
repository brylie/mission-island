import { blend, clamp, wrap } from '../math/noise.ts'
import { surfaceMapFinish, surfaceTextureResolution } from './recipes/surface-sampling.ts'
import { rgba8 } from './rgba8.ts'
import { sampleSurface } from './surface-patterns.ts'
import type { SurfaceRecipe, SurfaceSettings } from './surface-recipes.ts'

const digitsPerChannel = 2
const greenHexStart = 1 + digitsPerChannel
const hexOffsets = [1, greenHexStart, greenHexStart + digitsPerChannel] as const
const base16 = 16
const normalCenter = 128
const normalRange = 127
const reliefBaseResolution = surfaceTextureResolution.preview

export function components(hex: string) {
  return hexOffsets.map((offset) => parseInt(hex.slice(offset, offset + digitsPerChannel), base16))
}

export function normalMap(heights: Float32Array, size: number, strength: number, lengthwise = 1) {
  const normals = new Uint8Array(heights.length * rgba8.stride)
  const heightAt = (x: number, y: number) => heights[wrap(y, size) * size + wrap(x, size)]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (heightAt(x - 1, y) - heightAt(x + 1, y)) * strength
      const dy = (heightAt(x, y - 1) - heightAt(x, y + 1)) * strength / lengthwise
      const length = Math.hypot(dx, dy, 1)
      normals.set([normalCenter + normalRange * dx / length, normalCenter + normalRange * dy / length, normalCenter + normalRange / length, rgba8.max], (y * size + x) * rgba8.stride)
    }
  }
  return normals
}

export function bakeSurfaceMaps(recipe: SurfaceRecipe, settings: SurfaceSettings, size: number) {
  const [baseColor, highlight, accentColor] = recipe.colors
  const [dark, light, accent] = [baseColor, settings.tint ?? highlight, accentColor].map(components)
  const sample = sampleSurface(recipe, settings)
  const heights = new Float32Array(size * size)
  const color = new Uint8Array(heights.length * rgba8.stride)
  const finish = new Uint8Array(color.length)
  const metal = recipe.family === 'Metal'
  const emission = recipe.emission && components(recipe.emission)
  const emissive = emission ? new Uint8Array(color.length) : null
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      const [height, tone, accentAmount = 0, glow = 0] = sample(x / size, y / size)
      const a = clamp(accentAmount)
      heights[i] = height
      for (let c = 0; c < rgba8.alpha; c++) color[rgba8.stride * i + c] = blend(blend(dark[c], light[c], clamp(tone)), accent[c], a)
      color[rgba8.stride * i + rgba8.alpha] = rgba8.max
      if (emission && emissive) {
        const intensity = clamp(glow)
        emissive.set([emission[rgba8.red] * intensity, emission[rgba8.green] * intensity, emission[rgba8.blue] * intensity, rgba8.max], i * rgba8.stride)
      }
      const roughness = recipe.roughness + (metal ? surfaceMapFinish.oxidizedRoughnessGain : surfaceMapFinish.roughAccentGain) * a + (1 - height) * surfaceMapFinish.recessRoughnessGain
      const oxide = recipe.id === 'copper' || recipe.id === 'brass' ? a : 0
      finish.set([rgba8.max, rgba8.max * clamp(roughness), metal ? rgba8.max * (1 - oxide * surfaceMapFinish.oxideMetalLoss) : 0, rgba8.max], rgba8.stride * i)
    }
  }
  const relief = recipe.relief * (settings.relief ?? 1) * (size / reliefBaseResolution)
  return { color, normals: normalMap(heights, size, relief, recipe.lengthwise), finish, emissive }
}
