import type { Item, Snapshot } from '../src/protocol.ts'
import type { Point } from '../src/world.ts'
import { crateSize, crateStarts, extinguisherStarts, localPoint, offset } from '../src/world.ts'

export function makeItems(): Item[] {
  return [...crateStarts, ...extinguisherStarts].map((point, id) => ({
    ...point, id, heading: 0, kind: id < crateStarts.length ? 'crate' : 'extinguisher',
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
      Object.assign(item, crate ? offset(holder, 0, 0.89) : offset(holder, -0.49, 0.59))
      item.heading = holder.heading
      item.y = holder.y + (crate ? 1.13 + winding * 0.41 : 0.24)
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
