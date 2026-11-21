import { atHomeChest, atHomeDoor, byTruckBed, clothingInteraction, freeBed, heldItem } from './actions.ts'
import { fieldInteractions } from './field-interactions.ts'
import { clothingCounter, farmPlots, market, nearbyPlot, saleValue, seedPrice } from './farm.ts'
import { canPickUp, gateActions, gateHint, gateOptions, gateTarget } from './gate-repair.ts'
import { farmActions, farmInteractions, type FarmAction } from './farm-orders.ts'
import type { GateAction } from './gate-repair.ts'
import { ferryActions, ferryChoiceOnly, ferryDrop, ferryInteractions } from './ferry-repair.ts'
import type { FerryAction } from './ferry-repair.ts'
import { atJobBoard, deliveryDrop, deliveryRadius, jobBoard, orderContribution } from './jobs.ts'
import { besideRange, journalInteractions } from './journal/sightings.ts'
import type { Item, Player, Snapshot } from './protocol.ts'
import { materialsActions, materialsInteractions, type MaterialsAction } from './materials-interactions.ts'
import { stagingFavor, wantsCargo } from './residents/favors.ts'
import { residentActions, residentInteractions, type ResidentAction } from './residents/interactions.ts'
import { walkingHeight } from './terrain.ts'
import { isNight } from './weather.ts'
import { cottageDoor, crewHomes, distance, lookout } from './world.ts'
import type { Point } from './world.ts'
import { starterResidents } from './worlds/starter/residents.ts'

export type InteractionAction = GateAction | ResidentAction | FarmAction | MaterialsAction | FerryAction | 'put-down' | 'open-wardrobe' | 'open-clothing-counter' | 'sleep' | 'chest' |
  'job-board' | 'market' | 'plant' | 'harvest' | 'pick-up' | 'welcome-note' | 'record' | 'inspect-field'
export const interactionActions: readonly InteractionAction[] = [
  ...gateActions, ...residentActions, ...farmActions, ...materialsActions, ...ferryActions, 'put-down', 'open-wardrobe', 'open-clothing-counter', 'sleep', 'chest', 'job-board', 'market', 'plant',
  'harvest', 'pick-up', 'welcome-note', 'record', 'inspect-field',
]
// These change shared progress or speak for the crew, so the host runs them only when the player chose them.
export const deliberateActions: readonly InteractionAction[] = [...gateActions, ...residentActions, ...farmActions, ...materialsActions,
  ...ferryChoiceOnly, 'record', 'inspect-field']

// What E sends: an action and, for items, farm plots and residents, which one.
export interface InteractionChoice { action: InteractionAction; subject?: number }

// The shared trait every E interaction has: what it does, how the prompt names it, and,
// when it is something in the world, where the reticle can find it.
export interface Interaction extends InteractionChoice {
  key: string
  label: string
  name: string
  at?: Point & { y: number }
  radius?: number
}

function aimedAt(point: Point, height: number) {
  return { x: point.x, y: walkingHeight(point) + height, z: point.z }
}

function putDown(state: Snapshot, player: Player, item: Item): Interaction {
  const option = { action: 'put-down' as const, name: 'Ground', key: 'E' }
  if (item.kind === 'toolbox') return { ...option, label: 'Set toolbox down' }
  if (item.kind === 'extinguisher') {
    return state.mission === 'fire' && distance(player, lookout) < 5
      ? { ...option, key: 'Left click', label: 'Hold to spray' } : { ...option, label: 'Set extinguisher down' }
  }
  if (ferryDrop(state, player, item)) return { ...option, label: 'Stack timber for the ferry repair' }
  const drop = deliveryDrop(state)
  if (drop && distance(player, drop) < deliveryRadius) return { ...option, label: 'Deliver crate' }
  const staging = stagingFavor(starterResidents, state, player)
  if (staging) return { ...option, label: `Stage crate for ${staging.resident.identity.name}` }
  if (byTruckBed(state, player) && freeBed(state) !== undefined) return { ...option, label: 'Load crate' }
  return { ...option, key: 'Left click', label: 'Hold to throw · E to set down' }
}

function gateInteractions(state: Snapshot, actions: GateAction[]): Interaction[] {
  return actions.map((action) => {
    const [key, label] = gateHint(action, state)
    return { action, key, label, ...gateTarget(state, action) }
  })
}

