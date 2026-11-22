import { compactTractorColliders, compactTractorSpec } from './assets/geometry/compact-tractor.ts'
import type { CrewSignal } from './rescue-gear.ts'
import { responsePickupColliders, responsePickupSpec } from './assets/geometry/response-pickup.ts'
import { compactTractorDrive, responsePickupDrive } from './vehicles/learner-drives.ts'
import { distance, offset, type Point, type Pose } from './world.ts'
import { learnerVehicleLayout } from './worlds/starter/layout/places.ts'

// Starter Island learner vehicles. The flatbed teaches hauling; these teach the
// first driving of the emergency and farm careers. Each finished practice run
// earns the driver career XP toward Saltwind vehicles.
export const drivingCareers = {
  rescue: {
    name: 'Emergency driving',
    short: 'emergency',
    vehicle: 'the Fire and Rescue pickup at Fire Supplies',
    qualifies: 'Saltwind ambulance, fire engine and patrol car',
  },
  farming: {
    name: 'Farm machinery',
    short: 'farm machinery',
    vehicle: 'the Island Farm tractor',
    qualifies: 'Saltwind farm tractor',
  },
} as const
export type DrivingCareer = keyof typeof drivingCareers
export type DrivingXp = Partial<Record<DrivingCareer, number>>

// Host notices about practice runs and rescue gear.
export type LearnerNotice =
  | { type: 'crew-signal', signal: CrewSignal, playerId: number, x: number, z: number, place?: string }
  | { type: 'first-aid-check', helperId: number, patientId: number | null }
  | { type: 'practice-run', vehicle: LearnerVehicleId, career: DrivingCareer, stop: string, playerId: number, xp: number, qualified: boolean }

export const practiceStopXp = 10
export const careerUnlockXp = 100
// A run ends when the driver pulls up and stops inside the circle.
export const practiceStopRadiusM = 4
export const practiceStopSpeedMps = 0.6

const pickupSeatLateralM = 0.42
const pickupSeatHeightM = 0.95
const pickupSeatForwardM = 0.25
const pickupDoorLateralM = 1.75
const pickupDoorForwardM = 0.3
const pickupRearExitM = -3.4
const pickupLabelHeightM = 2.7
const tractorSeatForwardM = -0.62
const tractorSeatHeightM = 1.06
const tractorExitLateralM = 1.55
const tractorExitForwardM = -0.6
const tractorRearExitM = -2.1
const tractorLabelHeightM = 2.8
const boardingRangeM = 4
const pickupMassKg = 1100
const pickupCentreOfMassM = 0.62
const tractorMassKg = 950
const tractorCentreOfMassM = 0.7
const half = 0.5

export const learnerVehicles = {
  pickup: {
    name: responsePickupSpec.name,
    noun: 'pickup',
    career: 'rescue',
    spec: responsePickupSpec,
    drive: responsePickupDrive,
    colliders: responsePickupColliders,
    mass: pickupMassKg,
    centreOfMass: pickupCentreOfMassM,
    seats: {
      driver: { x: -pickupSeatLateralM, y: pickupSeatHeightM, z: pickupSeatForwardM },
      passenger: { x: pickupSeatLateralM, y: pickupSeatHeightM, z: pickupSeatForwardM },
    },
    exits: [
      { x: -pickupDoorLateralM, z: pickupDoorForwardM },
      { x: pickupDoorLateralM, z: pickupDoorForwardM },
      { x: 0, z: pickupRearExitM },
    ],
    labelHeight: pickupLabelHeightM,
    ...learnerVehicleLayout.pickup,
  },
  tractor: {
    name: compactTractorSpec.name,
    noun: 'tractor',
    career: 'farming',
    spec: compactTractorSpec,
    drive: compactTractorDrive,
    colliders: compactTractorColliders,
    mass: tractorMassKg,
    centreOfMass: tractorCentreOfMassM,
    // One operator seat; the tractor carries no passenger.
    seats: { driver: { x: 0, y: tractorSeatHeightM, z: tractorSeatForwardM } },
    exits: [
      { x: -tractorExitLateralM, z: tractorExitForwardM },
      { x: tractorExitLateralM, z: tractorExitForwardM },
      { x: 0, z: tractorRearExitM },
    ],
    labelHeight: tractorLabelHeightM,
    ...learnerVehicleLayout.tractor,
  },
} as const

