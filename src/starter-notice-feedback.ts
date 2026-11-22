import { farmFeedback } from './farm-order-ui'
import { ferryFeedback } from './ferry-repair-ui'
import { catchLabel } from './journal-ui'
import { jobs } from './jobs'
import { careerUnlockXp, drivingCareers, practiceStopXp } from './learner-vehicles'
import { materialsFeedback } from './materials-work'
import type { FishingResult, ServerMessage, Snapshot } from './protocol'
import { neighborFeedback } from './resident-notices'
import { shellglassTideAt } from './shellglass-tide'
import { starterPay } from './world'

const fishingFeedbackDurationMs = 1900
const farmFeedbackDurationMs = 4200
const marketSaleDurationMs = 2100
const jobPaymentDurationMs = 3200
const tideFeedbackDurationMs = 3900
const retryObservationDurationMs = 1900
const materialsFeedbackDurationMs = 4800
const seedPurchaseDurationMs = 3200
const practiceRunDurationMs = 3600
const rescueFeedbackDurationMs = 4200
const qualificationDurationMs = 6000

const feedbackText: Record<FishingResult, [string, string]> = {
  'caught': ['+1 fish', 'Caught a fish'],
  'no-bite': ['', 'No bite'],
  'dry-cast': ['', 'Aim at open water'],
  'escaped': ['', 'The fish escaped'],
  'line-snapped': ['', 'The line snapped'],
  'boat-moving': ['', 'Let the skiff settle before casting'],
}

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
function rescueFeedback(incoming: Extract<ServerMessage, { type: 'crew-signal' | 'first-aid-check' }>, localId: number, snapshot: Snapshot | undefined) {
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

export function starterNoticeFeedback(incoming: ServerMessage, localId: number, snapshot: Snapshot | undefined) {
  const neighborly = neighborFeedback(incoming, localId, performance.now())
  switch (incoming.type) {
    case 'fishing-result': {
      const [key, label] = feedbackText[incoming.result]
      return { key, label: catchLabel(incoming.fish) ?? label, until: performance.now() + fishingFeedbackDurationMs }
    }
    case 'farm-pay': case 'barrow-returned':
      return { ...farmFeedback(incoming), until: performance.now() + farmFeedbackDurationMs }
    case 'market-sale':
      return { key: `+${incoming.coins} coins`, label: 'Market sale · Crew bank', until: performance.now() + marketSaleDurationMs }
    case 'job-pay': {
      return { key: `+${incoming.coins} coins`, label: `${starterPay[incoming.job].label} · Crew bank`, until: performance.now() + jobPaymentDurationMs }
    }
    case 'tide-staff':
      return { key: '', label: `Shellglass Tide Pool · ${shellglassTideAt(incoming.time).phase}`, until: performance.now() + tideFeedbackDurationMs }
    case 'field-unavailable':
      return { key: '', label: 'Find a clear view of the subject and try again', until: performance.now() + retryObservationDurationMs }
    case 'ferry-progress': case 'ferry-order': case 'ferry-stage': return ferryFeedback(incoming, snapshot)
    case 'materials-step':
      return { key: '', label: materialsFeedback(incoming), until: performance.now() + materialsFeedbackDurationMs }
    case 'order-pay':
      return { key: `+${incoming.coins} coins`, label: `${jobs[incoming.id].title} complete · Crew bank`, until: performance.now() + jobPaymentDurationMs }
    case 'crew-signal': case 'first-aid-check':
      return { key: '', label: rescueFeedback(incoming, localId, snapshot), until: performance.now() + rescueFeedbackDurationMs }
    case 'practice-run': {
      const { name } = drivingCareers[incoming.career]
      // The crewmate who was not driving still sees the run finish and the stop move on.
      if (incoming.playerId !== localId) {
        const driver = snapshot?.players.find((player) => player.id === incoming.playerId)
        const who = driver?.name || `Crew ${incoming.playerId + 1}`
        return { key: '', label: `${who} stopped at ${incoming.stop} · +${practiceStopXp} ${name}`, until: performance.now() + practiceRunDurationMs }
      }
      return incoming.qualified
        ? { key: `+${practiceStopXp} XP`, label: `${name} qualified · ready for Saltwind driving jobs`, until: performance.now() + qualificationDurationMs }
        : { key: `+${practiceStopXp} XP`, label: `${incoming.stop} · ${name} ${incoming.xp}/${careerUnlockXp}`, until: performance.now() + practiceRunDurationMs }
    }
    case 'starter-seed':
      return { key: '+1 seed', label: 'Plant it at Island Farm', until: performance.now() + seedPurchaseDurationMs }
    default: return neighborly
  }
}
