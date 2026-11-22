import { canBoardSkiff, inSkiff } from '../src/actions.ts'
import { heldItem } from '../src/interactions/cargo.ts'
import type { Snapshot } from '../src/protocol.ts'
import { walkingHeight } from '../src/terrain.ts'
import { truckPoint } from '../src/truck-pose.ts'
import { distance, offset, truckSeatSpeed } from '../src/world.ts'
import { stopPrimary, stowTool, type CrewMember } from './crew.ts'
import { updateHeldItems } from './items.ts'
import { canOccupyGround } from '../src/simulation/movement.ts'
import { skiffExit } from './skiff.ts'
import { flatbedHasSeat, learnerVehicles, nearestBoardableLearner, openLearnerSeat, seatOffset, type LearnerSeat } from '../src/learner-vehicles.ts'

const cabDoorExitLateralM = 2.1
const cabDoorExitForwardM = 0.9
const truckRearExitM = -3.8
const cabExitClearanceRadiusM = 0.45
const cabExitMinimumGroundY = -0.10
const truckBoardingRangeM = 4.5
const skiffPortSeatM = -0.44
const skiffStarboardSeatM = 0.44
const skiffSeatForwardM = 0.25
const driverSeatLateralM = -0.65
const passengerSeatLateralM = 0.65
const cabSeatHeightM = 1.05

// Where a seated rider can step out, or nothing while the ride is still moving.
function seatExit(state: Snapshot, player: Snapshot['players'][number]) {
  if (inSkiff(player.seat)) return skiffExit(state.skiff, player.seat)
  const learner = player.vehicle
  const ride = learner ? state.vehicles[learner] : state.truck
  if (Math.abs(ride.speed) > truckSeatSpeed) return
  const side = player.seat === 'driver' ? -1 : 1
  const doors = learner
    ? learnerVehicles[learner].exits.map(({ x, z }) => offset(ride, x, z))
    : [offset(state.truck, side * cabDoorExitLateralM, cabDoorExitForwardM), offset(state.truck, 0, truckRearExitM)]
  // Each rider leaves a learner vehicle by their own door first: driver left, passenger right.
  if (learner && side > 0) [doors[0], doors[1]] = [doors[1], doors[0]]
  return doors.find((point) => canOccupyGround(point, cabExitClearanceRadiusM, cabExitMinimumGroundY))
}

// Board whichever road vehicle in reach is closest: a learner vehicle or the flatbed.
function boardRoadVehicle(state: Snapshot, player: Snapshot['players'][number]) {
  const learner = nearestBoardableLearner(state.vehicles, state.players, player)
  // A full flatbed never wins over a learner vehicle with a free seat.
  const truckInReach = distance(state.truck, player) < truckBoardingRangeM && Math.abs(state.truck.speed) <= truckSeatSpeed && flatbedHasSeat(state.players)
  if (learner && (!truckInReach || distance(state.vehicles[learner], player) < distance(state.truck, player))) {
    const seat = openLearnerSeat(state.players, learner)
    if (seat) Object.assign(player, { seat, vehicle: learner })
    return
  }
  if (!truckInReach) return
  const flatbedSeat = (seat: LearnerSeat) => state.players.some((entry) => entry.seat === seat && !entry.vehicle)
  player.vehicle = undefined
  if (!flatbedSeat('driver')) player.seat = 'driver'
  else if (!flatbedSeat('passenger')) player.seat = 'passenger'
}

export function toggleSeat(state: Snapshot, member: CrewMember) {
  const { player } = member
  if (player.seat) {
    const exit = seatExit(state, player)
    if (!exit) return
    player.seat = null
    player.vehicle = undefined
    stopPrimary(member)
    player.casting = null
    player.rowing = false
    Object.assign(player, exit, { y: walkingHeight(exit), grounded: true, onBed: false })
    updateHeldItems(state)
    return
  }
  if (canBoardSkiff(state, player)) {
    stopPrimary(member)
    player.casting = null
    player.seat = state.players.some((entry) => entry.seat === 'port') ? 'starboard' : 'port'
    updateRiders(state)
    return
  }
  if (!player.grounded || player.onBed || player.truckSurface || heldItem(state, player)?.kind === 'crate') return
  boardRoadVehicle(state, player)
  if (player.seat) {
    stopPrimary(member)
    stowTool(member)
  }
  updateRiders(state)
  updateHeldItems(state)
}

export function updateRiders(state: Snapshot) {
  for (const player of state.players) {
    if (!player.seat) continue
    if (inSkiff(player.seat)) {
      Object.assign(player, offset(state.skiff, player.seat === 'port' ? skiffPortSeatM : skiffStarboardSeatM, skiffSeatForwardM))
      player.heading = state.skiff.heading
      player.y = 0
      player.grounded = true
      player.onBed = false
      player.truckSurface = undefined
      player.swimming = false
      continue
    }
    const learner = player.vehicle
    const seat = learner && seatOffset(learner, player.seat)
    const ride = learner ? state.vehicles[learner] : state.truck
    if (seat) Object.assign(player, truckPoint(ride, seat.x, seat.y, seat.z))
    else Object.assign(player, truckPoint(state.truck, player.seat === 'driver' ? driverSeatLateralM : passengerSeatLateralM, 0, cabSeatHeightM))
    player.heading = ride.heading
    player.grounded = true
    player.onBed = false
    player.truckSurface = undefined
    player.swimming = false
  }
}
