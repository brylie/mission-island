import type { Item, Snapshot } from '../src/protocol.ts'
import type { Point } from '../src/world.ts'
import { crateSize, itemStarts, localPoint, offset } from '../src/world.ts'

export function makeItems(): Item[] {
  return itemStarts.map(({ kind, start }, id) => ({
    ...start, id, heading: 0, kind,
    holder: null, onBed: false, delivered: false, spraying: false, y: 0.04, rotation: null,
  }))
}

export function updateHeldItems(state: Pick<Snapshot, 'items' | 'players'>) {
  for (const item of state.items) {
    if (item.holder === null) continue
    const holder = state.players.find((player) => player.id === item.holder)
    if (holder) {
      const crate = item.kind === 'crate'
      const winding = crate && holder.charge?.kind === 'throw' ? holder.charge.power : 0
      // A toolbox hangs from the relaxed left hand; an extinguisher is held out front.
      const [lateral, forward, lift] = crate ? [0, 0.89, 1.13 + winding * 0.41] : item.kind === 'toolbox' ? [-0.43, 0.08, 0.36] : [-0.49, 0.59, 0.24]
      Object.assign(item, offset(holder, lateral, forward))
      item.heading = holder.heading
      item.y = holder.y + lift
    }
  }
}

export function looseCargoTop(items: Item[], point: Point, margin: number) {
  let top = -Infinity
  for (const item of items) {
    if (item.kind !== 'crate' || item.holder !== null || item.delivered || item.onBed) continue
    const local = localPoint(item, point)
    const size = crateSize / 2 + margin
    if (Math.abs(local.x) < size && Math.abs(local.z) < size) top = Math.max(top, item.y + crateSize / 2)
  }
  return top
}
