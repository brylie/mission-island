import { blend, clamp, wrap } from '../math/noise.ts'
import { sampleSurface } from './surface-patterns.ts'
import type { SurfaceRecipe, SurfaceSettings } from './surface-recipes.ts'

export function components(hex: string) {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16))
}

export function normalMap(heights: Float32Array, size: number, strength: number, lengthwise = 1) {
  const normals = new Uint8Array(heights.length * 4)
  const heightAt = (x: number, y: number) => heights[wrap(y, size) * size + wrap(x, size)]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (heightAt(x - 1, y) - heightAt(x + 1, y)) * strength
      const dy = (heightAt(x, y - 1) - heightAt(x, y + 1)) * strength / lengthwise
      const length = Math.hypot(dx, dy, 1)
      normals.set([128 + 127 * dx / length, 128 + 127 * dy / length, 128 + 127 / length, 255], (y * size + x) * 4)
    }
  }
  return normals
}

export function bakeSurfaceMaps(recipe: SurfaceRecipe, settings: SurfaceSettings, size: number) {
  const [dark, light, accent] = [recipe.colors[0], settings.tint ?? recipe.colors[1], recipe.colors[2]].map(components)
  const sample = sampleSurface(recipe, settings)
  const heights = new Float32Array(size * size)
  const color = new Uint8Array(heights.length * 4)
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
      for (let c = 0; c < 3; c++) color[4 * i + c] = blend(blend(dark[c], light[c], clamp(tone)), accent[c], a)
      color[4 * i + 3] = 255
      if (emission && emissive) {
        const intensity = clamp(glow)
        emissive.set([emission[0] * intensity, emission[1] * intensity, emission[2] * intensity, 255], i * 4)
      }
      const roughness = recipe.roughness + (metal ? 0.55 : 0.14) * a + (1 - height) * 0.09
      const oxide = recipe.id === 'copper' || recipe.id === 'brass' ? a : 0
      finish.set([255, 255 * clamp(roughness), metal ? 255 * (1 - oxide * 0.88) : 0, 255], 4 * i)
    }
  }
  const relief = recipe.relief * (settings.relief ?? 1) * (size / 128)
  return { color, normals: normalMap(heights, size, relief, recipe.lengthwise), finish, emissive }
}
