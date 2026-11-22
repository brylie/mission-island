import { heldItem } from '../src/interactions/cargo.ts'
import { atJobBoard, jobs, type JobId } from '../src/jobs.ts'
import type { Player, Snapshot } from '../src/protocol.ts'

type Board = Pick<Snapshot, 'mission' | 'jobs' | 'items' | 'ferryRepair' | 'farmWork'>

const jobIds = Object.keys(jobs) as JobId[]

function boardBlocked(state: Board, player: Player) {
  if (state.mission !== 'complete') return 'starter-mission'
  if (state.jobs.active) return 'active-order'
  if (!atJobBoard(player) || player.sleeping) return 'away-from-board'
  if (heldItem(state, player)) return 'hands-full'
  if (state.farmWork.barrow?.handler === player.id) return 'handling-barrow'
}

function timberOnTheWay(state: Board, id: JobId) {
  return state.ferryRepair.haul > 0 && jobs[id].kind === 'delivery'
}

export function jobBlocked(state: Board, player: Player, id: JobId) {
  return boardBlocked(state, player) ?? (timberOnTheWay(state, id) ? 'timber-haul' : undefined)
}

export function availableJobs(state: Board, player: Player) {
  return boardBlocked(state, player) ? [] : jobIds.filter((id) => !timberOnTheWay(state, id))
}

export type JobBlock = NonNullable<ReturnType<typeof jobBlocked>>
