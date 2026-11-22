import { careerUnlockXp, drivingCareers, practiceStopXp, type LearnerNotice } from './learner-vehicles'
import type { Snapshot } from './protocol'

// On-screen feedback for practice runs and rescue gear, kept beside the
// learner fleet so the shared notice switch needs only one line for them.
const practiceRunDurationMs = 3600
const rescueFeedbackDurationMs = 4200
const qualificationDurationMs = 6000

function crewName(snapshot: Snapshot | undefined, id: number) {
  return snapshot?.players.find((player) => player.id === id)?.name || `Crew ${id + 1}`
}

const compassPoints = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'] as const
const metresRounding = 5

// How far and which way a caller is from the reader, such as "40 m north-east".
function bearing(from: { x: number, z: number }, to: { x: number, z: number }) {
  const dx = to.x - from.x, dz = to.z - from.z
  const metres = Math.max(metresRounding, Math.round(Math.hypot(dx, dz) / metresRounding) * metresRounding)
  const turn = Math.atan2(dx, dz) / (Math.PI + Math.PI)
  const point = compassPoints[(Math.round(turn * compassPoints.length) + compassPoints.length) % compassPoints.length]
  return `${metres} m ${point}`
}

// Radio calls, whistles and first aid checks, worded for who is reading them.
function rescueFeedback(incoming: Extract<LearnerNotice, { type: 'crew-signal' | 'first-aid-check' }>, localId: number, snapshot: Snapshot | undefined) {
  if (incoming.type === 'crew-signal') {
    const where = incoming.place ? ` near ${incoming.place}` : ''
    const signal = incoming.signal === 'whistle' ? 'blew a whistle' : 'radioed in'
    if (incoming.playerId === localId) return `You ${signal}${where}`
    const reader = snapshot?.players.find((player) => player.id === localId)
    const away = reader ? ` · ${bearing(reader, incoming)}` : ''
    return `${crewName(snapshot, incoming.playerId)} ${signal}${where}${away}`
  }
  const { helperId, patientId } = incoming
  if (patientId === null) return 'No crewmate close enough to check on'
  if (helperId === localId) return `You checked on ${crewName(snapshot, patientId)} · all good`
  if (patientId === localId) return `${crewName(snapshot, helperId)} checked on you · all good`
  return `${crewName(snapshot, helperId)} checked on ${crewName(snapshot, patientId)} · all good`
}

// The crewmate who was not driving still sees the run finish and the stop move on.
function practiceFeedback(incoming: Extract<LearnerNotice, { type: 'practice-run' }>, localId: number, snapshot: Snapshot | undefined) {
  const { name } = drivingCareers[incoming.career]
  const until = performance.now() + (incoming.qualified ? qualificationDurationMs : practiceRunDurationMs)
  if (incoming.playerId !== localId) return { key: '', label: `${crewName(snapshot, incoming.playerId)} stopped at ${incoming.stop} · +${practiceStopXp} ${name}`, until }
  return incoming.qualified
    ? { key: `+${practiceStopXp} XP`, label: `${name} qualified · ready for Saltwind driving jobs`, until }
    : { key: `+${practiceStopXp} XP`, label: `${incoming.stop} · ${name} ${incoming.xp}/${careerUnlockXp}`, until }
}

export function learnerFeedback(incoming: LearnerNotice, localId: number, snapshot: Snapshot | undefined) {
  if (incoming.type === 'practice-run') return practiceFeedback(incoming, localId, snapshot)
  return { key: '', label: rescueFeedback(incoming, localId, snapshot), until: performance.now() + rescueFeedbackDurationMs }
}
