import { farmFeedback } from './farm-order-ui'
import { learnerFeedback } from './learner-feedback'
import { ferryFeedback } from './ferry-repair-ui'
import { catchLabel } from './journal-ui'
import { jobs } from './jobs'
import { materialsFeedback } from './materials-work'
import type { FishingResult, ServerMessage, Snapshot } from './protocol'
import { neighborFeedback } from './resident-notices'
import { shellglassTideAt } from './shellglass-tide'
import { starterPay } from './world'
import { wildfireFeedback } from './wildfire-card'

const fishingFeedbackDurationMs = 1900
const farmFeedbackDurationMs = 4200
const marketSaleDurationMs = 2100
const jobPaymentDurationMs = 3200
const tideFeedbackDurationMs = 3900
const retryObservationDurationMs = 1900
const materialsFeedbackDurationMs = 4800
const seedPurchaseDurationMs = 3200

const feedbackText: Record<FishingResult, [string, string]> = {
  'caught': ['+1 fish', 'Caught a fish'],
  'no-bite': ['', 'No bite'],
  'dry-cast': ['', 'Aim at open water'],
  'escaped': ['', 'The fish escaped'],
  'line-snapped': ['', 'The line snapped'],
  'boat-moving': ['', 'Let the skiff settle before casting'],
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
    case 'wildfire':
      return wildfireFeedback(incoming, localId)
    case 'crew-signal': case 'first-aid-check': case 'practice-run':
      return learnerFeedback(incoming, localId, snapshot)
    case 'starter-seed':
      return { key: '+1 seed', label: 'Plant it at Island Farm', until: performance.now() + seedPurchaseDurationMs }
    default: return neighborly
  }
}
