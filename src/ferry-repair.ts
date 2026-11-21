import { plank } from './gate-repair.ts'
import type { InteractionOption, InteractionPolicies } from './interactions/definition.ts'
import { deliveryDrop, secondIslandGoal } from './jobs.ts'
import type { Item, Player, Snapshot } from './protocol.ts'
import { walkingHeight } from './terrain.ts'
import { crewHomes, distance, ferryTerminal, spawns } from './world.ts'
import type { Point } from './world.ts'
import { rampDeck, tallyBoard, timberStack, yardDrop } from './worlds/starter/ferry-terminal.ts'

// The ferry terminal is the crew's first community project. Each stage asks for coins from the crew bank and
// timber hauled from Seabrook. The amounts are trial values for the balance playtest (#52), not settled prices.
export const ferryStages = [
  { id: 'brace', title: 'Brace the landing', coins: 12, crates: 2 },
  { id: 'deck', title: 'Lay the new deck', coins: 12, crates: 2 },
  { id: 'open', title: 'Open the ramp', coins: 12, crates: 2 },
] as const
const donationStep = 5
const tallyRadius = 2.6

// One ledger per started stage. Each array is indexed by crew slot, so the tally can name who gave what.
export interface FerryLedger { coins: number[], crates: number[] }
export interface FerryRepair { stage: number, ledger: FerryLedger[], haul: number, restoredAt?: number }

export const ferryActions = {
  'ferry-order': 'explicit',
  'ferry-donate': 'explicit',
  'ferry-tally': 'default',
} as const satisfies InteractionPolicies
export type FerryAction = keyof typeof ferryActions

export function emptyLedger(): FerryLedger {
  return { coins: spawns.map(() => 0), crates: spawns.map(() => 0) }
}

export function initialFerryRepair(): { ferryRepair: FerryRepair } {
  return { ferryRepair: { stage: 0, ledger: [emptyLedger()], haul: 0 } }
}

type ProjectState = Pick<Snapshot, 'ferryRepair' | 'jobs' | 'mission'>
const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0)

export function ferryServiceRestored({ ferryRepair }: Pick<Snapshot, 'ferryRepair'>) {
  return ferryRepair.stage >= ferryStages.length
}

// Until service is restored the striped barrier closes the lane. Afterwards the barrier arm is raised and the new
// deck carries the crew and the flatbed out to the berth.
const { x: laneX, z: barrierZ, width: laneWidth } = ferryTerminal
export const barrierSolids = [plank({ x: laneX - laneWidth / 2, z: barrierZ }, { x: laneX + laneWidth / 2, z: barrierZ }, 0.24, 1.12)]
const deckStep = (rampDeck.near - rampDeck.far) / rampDeck.segments
export const deckSolids = Array.from({ length: rampDeck.segments }, (_, i) => {
  const from = { x: laneX, z: rampDeck.near - i * deckStep }
  const top = rampDeck.nearTop + (rampDeck.farTop - rampDeck.nearTop) * (i + 0.5) / rampDeck.segments
  return { ...plank(from, { x: laneX, z: from.z - deckStep }, laneWidth, 0), floor: top - 0.3, top }
})

export function ferrySolids(state: Pick<Snapshot, 'ferryRepair'>) {
  return ferryServiceRestored(state) ? deckSolids : barrierSolids
}

// The restored deck's surface, for anything that reads height directly rather than through the solids.
export function deckTop({ x, z }: Point) {
  if (Math.abs(x - laneX) > laneWidth / 2 || z > rampDeck.near || z < rampDeck.far) return -Infinity
  const segment = Math.min(rampDeck.segments - 1, Math.floor((rampDeck.near - z) / deckStep))
  return deckSolids[segment].top
}

// Four finished harbor orders introduce the repair. The count is the crew's existing readiness milestone.
export function ferryProjectOpen(state: Pick<Snapshot, 'jobs' | 'mission'>) {
  return state.mission === 'complete' && state.jobs.completed >= secondIslandGoal
}

export function stageNeeds({ ferryRepair }: Pick<Snapshot, 'ferryRepair'>) {
  const stage = ferryStages[ferryRepair.stage]
  const ledger = ferryRepair.ledger[ferryRepair.stage]
  if (!stage || !ledger) return undefined
  const coinsGiven = sum(ledger.coins), cratesGiven = sum(ledger.crates)
  return { ...stage, number: ferryRepair.stage + 1, coinsGiven, cratesGiven, coinsLeft: stage.coins - coinsGiven, cratesLeft: stage.crates - cratesGiven }
}

