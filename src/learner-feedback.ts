import { careerUnlockXp, drivingCareers, learnerVehicles, practiceStopXp, type LearnerNotice, type PracticeTourSummary } from './learner-vehicles'
import type { PracticeStop } from './rescue-tour'
import type { Snapshot } from './protocol'

// On-screen feedback for practice runs and rescue gear, kept beside the
// learner fleet so the shared notice switch needs only one line for them.
const practiceRunDurationMs = 3600
const rescueFeedbackDurationMs = 4200
const qualificationDurationMs = 6000
const tourSummaryDurationMs = 9000
// Long enough to read a stop's lesson once the vehicle has stopped.
const lessonDurationMs = 9000

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

// What each viewer earned on a finished tour, themselves first, and who qualified on it.
function tourSummary(incoming: Extract<LearnerNotice, { type: 'practice-run' }>, finished: PracticeTourSummary, localId: number, snapshot: Snapshot | undefined) {
  const { name } = drivingCareers[incoming.career]
  const who = (playerId: number) => (playerId === localId ? 'you' : crewName(snapshot, playerId))
  const earned = [...finished.earned].sort((a, b) => Number(b.playerId === localId) - Number(a.playerId === localId))
    .map(({ playerId, xp }) => `${who(playerId)} earned ${xp}`)
  const qualified = finished.qualified.map((playerId) => (playerId === localId ? 'You qualified' : `${crewName(snapshot, playerId)} qualified`))
  const label = [`${finished.stops} stops`, `${earned.join(', ')} ${name} XP`, ...qualified].join(' · ')
  return { key: `${learnerVehicles[incoming.vehicle].tour.name} complete`, label, until: performance.now() + tourSummaryDurationMs }
}

// A stop's lesson shows as the vehicle stops in its ring, to driver and passenger alike.
// The last stop's notice is the tour's summary instead.
function practiceFeedback(incoming: Extract<LearnerNotice, { type: 'practice-run' }>, localId: number, snapshot: Snapshot | undefined) {
  const { name } = drivingCareers[incoming.career]
  if (incoming.finished) return tourSummary(incoming, incoming.finished, localId, snapshot)
  const stops: readonly PracticeStop[] = learnerVehicles[incoming.vehicle].stops
  const lesson = stops.find((stop) => stop.name === incoming.stop)?.lesson
  const place = lesson ? `${incoming.stop}: ${lesson}` : incoming.stop
  const until = performance.now() + (lesson ? lessonDurationMs : incoming.qualified ? qualificationDurationMs : practiceRunDurationMs)
  if (incoming.playerId !== localId) return { key: '', label: `${crewName(snapshot, incoming.playerId)} stopped at ${place} · +${practiceStopXp} ${name}`, until }
  if (incoming.qualified) return { key: `+${practiceStopXp} XP`, label: `${name} qualified · ready for Saltwind driving jobs · ${place}`, until }
  return { key: `+${practiceStopXp} XP`, label: lesson ? place : `${place} · ${name} ${incoming.xp}/${careerUnlockXp}`, until }
}

// The tour's opening line for whoever boards before its first stop, and who started a
// finished tour again.
function tourFeedback(incoming: Extract<LearnerNotice, { type: 'practice-tour' }>, localId: number, snapshot: Snapshot | undefined) {
  const { noun, tour } = learnerVehicles[incoming.vehicle]
  if (incoming.event === 'intro') return { key: tour.name, label: `${incoming.stops} stops, ${tour.route}`, until: performance.now() + lessonDurationMs }
  const who = incoming.playerId === localId ? 'You' : crewName(snapshot, incoming.playerId)
  return { key: '', label: `${who} started the ${noun} practice tour again`, until: performance.now() + practiceRunDurationMs }
}

export function learnerFeedback(incoming: LearnerNotice, localId: number, snapshot: Snapshot | undefined) {
  if (incoming.type === 'practice-run') return practiceFeedback(incoming, localId, snapshot)
  if (incoming.type === 'practice-tour') return tourFeedback(incoming, localId, snapshot)
  return { key: '', label: rescueFeedback(incoming, localId, snapshot), until: performance.now() + rescueFeedbackDurationMs }
}
