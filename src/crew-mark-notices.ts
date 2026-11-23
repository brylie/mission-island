import type { CrewMarkNotice, Snapshot } from './protocol.ts'
import { bearingDegrees, compassName } from './spotting.ts'
import { distance } from './world.ts'

const noticeDurationMs = 3600

const refusals = {
  'reach': 'Too far for the rangefinder to mark',
  'busy': 'Marks are placed on foot',
  'no-mark': 'No mark to clear',
} as const satisfies Record<Extract<CrewMarkNotice, { event: 'refused' }>['reason'], string>

function crewName(snapshot: Snapshot | undefined, playerId: number) {
  return snapshot?.players.find((player) => player.id === playerId)?.name || `Crew ${playerId + 1}`
}

function ownLabel(notice: Exclude<CrewMarkNotice, { event: 'refused' }>) {
  if (notice.event === 'cleared') return 'Mark cleared'
  return notice.fire ? 'Fire marked for the crew' : 'Marked for the crew'
}

// What a crewmate reads when anyone marks or clears a spot. A mark on a burning fire says so, after the fire's own notice.
export function crewMarkFeedback(notice: CrewMarkNotice, localId: number, snapshot: Snapshot | undefined) {
  const until = performance.now() + noticeDurationMs
  if (notice.event === 'refused') return { key: '', label: refusals[notice.reason], until }
  if (notice.playerId === localId) return { key: '', label: ownLabel(notice), until }
  const name = crewName(snapshot, notice.playerId)
  if (notice.event === 'cleared') return { key: '', label: `${name} cleared their mark`, until }
  const what = notice.fire ? 'marked the fire' : 'marked a spot'
  const local = snapshot?.players.find((player) => player.id === localId)
  if (!local) return { key: '', label: `${name} ${what}`, until }
  const degrees = bearingDegrees(local, notice)
  return { key: '', label: `${name} ${what} · ${Math.round(distance(local, notice))} m ${compassName(degrees)}`, until }
}
