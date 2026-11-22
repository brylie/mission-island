import { standardSurfaceDefinitions } from './recipes/standard-surfaces.ts'
import { gameplaySurfaceRecipes } from './gameplay-surface-recipes.ts'
import { recipe } from './surface-recipe.ts'

export { gameplaySurfaceFamilies, standardSurfaceFamilies, surfaceFamilies } from './surface-recipe.ts'

const standardSurfaceRecipes = standardSurfaceDefinitions.map((definition) => recipe(definition))

export type StandardSurfaceId = typeof standardSurfaceRecipes[number]['id']

export const surfaceRecipes = [...standardSurfaceRecipes, ...gameplaySurfaceRecipes] as const
export type SurfaceRecipe = typeof surfaceRecipes[number]

export function surfaceRecipe(id: SurfaceRecipe['id']) {
  return surfaceRecipes.find((recipe) => recipe.id === id)!
}

export interface SurfaceSettings {
  spacingMm?: number
  wear?: number
  relief?: number
  tint?: string
}

const millimetresPerMetre = 1000

export function surfaceRepeatMeters(recipe: SurfaceRecipe, settings: SurfaceSettings) {
  return (settings.spacingMm ?? recipe.spacing.mm) * recipe.spacing.cells / millimetresPerMetre
}
