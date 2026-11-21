export const standardSurfaceFamilies = [
  'Grass and forest ground', 'Loose aggregate', 'Sand and sediment', 'Masonry', 'Exposed rock',
  'Timber', 'Foliage', 'Metal', 'Cloth',
] as const

export const gameplaySurfaceFamilies = [
  'Ore and crystals', 'Quarries and ruins', 'Tidal traces', 'Cold ground', 'Living surfaces',
  'Flood and salvage', 'Trade and cargo', 'Road and tracks', 'Workshop residues',
] as const

export const surfaceFamilies = [...standardSurfaceFamilies, ...gameplaySurfaceFamilies] as const

type SurfaceFamily = typeof surfaceFamilies[number]

interface RecipeDefinition {
  id: string
  name: string
  family: SurfaceFamily
  seed: number
  // Feature spacing in millimetres, and the number of features per texture repeat.
  spacing: { label: string; mm: number; cells: number }
  wear: { label: string; amount: number }
  colors: [dark: string, light: string, accent: string]
  relief: number
  roughness: number
  lengthwise: number
  description: string
  emission?: string
}

export function recipe<Id extends string>(id: Id, name: string, family: SurfaceFamily, seed: number,
  spacing: [label: string, mm: number, cells: number], wear: [label: string, amount: number],
  colors: RecipeDefinition['colors'], relief: number, roughness: number, description: string, lengthwise = 1, emission?: string): RecipeDefinition & { id: Id } {
  return {
    id, name, family, seed, spacing: { label: spacing[0], mm: spacing[1], cells: spacing[2] },
    wear: { label: wear[0], amount: wear[1] }, colors, relief, roughness, description, lengthwise, emission,
  }
}