function homeInteractions(state: Snapshot, player: Player): Interaction[] {
  const home = crewHomes[player.id]
  const options: Interaction[] = []
  const clothing = clothingInteraction(player)
  if (clothing === 'open-wardrobe') {
    options.push({ action: clothing, key: 'E', label: 'Open your wardrobe', name: 'Wardrobe', at: aimedAt(home.wardrobe, 1), radius: .6 })
  } else if (clothing) {
    options.push({ action: clothing, key: 'E', label: 'Browse the clothing counter', name: 'Clothing counter',
      at: aimedAt(clothingCounter, 1), radius: .7 })
  }
  const ownDoor = atHomeDoor(player)
  if (ownDoor && isNight(state.weather.hour)) {
    options.push({ action: 'sleep', key: 'E', label: 'Turn in for the night', name: 'Your door', at: aimedAt(cottageDoor(home), 1.2), radius: .7 })
  }
  if (!ownDoor && atHomeChest(player)) {
    const label = !player.starterSeedClaimed ? (player.inventory.length ? 'Collect starter carrot seed' : 'Take tools and a carrot seed')
      : player.inventory.length ? 'Store tools' : 'Take starter tools'
    options.push({ action: 'chest', key: 'E', label, name: 'Your tool chest', at: aimedAt(home.chest, .4), radius: .55 })
  }
  return options
}

function workInteractions(state: Snapshot, player: Player): Interaction[] {
  const options: Interaction[] = []
  if (state.mission === 'complete' && !state.jobs.active && atJobBoard(player)) {
    options.push({ action: 'job-board', key: 'E', label: 'Open the harbor job board', name: 'Harbor job board', at: aimedAt(jobBoard, 1.4), radius: .9 })
  }
  if (player.grounded && !player.onBed && distance(player, market) < 2.25) {
    const contribution = orderContribution(state, player.goods)
    const value = saleValue(player.goods)
    const label = contribution
      ? `Contribute ${contribution.quantity} ${contribution.goods === 'carrots' && contribution.quantity === 1 ? 'carrot' : contribution.goods} to crew order`
      : `Sell for ${value} coins · buy a carrot seed for ${seedPrice}`
    if (contribution || value) {
      options.push({ action: 'market', key: contribution ? 'E' : 'E / B', label, name: 'Seabrook Market', at: aimedAt(market, 1), radius: 1.2 })
    }
  }
  const plot = player.grounded && !player.onBed ? nearbyPlot(player) : -1
  const stage = state.farm[plot]
  if ((stage === 'tilled' && player.seeds) || stage === 'ripe') {
    options.push({ action: stage === 'ripe' ? 'harvest' : 'plant', subject: plot, key: 'E',
      label: stage === 'ripe' ? 'Harvest carrots' : 'Plant a carrot seed', name: 'Farm plot', at: aimedAt(farmPlots[plot], .1), radius: .8 })
  }
  return options
}

function pickups(state: Snapshot, player: Player): Interaction[] {
  const cargoWanted = wantsCargo(starterResidents, state)
  return state.items.filter((item) => canPickUp(state, item, player, cargoWanted))
    .sort((a, b) => distance(a, player) - distance(b, player))
    .map((item) => {
      const name = item.kind === 'toolbox' ? 'Toolbox' : item.kind === 'crate' ? 'Crate' : 'Extinguisher'
      const label = item.onBed ? 'Unload crate' : item.kind === 'toolbox' ? 'Pick up the toolbox' : `Pick up ${name.toLowerCase()}`
      return { action: 'pick-up' as const, subject: item.id, key: 'E', label, name,
        at: { x: item.x, y: item.y + (item.kind === 'crate' ? 0 : .25), z: item.z }, radius: item.kind === 'crate' ? .6 : .4 }
    })
}

// Every E interaction open to this player, best default first. The prompt, the reticle and the host all read this list.
export function interactions(state: Snapshot, player: Player): Interaction[] {
  if (player.sleeping || player.seat || player.swimming) return []
  const held = heldItem(state, player)
  const farm = farmInteractions(state.farmWork, player, Boolean(held))
  if (state.farmWork.barrow?.handler === player.id) return farm
  const gate = gateOptions(state, player)
  const residents = residentInteractions(starterResidents, state, player)
  const options = [...gateInteractions(state, gate.primary), ...(held ? [putDown(state, player, held)] : []),
    ...homeInteractions(state, player), ...farm, ...workInteractions(state, player), ...(held ? [] : pickups(state, player)),
    ...ferryInteractions(state, player)]
  if (atHomeDoor(player) && !isNight(state.weather.hour)) {
    options.push({ action: 'welcome-note', key: 'E', label: 'Read your welcome note', name: 'Your door',
      at: aimedAt(cottageDoor(crewHomes[player.id]), 1.2), radius: .7 })
  }
  const field = fieldInteractions(state, player)
  const sightings = journalInteractions(state, player).filter(({ at }) =>
    !field.some(inspection => inspection.at.x === at?.x && inspection.at.z === at?.z))
  return [...options, ...materialsInteractions(state, player), ...gateInteractions(state, gate.secondary),
    ...residents.talk, ...residents.accept, ...field, ...sightings]
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
  return a.action === b.action && (a.subject ?? null) === (b.subject ?? null)
}
