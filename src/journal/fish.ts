import { isNight, weatherAt } from '../weather.ts'
import { beach, distance, type Point } from '../world.ts'

// Each fish keeps to one water or one kind of weather, so a crew can work out where to cast for it.
export const fishKinds = [
  { id: 'fish:lantern-eel', name: 'Lantern eel', clue: 'Bites only after dark.' },
  { id: 'fish:rain-smelt', name: 'Rain smelt', clue: 'Rises by day while a shower is falling.' },
  { id: 'fish:channel-mackerel', name: 'Channel mackerel', clue: 'Keeps to open water. Cast from the skiff on a dry day.' },
  { id: 'fish:sand-dab', name: 'Sand dab', clue: 'Lies on the sandy bed off Driftwood Beach on a dry day.' },
  { id: 'fish:shore-perch', name: 'Shore perch', clue: 'Waits under docks and along rocky shores on a dry day.' },
] as const

export type FishId = typeof fishKinds[number]['id']

const showerRain = .5
const driftwoodWater = 24

// Which fish takes a bait that lands here and now. There is no dice roll: the same cast lands the same fish.
export function fishAt(bobber: Point, islandTime: number, fromSkiff: boolean): FishId {
  const { hour, rain } = weatherAt(islandTime)
  if (isNight(hour)) return 'fish:lantern-eel'
  if (rain >= showerRain) return 'fish:rain-smelt'
  if (fromSkiff) return 'fish:channel-mackerel'
  return distance(bobber, beach) < driftwoodWater ? 'fish:sand-dab' : 'fish:shore-perch'
}
