export const standardSurfaceFamilies = [
  'Grass and forest ground',
  'Loose aggregate',
  'Sand and sediment',
  'Masonry',
  'Exposed rock',
  'Timber',
  'Foliage',
  'Metal',
  'Cloth',
] as const

export const gameplaySurfaceFamilies = [
  'Ore and crystals',
  'Quarries and ruins',
  'Tidal traces',
  'Cold ground',
  'Living surfaces',
  'Flood and salvage',
  'Trade and cargo',
  'Road and tracks',
  'Workshop residues',
] as const

export const surfaceFamilies = [...standardSurfaceFamilies, ...gameplaySurfaceFamilies] as const

type SurfaceFamily = typeof surfaceFamilies[number]

export interface SurfaceRecipeDefinition<Id extends string = string> {
  id: Id
  name: string
  family: SurfaceFamily
  seed: number
  // Feature spacing in millimetres, and the number of features per texture repeat.
  spacing: { label: string, mm: number, cells: number }
  wear: { label: string, amount: number }
  colors: readonly [dark: string, light: string, accent: string]
  relief: number
  roughness: number
  lengthwise?: number
  description: string
  emission?: string
}

export function recipe<Id extends string>({ description, lengthwise = 1, emission, ...definition }: SurfaceRecipeDefinition<Id>) {
  return { ...definition, description, lengthwise, emission }
}
