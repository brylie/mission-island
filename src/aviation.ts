import type { Player, Snapshot } from './protocol.ts'
import { distance } from './world.ts'
import { ridgeLandingSign, ridgeLaunch, ridgeMeadow, ridgeRack, ridgeReturn } from './worlds/starter/ridge-scout.ts'

export type AviationOuting = 'checkout' | 'survey' | 'practice'
export type AviationProgress = { qualified: boolean; surveyed: boolean }
export type AviationState = AviationProgress & {
  marked: boolean
  flight: { pilotId: number; outing: AviationOuting; bank: number; pitch: number; climbing: boolean; approach: boolean; observed: boolean } | null
}
export type FlightResult = 'qualified' | 'surveyed' | 'short' | 'missed' | 'obstruction' | 'interrupted' | 'approach' | 'observation' | 'blocked' | 'practiced'

// The rack lends the wing for the checkout, then the survey, then practice flights that earn nothing more.
export function nextOuting({ qualified, surveyed }: AviationProgress): AviationOuting {
  return !qualified ? 'checkout' : !surveyed ? 'survey' : 'practice'
}

export const surveyClue = 'Survey clue: find the fallen willow on the east bank of Mirror Pool, marked in orange.'

// What the rack tells a walker before they borrow the wing.
export function rackBrief(progress: AviationProgress): [label: string, detail: string] {
  const outing = nextOuting(progress)
  if (outing === 'checkout') {
    return ['Borrow the free wing and launch the checkout',
      'Follow the blue orbs into the landing circle. Walk back uphill to the windsock if you land short.']
  }
  if (outing === 'survey') {
    return ['Borrow the free wing for the Mirror Pool survey',
      surveyClue + ' Fly past it, then land in the circle. Blue orbs lead the way after launch.']
  }
  return ['Borrow the free wing for a practice flight',
    'Survey recorded for the crew. Practice flights earn nothing more. Land in the circle to return the wing.']
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
  return [ridgeLaunch, ridgeReturn, ridgeMeadow].some(point => distance(player, point) < 12)
}

export function aviationInteraction(state: Snapshot, player: Player) {
  if (!onFoot(player) || state.items.some(item => item.holder === player.id)) return
  if (atLandingSign(player)) return 'mark'
  if (atRidgeRack(player)) return 'launch'
}
