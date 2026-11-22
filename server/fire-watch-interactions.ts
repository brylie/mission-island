import { heldItem } from '../src/interactions/cargo.ts'
import type { FireWatchAction } from '../src/interactions/fire-watch.ts'
import type { Snapshot } from '../src/protocol.ts'
import type { InteractionHandlers } from './interactions.ts'
import type { createWildfire } from './wildfire.ts'

export function fireWatchInteractions(
  state: Pick<Snapshot, 'items'>,
  wildfire: Pick<ReturnType<typeof createWildfire>, 'sightFireFinder'>,
): InteractionHandlers<FireWatchAction> {
  return {
    'fire-finder': ({ player }) => wildfire.sightFireFinder(player),
    'refill-extinguisher': ({ player }) => {
      const item = heldItem(state, player)
      if (item?.kind === 'extinguisher') delete item.charge
    },
  }
}
