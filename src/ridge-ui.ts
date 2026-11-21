import { aerialProgress, aerialSurveys, atLandingSign, atRidgeRack, aviationInteraction, nearRidgeCourse, rackBrief, type FlightResult } from './aviation'
import type { Input, Player, ServerMessage, Snapshot } from './protocol'
import { distance } from './world'
import { activeLift, aerialReceipt, bearingWord, sightingText, soaringDetail } from './soaring-guide'
import { ridgeMeadow, ridgeRack } from './worlds/starter/ridge-scout'
import { mirrorPoolWillow } from './worlds/starter/sites'

const resultText: Record<FlightResult, string> = {
  qualified: 'Crew aviation qualification earned. The Mirror Pool survey is open to either player.',
  surveyed: 'Mirror Pool survey complete. The willow observation is saved for the crew.',
  short: 'Landed short. Head uphill to the windsock to retry.',
  missed: 'Landed outside the meadow. Return to the rack to retry.',
  obstruction: 'Flight ended early. The pilot is back on reachable ground.',
  interrupted: 'Flight interrupted. The pilot can start again from reachable ground.',
  approach: 'Follow the blue approach orbs before landing in the meadow.',
  observation: 'Pass the fallen willow while airborne, then land in the meadow.',
  blocked: 'Clear the launch strip before borrowing the wing.',
  landed: 'Landed safely.',
}

export function flightInput(turn: number, pitch: number): Input {
  return { x: 0, z: 0, spray: false, careful: false, sprint: false, flightTurn: turn, flightPitch: pitch }
}

export function drawRidgeMap(state: Snapshot, dot: (x: number, z: number, color: string, radius: number) => void) {
  const { marked, flight } = state.aviation
  dot(ridgeRack.x, ridgeRack.z, '#f4b371', 4.5)
  for (const site of activeLift(state)) dot(site.x, site.z, '#d4c2ff', 3.5)
  if (state.aviation.qualified) {
    const { recorded } = aerialProgress(state)
    for (const { id, site } of aerialSurveys) if (!recorded.has(id)) dot(site.x, site.z, '#ffd58a', 2.5)
  }
  if (marked) dot(ridgeMeadow.x, ridgeMeadow.z, '#a1ffec', 6)
  else if (flight) dot(ridgeMeadow.x, ridgeMeadow.z, '#fff1bb', 3.5)
  if (flight?.outing === 'survey' && !flight.observed) dot(mirrorPoolWillow.x, mirrorPoolWillow.z, '#ffc08b', 4.5)
}

function pilotDetail(player: Player, state: Snapshot) {
  const flight = state.aviation.flight
  if (flight?.outing === 'free') return soaringDetail(state, player)
  const lift = flight?.climbing ? 'Updraft lifting the wing. ' : ''
  if (flight?.outing === 'survey' && !flight.observed) {
    return lift + 'Mirror Pool willow ' + bearingWord(player, mirrorPoolWillow) + ' · ' + Math.round(distance(player, mirrorPoolWillow))
      + ' m. Fly past the orange marker on the east bank, then land in the meadow.'
  }
  const lead = flight?.observed ? 'Willow recorded. ' : flight?.approach ? 'Approach complete. ' : 'Follow the blue approach orbs. '
  return lift + lead + 'Meadow ' + bearingWord(player, ridgeMeadow) + ' · ' + Math.round(distance(player, ridgeMeadow)) + ' m.'
}

export function ridgeActionHint(state: Snapshot, player: Player): [string, string] | undefined {
  const { flight, marked } = state.aviation
  if (flight?.pilotId === player.id) return ['A / D', 'Bank and turn · W nose down · S pull up']
  const action = aviationInteraction(state, player)
  if (action === 'mark') return marked ? ['', 'Meadow marked for the crew'] : ['E', 'Mark the meadow']
  if (action === 'launch') {
    if (flight) return ['', 'Your crewmate has the wing']
    return ['E', rackBrief(state.aviation)[0]]
  }
}

export function createRidgeHud(panel: HTMLElement) {
  const title = panel.querySelector('strong')!
  const detail = panel.querySelector('p')!
  const marker = panel.querySelector<HTMLElement>('[data-meadow]')!
  const receipt = panel.querySelector<HTMLElement>('[data-flight-result]')!
  let receiptUntil = 0
  const set = (node: HTMLElement, value: string) => {
    if (node.textContent !== value) node.textContent = value
  }
  return {
    receive(notice: Extract<ServerMessage, { type: 'flight-result' | 'aerial-sighting' }>) {
      if (notice.type === 'aerial-sighting') {
        receiptUntil = performance.now() + 4200
        set(receipt, sightingText(notice.id))
        return
      }
      const { result, aerial = [], recorded = 0 } = notice
      receiptUntil = performance.now() + (aerial.length ? 9000 : 6800)
      const survey = aerial.length ? ' ' + aerialReceipt(aerial, recorded) : ''
      set(receipt, result === 'blocked' ? resultText[result] : resultText[result] + survey + ' Wing returned to Windstone Ridge.')
    },
    update(state: Snapshot, player: Player | undefined) {
      const { flight, marked, qualified, surveyed } = state.aviation
      const flying = player !== undefined && flight?.pilotId === player.id
      receipt.hidden = (Boolean(flight) && !flying) || performance.now() >= receiptUntil
      panel.hidden = !player || (!flight && !marked && receipt.hidden && !nearRidgeCourse(player))
      if (panel.hidden || !player) return
      marker.hidden = !marked
      set(title, flying && flight?.outing === 'survey'
        ? 'Mirror Pool survey'
        : flying && flight?.outing === 'free'
          ? 'Island survey flight'
          : qualified ? 'Crew aviation qualified' : 'Windstone Ridge checkout')
      if (flying) set(detail, pilotDetail(player, state))
      else if (atRidgeRack(player) && !flight) {
        set(detail, rackBrief({ qualified, surveyed })[1])
      }
      else if (atLandingSign(player)) set(detail, 'Use the landing sign to mark the meadow for both players.')
      else if (flight) set(detail, 'One crew member is flying. You can mark the landing meadow from its sign.')
      else set(detail, 'Head uphill toward the windsock and loan rack.')
    },
  }
}
