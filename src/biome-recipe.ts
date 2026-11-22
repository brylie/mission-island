import { coastalCodex, habitatCodex, presets, type BiomeRecipe } from './assets/recipes/biome.ts'

export { codex, habitatCodex, presets } from './assets/recipes/biome.ts'
export type { BiomeRecipe } from './assets/recipes/biome.ts'

const maxRecipeSeed = 9999
const maxRecipeHour = 23
const maxRainPercent = 100
const recipeIndentation = 2

export function readRecipe(values: Record<string, unknown>): BiomeRecipe {
  const recipe: BiomeRecipe = { ...presets['Meadow edge'] }
  const integer = (key: keyof BiomeRecipe, max: number) => {
    const n = values[key]
    return typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(0, Math.round(n))) : Number(recipe[key])
  }
  for (const { key, max } of habitatCodex) recipe[key] = integer(key, max)
  recipe.seed = integer('seed', maxRecipeSeed)
  recipe.hour = integer('hour', maxRecipeHour)
  recipe.rain = integer('rain', maxRainPercent)
  if (values.ground === 'soil' || values.ground === 'stone') recipe.ground = values.ground
  return recipe
}

export function biomeLink(base: string, recipe: BiomeRecipe) {
  const url = new URL('workbench.html#biome', base)
  url.username = url.password = ''
  url.searchParams.set('recipe', '1')
  for (const [key, value] of Object.entries(recipe)) url.searchParams.set(key, String(value))
  return url.href
}

export function recipeFromLink(params: URLSearchParams) {
  if (params.get('recipe') !== '1') return
  const values = Object.fromEntries([...params].filter(([, value]) => value.trim())
    .map(([key, value]) => [key, key === 'ground' ? value : Number(value)]))
  return readRecipe(values)
}

export function serializeRecipe(recipe: BiomeRecipe) {
  return JSON.stringify({ version: 1, recipe }, null, recipeIndentation) + '\n'
}

export function parseRecipeFile(text: string) {
  const file: unknown = JSON.parse(text)
  if (!file || typeof file !== 'object' || !('version' in file) || file.version !== 1
    || !('recipe' in file) || !file.recipe || typeof file.recipe !== 'object') {
    throw new Error('Choose a version 1 biome recipe.')
  }
  const values = file.recipe as Record<string, unknown>
  const recipe = readRecipe(values)
  for (const [key, value] of Object.entries(recipe)) {
    // Original version 1 files predate the coastal species.
    if (!(key in values) && coastalCodex.some((item) => item.key === key)) continue
    if (value !== values[key]) throw new Error('Check the recipe value for ' + key + '.')
  }
  return recipe
}
