import type { Player, Snapshot } from './protocol.ts'
import { starterDiscoveries } from './scenery.ts'
import { groundHeight } from './terrain.ts'
import { distance, type Point } from './world.ts'
import { ridgeLandingSign, ridgeLaunch, ridgeMeadow, ridgeRack, ridgeReturn } from './worlds/starter/ridge-scout.ts'

export type AviationOuting = 'checkout' | 'survey' | 'free'
// `aerial` lists the discoveries the crew has surveyed from the air. Older saves have none.
export type AviationProgress = { qualified: boolean, surveyed: boolean, aerial?: string[] }
export type AviationState = AviationProgress & {
  marked: boolean
  flight: { pilotId: number, outing: AviationOuting, bank: number, pitch: number, climbing: boolean, approach: boolean, observed: boolean, spotted: string[] } | null
}
export type FlightResult = 'qualified' | 'surveyed' | 'short' | 'missed' | 'obstruction' | 'interrupted' | 'approach' | 'observation' | 'blocked' | 'landed'

// The rack lends the wing for the checkout, then the Mirror Pool survey, then free flights around the island.
export function nextOuting({ qualified, surveyed }: AviationProgress): AviationOuting {
  return !qualified ? 'checkout' : !surveyed ? 'survey' : 'free'
}

// Every place a player can discover on foot has an aerial survey. A qualified pilot records it by
// passing over the place with some height in hand, and the crew keeps it after a safe landing.
export const aerialSurveys: readonly { id: string, name: string, site: Point }[] = starterDiscoveries.map(({ id, name, site }) => ({ id, name, site }))
const aerialSpot = { range: 12, height: 4 }

export function aerialSighting(pilot: Point & { y: number }, already: readonly string[]) {
  if (pilot.y - groundHeight(pilot) < aerialSpot.height) return undefined
  return aerialSurveys.find(({ id, site }) => !already.includes(id) && distance(pilot, site) <= aerialSpot.range)
}

export function aerialProgress(state: Pick<Snapshot, 'aviation'>) {
  const recorded = new Set([...state.aviation.aerial ?? [], ...state.aviation.flight?.spotted ?? []])
  return { recorded, total: aerialSurveys.length, next: aerialSurveys.filter(({ id }) => !recorded.has(id)) }
}

export const surveyClue = 'Survey clue: find the fallen willow on the east bank of Mirror Pool, marked in orange.'

// What the rack tells a walker before they borrow the wing.
export function rackBrief(progress: AviationProgress): [label: string, detail: string] {
  const outing = nextOuting(progress)
  if (outing === 'checkout') {
    return ['Borrow the free wing and launch the checkout', 'Follow the blue orbs into the landing circle. Walk back uphill to the windsock if you land short.']
  }
  if (outing === 'survey') {
    return ['Borrow the free wing for the Mirror Pool survey', surveyClue + ' Fly past it, then land in the circle. Blue orbs lead the way after launch.']
  }
  const left = aerialSurveys.length - (progress.aerial?.length ?? 0)
  return ['Borrow the free wing to survey the island', left
    ? `${left} of ${aerialSurveys.length} places still need an aerial survey. Climb in the rising lights over warm ground and windward slopes, `
    + 'pass over a place you have found on foot, then land anywhere safe to record it.'
    : 'Every place on the island has an aerial survey. Fly for fun and land anywhere safe.']
}

function onFoot(player: Player) {
  return player.grounded && !player.seat && !player.onBed && !player.truckSurface && !player.swimming && !player.sleeping
}

export function atRidgeRack(player: Player) {
  return distance(player, ridgeRack) < 2.4 || distance(player, ridgeLaunch) < 2.2
}

export function atLandingSign(player: Player) {
  return distance(player, ridgeLandingSign) < 2.4
}

export function nearRidgeCourse(player: Player) {
  return [ridgeLaunch, ridgeReturn, ridgeMeadow].some((point) => distance(player, point) < 12)
}

export function aviationInteraction(state: Snapshot, player: Player) {
  if (!onFoot(player) || state.items.some((item) => item.holder === player.id)) return
  if (atLandingSign(player)) return 'mark'
  if (atRidgeRack(player)) return 'launch'
}
