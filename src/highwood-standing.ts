import { onRoadsChange, roadsBaked } from './roads.ts'
import { plantFits } from './worlds/starter/highwood-clearings.ts'
import { plantRests } from './plant-seat.ts'
import { highwoodPlanting, type Planting } from './worlds/starter/highwood-planting.ts'

// The Highwood plants that stand with the island's roads. The planting bake already keeps only
// plants that fit the baked roads, so while the roads are read from the bake the list stands as
// it is. Roads graded live (a draft the Workbench is previewing, or roads saved since the last
// bake) clear their own way with the bake's own tests, `plantFits` and `plantRests`, until they are baked and
// re-planted. The forest, the walking solids and the granite outcrops' wood grid
// all read this one list, so a tree is drawn exactly where it is solid and rocks keep off it.

let standing: readonly Planting[] | undefined

export function standingPlants(): readonly Planting[] {
  standing ??= !roadsBaked() ? highwoodPlanting().filter((plant) => plantFits(plant, plant.layer) && plantRests(plant)) : highwoodPlanting()
  return standing
}
onRoadsChange(() => {
  standing = undefined
})
