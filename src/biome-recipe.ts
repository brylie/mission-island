// Counts describe individual patches, props or animals in a 16 m clearing.
export const codex = [
  { key: 'clover', label: 'Clover patches', group: 'Ground cover', max: 24, note: 'Hares graze the leaves. Daylight and rain help cropped patches grow back.' },
  { key: 'grass', label: 'Tall tussocks', group: 'Ground cover', max: 24, note: 'Tall blades conceal a hare from a pursuing fox.' },
  { key: 'trees', label: 'Pines', group: 'Habitat', max: 8, note: 'A hare can wait out heavy rain under the canopy.' },
  { key: 'logs', label: 'Fallen logs', group: 'Habitat', max: 8, note: 'The hollow beside a trunk offers shelter from rain and pursuit.' },
  { key: 'stones', label: 'Boulders', group: 'Habitat', max: 10, note: 'A hare can break a fox’s line of sight at the foot of a rock.' },
  { key: 'hares', label: 'Hares', group: 'Wildlife', max: 10, note: 'Seek clover, flee nearby foxes and shelter in a downpour.' },
  { key: 'foxes', label: 'Foxes', group: 'Wildlife', max: 4, note: 'Patrol until a hare is in range. At dusk and at night they range farther for prey.' },
] as const

type Counts = Record<typeof codex[number]['key'], number>
export type BiomeRecipe = Counts & { seed: number; hour: number; rain: number; ground: 'grass' | 'soil' | 'stone' }

export const presets = {
  'Meadow edge': { seed: 42, hour: 15, rain: 0, ground: 'grass', clover: 12, grass: 8, trees: 2, logs: 2, stones: 3, hares: 5, foxes: 1 },
  'Pine hollow': { seed: 73, hour: 8, rain: 75, ground: 'soil', clover: 5, grass: 3, trees: 7, logs: 4, stones: 1, hares: 3, foxes: 1 },
  'Stony heath': { seed: 115, hour: 18, rain: 0, ground: 'stone', clover: 4, grass: 9, trees: 0, logs: 1, stones: 9, hares: 4, foxes: 2 },
} satisfies Record<string, BiomeRecipe>

export function readRecipe(values: Record<string, unknown>): BiomeRecipe {
  const recipe: BiomeRecipe = { ...presets['Meadow edge'] }
  const integer = (key: keyof BiomeRecipe, max: number) => {
    const n = values[key]
    return typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(0, Math.round(n))) : Number(recipe[key])
  }
  for (const { key, max } of codex) recipe[key] = integer(key, max)
  recipe.seed = integer('seed', 9999)
  recipe.hour = integer('hour', 23)
  recipe.rain = integer('rain', 100)
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
  return JSON.stringify({ version: 1, recipe }, null, 2) + '\n'
}

export function parseRecipeFile(text: string) {
  const file: unknown = JSON.parse(text)
  if (!file || typeof file !== 'object' || !('version' in file) || file.version !== 1 ||
      !('recipe' in file) || !file.recipe || typeof file.recipe !== 'object') {
    throw new Error('Choose a version 1 biome recipe.')
  }
  const values = file.recipe as Record<string, unknown>
  const recipe = readRecipe(values)
  for (const [key, value] of Object.entries(recipe)) {
    if (value !== values[key]) throw new Error('Check the recipe value for ' + key + '.')
  }
  return recipe
}
