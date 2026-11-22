import { aerialSighting, aviationInteraction, nextOuting, type AviationState, type FlightResult } from '../src/aviation.ts'
import type { Player, Snapshot } from '../src/protocol.ts'
import { canOccupyGround, isInsideTruck } from '../src/simulation/movement.ts'
import { landingFootRadiusM, startRidgeFlight, stepRidgeFlight } from '../src/simulation/ridge-flight.ts'
import { groundHeight } from '../src/terrain.ts'
import { distance, localPoint, offset, spawns, truckRoof, type Point, type Pose } from '../src/world.ts'
import { ridgeApproach, ridgeHeading, ridgeLandingRadius, ridgeLaunch, ridgeMeadow, ridgeReturn } from '../src/worlds/starter/ridge-scout.ts'
import { mirrorPoolWillow } from '../src/worlds/starter/sites.ts'
import { stopPrimary, stopped, stowTool, type CrewMember, type CrewNotice } from './crew.ts'
import { looseCargoTop } from './items.ts'
import type { IslandSave } from './save.ts'

const launchRecoveryBehindM = -1.5
const launchRecoveryAheadM = 1.5
const willowSurveyMinimumHeightM = 2
const willowSurveyRangeM = 7

const recoveryPoints = [ridgeLaunch, offset({ ...ridgeLaunch, heading: ridgeHeading }, 0, launchRecoveryBehindM), offset({ ...ridgeLaunch, heading: ridgeHeading }, 0, launchRecoveryAheadM), ridgeReturn, ridgeMeadow]
const meadowPose = { ...ridgeMeadow, heading: ridgeHeading }

function landedPose({ x, z, heading }: Pose) {
  return { x, z, heading, y: groundHeight({ x, z }), grounded: true, seat: null, swimming: false, onBed: false, truckSurface: undefined, reaching: false, rightHandRaised: false, throwing: false }
}

function landingResult(record: NonNullable<AviationState['flight']>, outcome: 'field' | 'early' | 'missed'): FlightResult {
  if (record.outing === 'free') return 'landed'
  if (outcome !== 'field') return outcome === 'early' ? 'short' : 'missed'
  if (record.outing === 'checkout') return record.approach ? 'qualified' : 'approach'
  return record.observed ? 'surveyed' : 'observation'
}

export function createAviation(state: Snapshot, notifyCrew: (notice: CrewNotice) => void, checkpoint?: () => void) {
  const aviation = state.aviation
  let flight: ReturnType<typeof startRidgeFlight> | undefined

  function safeGround(point: Point) {
    return canOccupyGround(point, landingFootRadiusM, 0) && !isInsideTruck(state.truck, point)
      && looseCargoTop(state.items, point, landingFootRadiusM) <= groundHeight(point)
  }

  function recoveryPose(player: Player) {
    const point = recoveryPoints.find(safeGround) ?? spawns[player.id]
    return landedPose({ ...point, heading: ridgeHeading })
  }

  function hasFlight(member: CrewMember) {
    return aviation.flight?.pilotId === member.player.id
  }

  function resetPilot(member: CrewMember) {
    stopPrimary(member)
    stowTool(member)
    member.input = stopped
    member.verticalSpeed = 0
    member.reachUntil = 0
    member.throwUntil = 0
  }

  function interact(member: CrewMember) {
    const { player } = member
    const interaction = aviationInteraction(state, player)
    if (!interaction) return false
    if (interaction === 'mark') {
      aviation.marked = true
      return true
    }
    if (aviation.flight) return true
    if (!safeGround(ridgeLaunch)) {
      member.notify?.({ type: 'flight-result', result: 'blocked', pilotId: player.id })
      return true
    }
    resetPilot(member)
    flight = startRidgeFlight()
    aviation.flight = { pilotId: player.id, outing: nextOuting(aviation), bank: 0, pitch: 0, climbing: false, approach: false, observed: false, spotted: [] }
    Object.assign(player, flight.pilot, { grounded: false, reaching: false, throwing: false, rightHandRaised: false })
    // The checkpoint uses the pilot's recovery pose while the loan is active.
    checkpoint?.()
    return true
  }

  function finish(member: CrewMember, result: FlightResult, recover: boolean) {
    const { player } = member
    const spotted = aviation.flight?.spotted ?? []
    Object.assign(player, recover ? recoveryPose(player) : landedPose(player))
    resetPilot(member)
    flight = undefined
    aviation.flight = null
    aviation.marked = false
    if (result === 'qualified') aviation.qualified = true
    if (result === 'surveyed') aviation.surveyed = true
    // Aerial surveys count only after a safe landing. A crash or an interruption loses this flight's sightings.
    const aerial = recover ? [] : spotted.filter((id) => !aviation.aerial?.includes(id))
    if (aerial.length) aviation.aerial = [...aviation.aerial ?? [], ...aerial]
    checkpoint?.()
    notifyCrew({ type: 'flight-result', result, pilotId: player.id, ...aerial.length ? { aerial, recorded: aviation.aerial?.length } : {} })
  }

  // Notes what the pilot has flown through or over so far on this flight.
  function observe(member: CrewMember, record: NonNullable<AviationState['flight']>, pilot: Point & { y: number }) {
    const { x, z } = localPoint(meadowPose, pilot)
    record.approach ||= Math.abs(x) < ridgeApproach.halfWidth && z >= ridgeApproach.start && z < -ridgeLandingRadius
    const height = pilot.y - groundHeight(pilot)
    if (record.outing === 'survey' && height >= willowSurveyMinimumHeightM && distance(pilot, mirrorPoolWillow) <= willowSurveyRangeM) record.observed = true
    const sighting = record.outing !== 'checkout' && aerialSighting(pilot, [...aviation.aerial ?? [], ...record.spotted])
    if (sighting) {
      record.spotted.push(sighting.id)
      member.notify?.({ type: 'aerial-sighting', id: sighting.id })
    }
  }

  function tick(member: CrewMember, inputFresh: boolean) {
    const record = aviation.flight
    if (!record || !flight || record.pilotId !== member.player.id) return false
    const input = inputFresh ? member.input : stopped
    stepRidgeFlight(flight, { turn: input.flightTurn ?? 0, pitch: input.flightPitch ?? 0 }, state.weather)
    const { pilot, outcome, bank, pitch, climbing } = flight
    Object.assign(member.player, pilot)
    record.bank = bank
    record.pitch = pitch
    record.climbing = climbing
    const truck = state.truck
    if (pilot.y < truck.y + truckRoof.top && isInsideTruck(truck, pilot)) finish(member, 'obstruction', true)
    else if (outcome === 'obstruction' || (outcome && !safeGround(pilot))) finish(member, 'obstruction', true)
    else if (outcome) finish(member, landingResult(record, outcome), false)
    else observe(member, record, pilot)
    return true
  }

  function interrupt(member: CrewMember) {
    if (!hasFlight(member)) return false
    finish(member, 'interrupted', true)
    return true
  }

  function groundSavedPilot(profiles: IslandSave['crew']) {
    const pilot = profiles.find(({ reserved, player }) => reserved && player.id === aviation.flight?.pilotId)
    if (pilot) Object.assign(pilot.player, recoveryPose(pilot.player))
    return profiles
  }

  return { hasFlight, interact, tick, interrupt, groundSavedPilot }
}
