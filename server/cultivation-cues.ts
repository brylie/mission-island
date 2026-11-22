import type { CultivationCue, Snapshot } from '../src/protocol.ts'

const previousCultivationCueLimit = 7

export function recordCultivation(state: Snapshot, kind: CultivationCue['kind'], plot: number, actor: number) {
  const recent = state.cultivation ?? []
  const sequence = (recent.at(-1)?.sequence ?? 0) + 1
  state.cultivation = [...recent.slice(-previousCultivationCueLimit), { sequence, kind, plot, actor }]
}
