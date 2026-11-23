import type { CrewMarkNotice, Snapshot } from './protocol.ts'
import { bearingDegrees, compassName } from './spotting.ts'
import { distance } from './world.ts'

const noticeDurationMs = 3600

function crewName(snapshot: Snapshot | undefined, playerId: number) {
  return snapshot?.players.find((player) => player.id === playerId)?.name || `Crew ${playerId + 1}`
}

// What a crewmate reads when someone else marks or clears a spot. The placer's own confirmation shows in the binoculars.
export function crewMarkFeedback(notice: CrewMarkNotice, localId: number, snapshot: Snapshot | undefined) {
  const until = performance.now() + noticeDurationMs
  if (notice.event === 'refused') return { key: '', label: notice.reason === 'reach' ? 'Too far for the rangefinder to mark' : 'Marks are placed on foot', until }
  if (notice.playerId === localId) return undefined
  const name = crewName(snapshot, notice.playerId)
  if (notice.event === 'cleared') return { key: '', label: `${name} cleared their mark`, until }
  const local = snapshot?.players.find((player) => player.id === localId)
  if (!local) return { key: '', label: `${name} marked a spot`, until }
  const degrees = bearingDegrees(local, notice)
  return { key: '', label: `${name} marked a spot · ${Math.round(distance(local, notice))} m ${compassName(degrees)}`, until }
}
