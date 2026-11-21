import type { Interaction } from '../interaction-options.ts'
import type { Player, Snapshot } from '../protocol.ts'
import { walkingHeight } from '../terrain.ts'
import type { ResidentDefinition } from './definition.ts'
import { activeFavor, isCustom, openOffer, pendingReport } from './favors.ts'
import { atResident, residentAt } from './schedule.ts'

export type ResidentAction = 'talk' | 'accept-favor' | 'hand-over' | 'report-sound' | 'report-fault'
export const residentActions: readonly ResidentAction[] = ['talk', 'accept-favor', 'hand-over', 'report-sound', 'report-fault']

interface ResidentOptions { talk: Interaction[]; accept: Interaction[] }

function residentTarget(resident: ResidentDefinition, state: Snapshot) {
  const spot = residentAt(resident.schedule, state)
  return { name: resident.identity.name, at: { x: spot.x, y: walkingHeight(spot) + 1.1, z: spot.z }, radius: .55 }
}

function handOver(resident: ResidentDefinition, state: Snapshot, player: Player, subject: number): Interaction | undefined {
  const favor = activeFavor(resident, state)
  if (!favor || !('goods' in favor.kind)) return undefined
  const { goods, quantity } = favor.kind
  if (player.goods[goods] < quantity) return undefined
  const noun = goods === 'carrots' && quantity === 1 ? 'carrot' : goods
  return { action: 'hand-over', subject, key: 'E', label: `Give ${quantity} ${noun} to ${resident.identity.name}`, ...residentTarget(resident, state) }
}

// A resident never takes E away from a service: the reticle on a resident picks them, and a bare press
// near the job board or the market still uses it. A hand-in comes before talking once the player
// carries what was asked for. Agreeing has no place in the world: the conversation offers it, so the
// reticle never has to choose between two prompts on one person. The subject is the registry index.
export function residentInteractions(registry: readonly ResidentDefinition[], state: Snapshot, player: Player): ResidentOptions {
  const options: ResidentOptions = { talk: [], accept: [] }
  for (const [subject, resident] of registry.entries()) {
    if (!atResident(resident, state, player)) continue
    const { name } = resident.identity
    const talk: Interaction = { action: 'talk', subject, key: 'E', label: `Talk to ${name}`, ...residentTarget(resident, state) }
    const offer = openOffer(resident, state)
    const give = handOver(resident, state, player, subject)
    if (give) options.talk.push(give)
    options.talk.push(talk)
    if (offer && !isCustom(offer)) options.accept.push({ action: 'accept-favor', subject, key: 'E', label: `Agree to help ${name}`, name })
    // Reporting back is a choice in the conversation too: both answers are always offered side by side.
    const waiting = pendingReport(resident, state)
    if (waiting) {
      options.accept.push({ action: 'report-sound', subject, key: 'E', label: waiting.report.sound, name },
        { action: 'report-fault', subject, key: 'E', label: waiting.report.fault, name })
    }
  }
  return options
}
