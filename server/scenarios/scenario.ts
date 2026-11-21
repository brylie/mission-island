import type { ScenarioSummary, TrialRun } from '../../src/live-checkpoints.ts'
import type { Player, Snapshot } from '../../src/protocol.ts'
import { walkingHeight } from '../../src/terrain.ts'
import type { Point } from '../../src/world.ts'

export interface Scenario extends ScenarioSummary {
  prepareWorld?(state: Snapshot): void
  placePlayer(player: Player, state: Snapshot, seats: TrialRun['seats']): void
  startCrew?(state: Snapshot, players: readonly Player[]): void
}

// Ground-level setups can share a walkable spawn. A scenario can also arrange seats or a swimmer directly.
export function standAt(player: Player, point: Point, heading = 0) {
  Object.assign(player, { ...point, y: walkingHeight(point), heading })
}
