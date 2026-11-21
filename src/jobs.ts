import type { Goods } from './farm.ts'
import type { Player, Snapshot } from './protocol.ts'
import { distance, town } from './world.ts'
import type { Point } from './world.ts'

export const jobBoard = { x: -43.7, z: -16.1 }
export const deliveryRadius = 4.5
export const secondIslandGoal = 4

type Job = { title: string, quantity: number, coins: number } & (
  { kind: 'delivery', cargo: string, color: string, destination: string, drop: Point }
  | { kind: 'market', goods: keyof Goods }
)

export const jobs = {
  'farm-supplies': { kind: 'delivery', title: 'Farm supplies', cargo: 'seed crates', color: '#a9d69f', quantity: 2, coins: 6, destination: 'Island Farm', drop: { x: 24, z: -17.2 } },
  'beach-gear': { kind: 'delivery', title: 'Beach gear', cargo: 'beach gear crates', color: '#8cdaec', quantity: 3, coins: 10, destination: 'Driftwood Beach', drop: { x: 29, z: -24 } },
  'market-fish': { kind: 'market', title: 'Fresh fish order', goods: 'fish', quantity: 2, coins: 6 },
  'market-carrots': { kind: 'market', title: 'Carrot order', goods: 'carrots', quantity: 2, coins: 8 },
} satisfies Record<string, Job>

export type JobId = keyof typeof jobs
export type JobBoardState = { active: { id: JobId, progress: number } | null, completed: number }

export function isJobId(value: unknown): value is JobId {
  return typeof value === 'string' && Object.hasOwn(jobs, value)
}

export function activeJob(state: Pick<Snapshot, 'jobs'>) {
  return state.jobs.active ? jobs[state.jobs.active.id] : undefined
}

export function deliveryDrop(state: Pick<Snapshot, 'mission' | 'jobs'>) {
  if (state.mission === 'delivery') return town
  const job = activeJob(state)
  return job?.kind === 'delivery' ? job.drop : undefined
}

export function orderContribution(state: Pick<Snapshot, 'jobs'>, goods: Goods) {
  const active = state.jobs.active
  if (!active) return undefined
  const job = jobs[active.id]
  if (job.kind === 'delivery') return undefined
  const quantity = Math.min(job.quantity - active.progress, goods[job.goods])
  return quantity > 0 ? { goods: job.goods, quantity } : undefined
}

export function atJobBoard(player: Player) {
  return !player.seat && player.grounded && !player.swimming && !player.onBed && distance(player, jobBoard) < 2.8
}
