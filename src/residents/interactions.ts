import type { InteractionOption, InteractionPolicies } from '../interactions/definition.ts'
import type { Player, Snapshot } from '../protocol.ts'
import { walkingHeight } from '../terrain.ts'
import type { ResidentDefinition } from './definition.ts'
import { activeFavor, isCustom, openOffer } from './favors.ts'
import { atResident, residentAt } from './schedule.ts'

export const residentActions = {
  talk: 'explicit',
  'accept-favor': 'explicit',
  'hand-over': 'explicit',
} as const satisfies InteractionPolicies
export type ResidentAction = keyof typeof residentActions

interface ResidentOptions { talk: InteractionOption<ResidentAction>[]; accept: InteractionOption<ResidentAction>[] }

function residentTarget(resident: ResidentDefinition, state: Snapshot) {
  const spot = residentAt(resident.schedule, state)
  return { name: resident.identity.name, at: { x: spot.x, y: walkingHeight(spot) + 1.1, z: spot.z }, radius: .55 }
}

function handOver(resident: ResidentDefinition, state: Snapshot, player: Player, subject: number): InteractionOption<ResidentAction> | undefined {
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
    const talk: InteractionOption<ResidentAction> = { action: 'talk', subject, key: 'E', label: `Talk to ${name}`, ...residentTarget(resident, state) }
    const offer = openOffer(resident, state)
    const give = handOver(resident, state, player, subject)
    if (give) options.talk.push(give)
    options.talk.push(talk)
    if (offer && !isCustom(offer)) options.accept.push({ action: 'accept-favor', subject, key: 'E', label: `Agree to help ${name}`, name })
  }
  return options
}
