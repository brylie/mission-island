import { gameplaySurfaceDefinitions } from './recipes/gameplay-surfaces.ts'
import { recipe } from './surface-recipe.ts'

export const gameplaySurfaceRecipes = gameplaySurfaceDefinitions.map((definition) => recipe(definition))
export type GameplaySurfaceId = typeof gameplaySurfaceRecipes[number]['id']