export function donationAmount(state: ProjectState & Pick<Snapshot, 'crewCoins'>) {
  const needs = ferryProjectOpen(state) ? stageNeeds(state) : undefined
  return needs ? Math.max(0, Math.min(donationStep, needs.coinsLeft, state.crewCoins)) : 0
}

// Timber rides in the depot crates, so an order waits until no delivery uses them and none is in anyone's hands.
export function canOrderTimber(state: ProjectState & Pick<Snapshot, 'items'>) {
  const needs = ferryProjectOpen(state) ? stageNeeds(state) : undefined
  return Boolean(needs && needs.cratesLeft > 0) && state.ferryRepair.haul === 0 && deliveryDrop(state) === undefined
    && state.items.every((item) => item.kind !== 'crate' || (item.delivered && item.holder === null))
}

function timberCrates(state: Pick<Snapshot, 'ferryRepair' | 'items'>) {
  return state.ferryRepair.haul > 0 ? state.items.filter((item) => item.kind === 'crate' && !item.delivered) : []
}

// A timber crate set down at the yard stack counts toward the current stage.
export function ferryDrop(state: Pick<Snapshot, 'ferryRepair'>, player: Point, item: Pick<Item, 'kind' | 'delivered'>) {
  return item.kind === 'crate' && !item.delivered && state.ferryRepair.haul > 0 && distance(player, yardDrop) < yardDrop.radius
}

function standing(player: Player) {
  return player.grounded && !player.seat && !player.onBed && !player.swimming && !player.sleeping && !player.truckSurface
}

