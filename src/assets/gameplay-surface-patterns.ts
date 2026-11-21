import { environmentPatterns, roadPatterns } from './gameplay-surface-patterns/environment.ts'
import { geologyPatterns } from './gameplay-surface-patterns/geology.ts'
import { salvagePatterns, workshopPatterns } from './gameplay-surface-patterns/salvage.ts'
import type { GameplaySurfaceId } from './gameplay-surface-recipes.ts'
import type { Point, Sample } from './surface-pattern-tools.ts'

export const gameplayPatterns: Record<GameplaySurfaceId, (p: Point) => Sample> = {
  ...geologyPatterns,
  ...environmentPatterns,
  ...salvagePatterns,
  ...roadPatterns,
  ...workshopPatterns,
}
