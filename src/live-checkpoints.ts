export const checkpoints = {
  'wren-fit': 'Wren · Fit and test',
  'wren-discover': 'Wren · Discover the problem',
  'wren-morning': 'Wren · The next morning',
  'harbor-delivery': 'Harbor · Load the flatbed',
} as const

type CheckpointId = keyof typeof checkpoints
export interface TrialRun {
  checkpoint: CheckpointId
  seats: 1 | 2
  revision: number
}
export interface LiveTrial extends TrialRun {
  started: boolean
}

function isCheckpoint(value: unknown): value is CheckpointId {
  return typeof value === 'string' && Object.hasOwn(checkpoints, value)
}

export function checkpointSettings(checkpoint: unknown, count: unknown) {
  if (!isCheckpoint(checkpoint) || (count !== '1' && count !== '2')) return undefined
  const seats: 1 | 2 = count === '1' ? 1 : 2
  return { checkpoint, seats }
}