export function crewName(state: Pick<Snapshot, 'players'>, slot: number) {
  return state.players.find((player) => player.id === slot)?.name.trim() || crewHomes[slot]?.name || `Crewmate ${slot + 1}`
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

function boardPoint(dx: number, height: number) {
  const point = { x: tallyBoard.x + dx, z: tallyBoard.z }
  return { x: point.x, y: walkingHeight(point) + height, z: point.z }
}

// The tally board has three things to aim at: the board itself, the coin box and the order slip.
export function ferryInteractions(state: ProjectState & Pick<Snapshot, 'crewCoins' | 'items'>, player: Player): InteractionOption<FerryAction>[] {
  if (!standing(player) || distance(player, tallyBoard) >= tallyRadius) return []
  const options: InteractionOption<FerryAction>[] = []
  const needs = stageNeeds(state)
  if (needs && canOrderTimber(state)) {
    options.push({ action: 'ferry-order', key: 'E', label: `Order ${plural(needs.cratesLeft, 'timber crate')} from Seabrook`, name: 'Timber order slip', at: boardPoint(0.85, 1.15), radius: 0.35 })
  }
  const coins = donationAmount(state)
  if (needs && coins > 0) {
    options.push({ action: 'ferry-donate', key: 'E', label: `Donate ${plural(coins, 'coin')} from the crew bank (${needs.coinsGiven}/${needs.coins})`, name: 'Repair coin box', at: boardPoint(-0.85, 1.05), radius: 0.35 })
  }
  options.push({ action: 'ferry-tally', key: 'E', label: 'Read the ferry tally board', name: 'Ferry tally board', at: boardPoint(0, 1.55), radius: 0.7 })
  return options
}

function contributors(state: Pick<Snapshot, 'players'>, ledger: FerryLedger) {
  const given = spawns.map((_, slot) => slot).filter((slot) => ledger.coins[slot] || ledger.crates[slot])
    .map((slot) => `${crewName(state, slot)}: ${plural(ledger.coins[slot], 'coin')}, ${plural(ledger.crates[slot], 'timber crate')}`)
  return given.length ? given.join(' · ') : 'Nothing given yet'
}

export function ferryNextStep(state: ProjectState & Pick<Snapshot, 'items' | 'crewCoins'>) {
  if (!ferryProjectOpen(state)) {
    return state.mission === 'complete'
      ? `Finish ${plural(secondIslandGoal - state.jobs.completed, 'more harbor order')} to open the ferry repair`
      : 'Finish the starter shift, then take harbor orders'
  }
  const needs = stageNeeds(state)
  if (!needs) return 'Ferry service restored. Crossings are being arranged.'
  const { haul } = state.ferryRepair
  if (haul > 0) {
    const timber = timberCrates(state)
    if (timber.some((item) => item.onBed)) return `Drive the timber to the ferry yard and stack ${plural(haul, 'crate')} by the tally board`
    return timber.some((item) => distance(item, timberStack) < 8)
      ? `Collect ${plural(haul, 'timber crate')} from the ${timberStack.name} and haul them to the ferry yard`
      : `Stack ${plural(haul, 'timber crate')} on the ferry yard pallet by the tally board`
  }
  if (needs.cratesLeft > 0 && canOrderTimber(state)) return 'Order timber at the ferry tally board'
  if (needs.cratesLeft > 0) return 'Finish the current delivery, then order timber at the ferry tally board'
  return state.crewCoins > 0
    ? `Donate ${plural(needs.coinsLeft, 'more coin')} at the ferry tally board`
    : `Earn ${plural(needs.coinsLeft, 'coin')} for the repair, then donate at the ferry tally board`
}

export function ferryProgress(state: Pick<Snapshot, 'ferryRepair'>) {
  const needs = stageNeeds(state)
  return needs
    ? `Stage ${needs.number}/${ferryStages.length} · ${needs.coinsGiven}/${needs.coins} coins · ${needs.cratesGiven}/${needs.crates} timber`
    : 'Ferry service restored'
}

// What the tally board shows: the stage in hand, who gave what, and each finished stage with its contributors.
export function tallyLines(state: ProjectState & Pick<Snapshot, 'players' | 'items' | 'crewCoins'>) {
  if (!ferryProjectOpen(state)) {
    return { title: 'Ferry terminal · Closed for repairs', lines: [
      `The harbor posts the repair here once the crew has finished ${secondIslandGoal} harbor orders (${Math.min(state.jobs.completed, secondIslandGoal)}/${secondIslandGoal}).`,
      ferryNextStep(state),
    ] }
  }
  const { ferryRepair } = state
  const needs = stageNeeds(state)
  const done = ferryRepair.ledger.slice(0, ferryRepair.stage).map((ledger, i) => `Done · ${ferryStages[i].title} · ${contributors(state, ledger)}`)
  if (!needs) return { title: 'Ferry terminal · Service restored', lines: [...done, ferryNextStep(state)] }
  const ledger = ferryRepair.ledger[ferryRepair.stage]
  return { title: `Ferry repair · Stage ${needs.number} of ${ferryStages.length}: ${needs.title}`, lines: [
    `Coins ${needs.coinsGiven}/${needs.coins} · Timber ${needs.cratesGiven}/${needs.crates}${ferryRepair.haul ? ` · ${ferryRepair.haul} on the way` : ''}`,
    contributors(state, ledger),
    `Next: ${ferryNextStep(state)}`,
    ...done,
  ] }
}

function isCount(value: unknown, max = Infinity): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max
}

function isLedger(value: unknown): value is FerryLedger {
  if (typeof value !== 'object' || value === null) return false
  const { coins, crates } = value as Record<string, unknown>
  return [coins, crates].every((list) => Array.isArray(list) && list.length === spawns.length && list.every((entry) => isCount(entry)))
}

// Saved progress must add up: finished stages exactly met their needs, and the stage in hand has not overshot.
export function isFerryRepair(value: unknown, islandTime: number): value is FerryRepair {
  if (typeof value !== 'object' || value === null) return false
  const { stage, ledger, haul, restoredAt } = value as Record<string, unknown>
  if (!isCount(stage, ferryStages.length) || !isCount(haul, 3) || !Array.isArray(ledger) || !ledger.every(isLedger)) return false
  const restored = stage === ferryStages.length
  if (ledger.length !== (restored ? stage : stage + 1)) return false
  const met = ledger.every((entry, i) => {
    const coins = sum(entry.coins), crates = sum(entry.crates), needs = ferryStages[i]
    return i < stage ? coins === needs.coins && crates === needs.crates : coins <= needs.coins && crates + haul <= needs.crates
  })
  const timed = restored ? typeof restoredAt === 'number' && restoredAt >= 0 && restoredAt <= islandTime : restoredAt === undefined
  return met && timed && (!restored || haul === 0)
}
