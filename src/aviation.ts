import type { Player, Snapshot } from './protocol.ts'
import { distance } from './world.ts'
import { ridgeLandingSign, ridgeLaunch, ridgeMeadow, ridgeRack, ridgeReturn } from './worlds/starter/ridge-scout.ts'

export type AviationOuting = 'checkout' | 'survey'
export type AviationProgress = { qualified: boolean; surveyed: boolean }
export type AviationState = AviationProgress & {
  marked: boolean
  flight: { pilotId: number; outing: AviationOuting; bank: number; pitch: number; climbing: boolean; approach: boolean; observed: boolean } | null
}
export type FlightResult = 'qualified' | 'surveyed' | 'short' | 'missed' | 'obstruction' | 'interrupted' | 'approach' | 'observation' | 'blocked'

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
