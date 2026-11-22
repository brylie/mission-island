import { activeJob } from '../jobs.ts'
import type { Player, Snapshot } from '../protocol.ts'
import { distance, type Point } from '../world.ts'
import type { FavorDefinition, FavorGuide, ResidentDefinition } from './definition.ts'
import { residentAt, residentAwayMessage } from './schedule.ts'
import { blankRecord, standingOf, trustTier } from './trust.ts'

type Registry = readonly ResidentDefinition[]
type Records = Pick<Snapshot, 'residents'>
const blank = blankRecord()

export function recordFor(state: Records, resident: ResidentDefinition) {
  return state.residents[resident.id] ?? blank
}

export function activeFavor(resident: ResidentDefinition, state: Records) {
  const { active } = recordFor(state, resident)
  return active === null ? undefined : resident.favors.find(({ id }) => id === active)
}

// The favor a resident is asking for right now: the first one the crew has not kept that the moment allows,
// while nothing else is under way. A favor waiting on other progress never holds back the ones after it.
export function openOffer(resident: ResidentDefinition, state: Snapshot) {
  const record = recordFor(state, resident)
  if (record.active !== null) return undefined
  return resident.favors.find((favor) => !record.kept.includes(favor.id) && (favor.available?.(state) ?? true))
}

export function isCustom(favor: FavorDefinition) {
  return 'custom' in favor.kind
}

export function conversationContext(resident: ResidentDefinition, state: Snapshot) {
  const record = recordFor(state, resident)
  return { state, tier: trustTier(record.trust), standing: standingOf(record), kept: record.kept, forgiven: record.forgiven }
}

// The resident's own greeting and advice.
export function conversationLines(resident: ResidentDefinition, state: Snapshot): [string, string] {
  return resident.conversation.lines(conversationContext(resident, state))
}

// What the resident says about a favor: the ask, the reminder, or the question about checked work with what
// the crew last found, so whoever answers knows the stakes. Custom favors speak through the resident's own lines.
export function favorLine(resident: ResidentDefinition, state: Snapshot) {
  const waiting = pendingReport(resident, state)
  if (waiting) return `${waiting.report.question} ${waiting.report.found[waiting.checked]}`
  const active = activeFavor(resident, state)
  const favor = active ?? openOffer(resident, state)
  if (!favor || isCustom(favor)) return undefined
  return active ? favor.reminder : favor.offer
}

export function residentFavorGuide(resident: ResidentDefinition, favor: FavorDefinition, state: Snapshot, player: Player): FavorGuide {
  const guide = favor.guide?.(state, player) ?? { title: favor.title, detail: favor.detail, next: favor.next }
  if (!('goods' in favor.kind) && !(favor.report && recordFor(state, resident).checked === 'sound')) return guide
  const spot = residentAt(resident.schedule, state)
  if (!spot.indoors || spot.stop !== 'home') return guide
  return { ...guide, next: `${guide.next} ${residentAwayMessage(resident)}` }
}

// Crew guide entries for every favor under way. Built from the shared snapshot, so a crewmate who joins mid-favor sees it too.
export function favorGuides(registry: Registry, state: Snapshot, player: Player): FavorGuide[] {
  return registry.flatMap((resident) => resident.favors.flatMap((favor) => {
    const listed = favor.listed?.(state) ?? recordFor(state, resident).active === favor.id
    if (!listed) return []
    return [residentFavorGuide(resident, favor, state, player)]
  }))
}

// Cargo favors wait while a crew delivery order has the crates.
function cargoFavors(registry: Registry, state: Snapshot) {
  if (activeJob(state)?.kind === 'delivery') return []
  return registry.flatMap((resident) => {
    const favor = activeFavor(resident, state)
    return favor && 'cargo' in favor.kind ? [{ resident, favor, kind: favor.kind }] : []
  })
}

export function wantsCargo(registry: Registry, state: Snapshot) {
  return cargoFavors(registry, state).length > 0
}

// The cargo favor a crate set down here would complete.
export function stagingFavor(registry: Registry, state: Snapshot, point: Point) {
  return cargoFavors(registry, state).find(({ kind }) => distance(point, kind.drop) < kind.radius)
}

// A favor waiting for the crew's word on checked work.
export function pendingReport(resident: ResidentDefinition, state: Snapshot) {
  const favor = activeFavor(resident, state)
  const { checked } = recordFor(state, resident)
  return favor?.report && checked ? { favor, report: favor.report, checked } : undefined
}
