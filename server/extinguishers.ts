import type { Item, Snapshot } from '../src/protocol.ts'
import { dawnsBetween } from '../src/weather.ts'
import { distance, itemStarts } from '../src/world.ts'
import { restingY } from './items.ts'

const homeToleranceM = 0.05

// At dawn the island's fire crew collects any extinguisher left lying around and refills it on its stand.
export function restockExtinguishers(state: Pick<Snapshot, 'items' | 'islandTime'>, previousTime: number) {
  if (!dawnsBetween(previousTime, state.islandTime)) return
  for (const item of state.items) {
    if (item.kind !== 'extinguisher' || item.holder !== null) continue
    const home = itemStarts[item.id].start
    if (distance(item, home) > homeToleranceM) returnToStand(item)
    item.spraying = false
    delete item.charge
  }
}

// Puts an extinguisher back on its own stand, full.
export function returnToStand(item: Item) {
  Object.assign(item, itemStarts[item.id].start, { y: restingY(item.id), heading: 0, rotation: null, spraying: false })
  delete item.charge
}
