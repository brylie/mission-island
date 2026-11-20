import type { CultivationCue, Snapshot } from '../src/protocol.ts'

export function recordCultivation(state: Snapshot, kind: CultivationCue['kind'], plot: number, actor: number) {
  const recent = state.cultivation ?? []
  const sequence = (recent.at(-1)?.sequence ?? 0) + 1
  state.cultivation = [...recent.slice(-7), { sequence, kind, plot, actor }]
}
