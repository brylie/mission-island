import { farmActions, farmInteractions } from './farm-orders.ts'
import { ferryActions, ferryInteractions } from './ferry-repair.ts'
import { fieldActions, fieldInteractions } from './field-interactions.ts'
import { gateActions, gateInteractions } from './gate-repair.ts'
import { swellActions, swellInteractions } from './gate-swell.ts'
import { cargoActions, heldItem, floatingPickupOptions, pickupOptions, putDownOption } from './interactions/cargo.ts'
import { mergeDisjoint } from './interactions/definition.ts'
import { fireWatchActions, fireWatchInteractions } from './interactions/fire-watch.ts'
import type { InteractionChoice as Choice, InteractionOption } from './interactions/definition.ts'
import { homeActions, homeInteractions, welcomeNote } from './interactions/home.ts'
import { practiceTourActions, practiceTourInteractions } from './interactions/practice-tour.ts'
import { orderActions, orderInteractions, plotActions, plotInteractions } from './interactions/work.ts'
import { besideRange, journalInteractions, sightingActions } from './journal/sightings.ts'
import { materialsActions, materialsInteractions } from './materials-interactions.ts'
import type { Player, Snapshot } from './protocol.ts'
import { residentActions, residentInteractions } from './residents/interactions.ts'
import { distance } from './world.ts'
import { starterResidents } from './worlds/starter/residents.ts'

const actionPolicies = mergeDisjoint(
  gateActions,
  swellActions,
  ferryActions,
  residentActions,
  farmActions,
  materialsActions,
  cargoActions,
  fireWatchActions,
  practiceTourActions,
  homeActions,
  orderActions,
  plotActions,
  fieldActions,
  sightingActions,
)

export type InteractionAction = keyof typeof actionPolicies
export type InteractionChoice = Choice<InteractionAction>
export type Interaction = InteractionOption<InteractionAction>

export function isInteractionAction(action: unknown): action is InteractionAction {
  return typeof action === 'string' && Object.hasOwn(actionPolicies, action)
}

export function requiresExplicitChoice(action: InteractionAction) {
  return actionPolicies[action] !== 'default'
}

export function rechecksInHandler(action: InteractionAction) {
  return actionPolicies[action] === 'feature-recheck'
}

// The prompt, reticle and host use this order. When targets tie, the earlier option wins.
export function interactions(state: Snapshot, player: Player): Interaction[] {
  if (player.sleeping || player.seat) return []
  // A swimmer can only grab floating gear, such as a thrown ring buoy.
  if (player.swimming) return heldItem(state, player) ? [] : floatingPickupOptions(state, player)
  const held = heldItem(state, player)
  const farm = farmInteractions(state.farmWork, player, Boolean(held))
  if (state.farmWork.barrow?.handler === player.id) return farm
  const gate = gateInteractions(state, player)
  const residents = residentInteractions(starterResidents, state, player)
  const field = fieldInteractions(state, player)
  const tour = practiceTourInteractions(state, player)
  const sightings = journalInteractions(state, player).filter(({ at }) =>
    !field.some((inspection) => inspection.at.x === at?.x && inspection.at.z === at?.z))
  return [
    ...swellInteractions(state, player),
    ...gate.primary,
    ...fireWatchInteractions(state, player),
    ...(held ? [putDownOption(state, player, held)] : []),
    ...homeInteractions(state, player),
    ...farm,
    ...orderInteractions(state, player),
    ...plotInteractions(state, player),
    ...tour.first,
    ...(held ? [] : pickupOptions(state, player)),
    ...ferryInteractions(state, player),
    ...welcomeNote(state, player),
    ...materialsInteractions(state, player),
    ...gate.secondary,
    ...residents.talk,
    ...residents.accept,
    ...field,
    ...sightings,
    ...tour.last,
  ]
}

// What E does with nothing under the reticle. A journal record needs an aim, so it is never the default.
export function defaultInteraction(state: Snapshot, player: Player) {
  return interactions(state, player).find(({ action }) => action !== 'record')
}

// A journal subject the player is standing beside. It can be recorded without an aim when no other key has a use here.
export function besideSubject(state: Snapshot, player: Player) {
  return journalInteractions(state, player).find(({ at }) => at && distance(player, at) <= besideRange)
}

export function sameChoice(a: InteractionChoice, b: InteractionChoice) {
  return a.action === b.action && a.subject === b.subject && a.favor === b.favor
}