export type LearnerVehicleId = keyof typeof learnerVehicles
export const learnerVehicleIds = Object.keys(learnerVehicles) as LearnerVehicleId[]
export type LearnerSeat = 'driver' | 'passenger'

export function seatOffset(id: LearnerVehicleId, seat: LearnerSeat) {
  const seats: Partial<Record<LearnerSeat, { x: number, y: number, z: number }>> = learnerVehicles[id].seats
  return seats[seat]
}

type Rider = { seat: string | null, vehicle?: LearnerVehicleId }

// The first free seat, driver before passenger.
export function openLearnerSeat(players: readonly Rider[], id: LearnerVehicleId) {
  const taken = (seat: LearnerSeat) => players.some((entry) => entry.vehicle === id && entry.seat === seat)
  return (['driver', 'passenger'] as const).find((seat) => seatOffset(id, seat) && !taken(seat))
}

// Whether the flatbed still has a free seat. Learner seats name their vehicle.
export function flatbedHasSeat(players: readonly Rider[]) {
  return (['driver', 'passenger'] as const).some((seat) => !players.some((entry) => entry.seat === seat && !entry.vehicle))
}

// The nearest learner vehicle that is stopped, in reach and has a free seat.
export function nearestBoardableLearner(vehicles: Record<LearnerVehicleId, Point & { speed: number }>, players: readonly Rider[], player: Point) {
  return learnerVehicleIds
    .filter((id) => distance(vehicles[id], player) < boardingRangeM && Math.abs(vehicles[id].speed) <= practiceStopSpeedMps && openLearnerSeat(players, id))
    .sort((a, b) => distance(vehicles[a], player) - distance(vehicles[b], player))[0] as LearnerVehicleId | undefined
}

const nearMissRadii = 2

// Where a learner vehicle stands against its current stop, for prompts.
export function practiceStatus(vehicle: Point & { speed: number }, stop: Point) {
  const away = distance(vehicle, stop)
  if (away <= practiceStopRadiusM) return Math.abs(vehicle.speed) <= practiceStopSpeedMps ? 'stopped' : 'rolling'
  return away <= practiceStopRadiusM * nearMissRadii ? 'close' : 'away'
}

export function practiceStop(id: LearnerVehicleId, index: number) {
  const { stops } = learnerVehicles[id]
  return stops[index % stops.length]
}

function careerXp(xp: DrivingXp | undefined, career: DrivingCareer) {
  return xp?.[career] ?? 0
}

const careers = Object.keys(drivingCareers) as DrivingCareer[]

// One sentence per career for the crew guide.
export function careerProgressText(xp: DrivingXp | undefined) {
  return careers.map((career) => {
    const { name, qualifies, vehicle } = drivingCareers[career]
    return careerQualified(xp, career)
      ? `${name}: qualified for the ${qualifies} once their Saltwind driving jobs open.`
      : `${name}: ${careerXp(xp, career)} of ${careerUnlockXp} XP toward the ${qualifies}. Each practice stop in ${vehicle} earns ${practiceStopXp} XP.`
  }).join(' ')
}

// Short wallet entries, such as "20 emergency XP".
export function careerXpLabels(xp: DrivingXp | undefined) {
  return careers.flatMap((career) => careerXp(xp, career) ? [`${careerXp(xp, career)} ${drivingCareers[career].short} XP`] : [])
}

function careerQualified(xp: DrivingXp | undefined, career: DrivingCareer) {
  return careerXp(xp, career) >= careerUnlockXp
}

// Walking crew treat each learner vehicle as a solid box around its body, in
// the same form as the gate and ferry solids.
export function learnerSolids(vehicles: Record<LearnerVehicleId, Pose & { y: number }>) {
  return learnerVehicleIds.map((id) => {
    const { width, length, height, centerZ } = learnerVehicles[id].spec
    const pose = vehicles[id]
    const { x, z } = offset(pose, 0, centerZ)
    const halfWidth = width * half, halfDepth = length * half
    return { x, z, halfWidth, halfDepth, floor: pose.y, top: pose.y + height, bound: Math.hypot(halfWidth, halfDepth), cos: Math.cos(pose.heading), sin: Math.sin(pose.heading), heading: pose.heading }
  })
}
