import { fireWatchGeometry } from '../assets/geometry/fire-watch.ts'
import { fireFinder } from '../fire-watch.ts'
import type { Player, Snapshot } from '../protocol.ts'
import { fireWatchBaseHeight } from '../terrain.ts'
import { atFireFinder, extinguisherCharge } from '../wildfire.ts'
import { distance, extinguisherStations, type Point } from '../world.ts'
import { extinguisherStock } from '../worlds/starter/layout/places.ts'
import { heldItem } from './cargo.ts'
import type { InteractionOption, InteractionPolicies } from './definition.ts'

const stationReachM = 1.9
const stationTargetLift = 0.9
const stationTargetRadius = 0.45
const finderTargetRadius = 0.5
const deckLeewayM = 0.05

export const fireWatchActions = {
  'fire-finder': 'default',
  'refill-extinguisher': 'default',
} as const satisfies InteractionPolicies
export type FireWatchAction = keyof typeof fireWatchActions

// Every fire station refills an extinguisher, and so does the Fire Supplies stock.
const fireStations: readonly (Point & { name: string })[] = [
  ...extinguisherStations,
  { ...extinguisherStock, name: 'Fire Supplies' },
]

function nearFireStation(point: Point) {
  return fireStations.find((station) => distance(station, point) < stationReachM)
}

function fireFinderHeight() {
  return fireWatchBaseHeight() + fireWatchGeometry.deck.top
}

export function fireWatchInteractions(state: Snapshot, player: Player): InteractionOption<FireWatchAction>[] {
  const options: InteractionOption<FireWatchAction>[] = []
  if (atFireFinder(player, fireFinderHeight() - deckLeewayM)) {
    const { pedestal } = fireWatchGeometry.finder
    options.push({ action: 'fire-finder', key: 'E', label: 'Sight the fire finder', name: 'Fire finder', at: { ...fireFinder, y: fireFinderHeight() + pedestal[1] }, radius: finderTargetRadius })
  }
  const held = heldItem(state, player)
  const station = held?.kind === 'extinguisher' && extinguisherCharge(held) < 1 ? nearFireStation(player) : undefined
  if (station) {
    options.push({ action: 'refill-extinguisher', key: 'E', label: 'Refill extinguisher', name: station.name, at: { x: station.x, y: player.y + stationTargetLift, z: station.z }, radius: stationTargetRadius })
  }
  return options
}
