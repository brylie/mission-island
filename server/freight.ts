import { atFreightBay, crateDriverXp, dispatchBay, emptyTicket, haulerUnlockXp, hopperBay, oreContracts, parkedHauler } from '../src/ore-contracts.ts'
import type { DriverStatus, FreightAction, FreightTicket, FreightOrder } from '../src/ore-contracts.ts'
import { advanceHauler, type HaulPose, type HaulStep } from '../src/simulation/ore-truck.ts'
import type { Item, Player, Snapshot } from '../src/protocol.ts'
import { crateStarts, distance } from '../src/world.ts'
import type { createCrewRoster } from './crew.ts'
import { millisecondsPerSecond } from './host-time.ts'

const minimumDrivingDistanceM = 0.001
const drivingCatchUpMs = 2200
const driverClockLeadMs = 100
const freightBayAllowanceM = 8
const fastestTransitSpeedMps = 22
const movingCabTimeoutMs = 3000
const stoppedCabSpeedMps = 0.15

export function createFreight(crew: Pick<ReturnType<typeof createCrewRoster>, 'profile' | 'profiles'>, state: Pick<Snapshot, 'crewCoins'>, clock: () => number, checkpoint?: () => void) {
  // A crate must travel on the bed before its delivery qualifies. Keep the
  // distance with the driver so a teammate can unload it after they disconnect.
  const qualifyingMetres = 8
  function recordDrive(player: Player, items: Item[], metres: number) {
    if (metres <= minimumDrivingDistanceM) return
    for (const item of items) {
      if (item.kind !== 'crate' || !item.onBed || item.delivered || item.holder !== null) continue
      const distances = player.drivenCrates ??= crateStarts.map(() => 0)
      distances[item.id] = Math.min(qualifyingMetres, distances[item.id] + metres)
    }
  }
  function creditCrate(id: number) {
    for (const player of crew.profiles()) {
      if (!player.drivenCrates) continue
      if (player.drivenCrates[id] >= qualifyingMetres) player.deliveryXp = (player.deliveryXp ?? 0) + crateDriverXp
      player.drivenCrates[id] = 0
    }
  }
  function status(token: string): DriverStatus {
    const player = crew.profile(token)
    return { boarded: cabs.has(token), xp: player?.deliveryXp ?? 0, ticket: player?.freightTicket ?? emptyTicket() }
  }
  const cabs = new Map<string, { pose: HaulPose, through: number }>()
  function drive(cab: { pose: HaulPose, through: number }, steps: HaulStep[], ticket: FreightTicket) {
    // Allow normal network jitter, but never bank an idle interval as driving time.
    const now = clock()
    const elapsed = steps.reduce((sum, step) => sum + (step?.dt ?? 0) * millisecondsPerSecond, 0)
    const through = Math.max(cab.through, now - drivingCatchUpMs) + elapsed
    if (through > now + driverClockLeadMs) return 'Truck inputs arrived ahead of the host clock.'
    for (const step of steps) advanceHauler(cab.pose, step, ticket.loaded)
    cab.through = through
    const { x, z, heading } = cab.pose
    ticket.truck = { x, z, heading }
  }

  function dispatch(ticket: FreightTicket, command: FreightOrder, truck: HaulPose) {
    const order = oreContracts.find((c) => c.id === (command.action === 'accept' ? command.choice : ticket.contract))
    if (!order) return 'Choose an available contract.'
    if (command.action === 'accept') {
      if (ticket.contract || !atFreightBay(truck, dispatchBay)) return 'Collect a new ticket at the truck bay.'
      ticket.contract = order.id
    }
    else if (command.action === 'load') {
      if (ticket.loaded || !atFreightBay(truck, hopperBay)) return 'Park beside the Slatecliff hopper.'
      if (command.choice !== order.ore) return 'This ore does not match your dispatch ticket.'
      ticket.loaded = true
      ticket.loadedAt = clock()
    }
    else {
      if (!ticket.loaded || !atFreightBay(truck, order.buyer)) return 'Bring the loaded truck to the buyer.'
      if (clock() - ticket.loadedAt < (distance(hopperBay, order.buyer) - freightBayAllowanceM) / fastestTransitSpeedMps * millisecondsPerSecond) return 'The load is still in transit.'
      state.crewCoins += order.coins
      ticket.contract = null
      ticket.loaded = false
      ticket.loadedAt = 0
    }
  }

  function act(token: string, command: FreightAction) {
    const player = crew.profile(token)
    if (!player || (player.deliveryXp ?? 0) < haulerUnlockXp) return `Ore truck certification requires ${haulerUnlockXp} driver XP from Starter Island deliveries.`
    const ticket = player.freightTicket ?? emptyTicket()
    if (ticket.revision !== command.revision) return 'Your dispatch ticket has changed.'
    const cab = cabs.get(token)
    let error: string | undefined
    switch (command.action) {
      case 'board':
        if (cab && cab.pose.speed !== 0 && clock() - cab.through < movingCabTimeoutMs) return 'The truck is moving.'
        cabs.set(token, { pose: { ...parkedHauler(ticket), speed: 0 }, through: clock() })
        break
      case 'drive':
        if (!cab) return 'Board the truck first.'
        error = drive(cab, command.steps, ticket)
        break
      case 'leave':
      case 'accept':
      case 'load':
      case 'deliver':
      default:
        if (!cab) return 'Board the truck first.'
        if (Math.abs(cab.pose.speed) > stoppedCabSpeedMps) return 'Stop the truck first.'
        cab.pose.speed = 0
        if (command.action === 'leave') cabs.delete(token)
        else error = dispatch(ticket, command, cab.pose)
    }
    if (error) return error
    ticket.revision++
    player.freightTicket = ticket
    if (command.action !== 'drive') checkpoint?.()
  }
  return { recordDrive, creditCrate, status, act }
}
