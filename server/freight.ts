import { atFreightBay, crateDriverXp, dispatchBay, emptyTicket, haulerUnlockXp, hopperBay, oreContracts } from '../src/ore-contracts.ts'
import type { DriverStatus, FreightAction } from '../src/ore-contracts.ts'
import type { Item, Player, Snapshot } from '../src/protocol.ts'
import { crateStarts, distance } from '../src/world.ts'
import type { createCrewRoster } from './crew.ts'

export function createFreight(crew: Pick<ReturnType<typeof createCrewRoster>, 'profile' | 'profiles'>,
  state: Pick<Snapshot, 'crewCoins'>, clock: () => number, checkpoint?: () => void) {
  // A crate must travel on the bed before its delivery qualifies. Keep the
  // distance with the driver so a teammate can unload it after they disconnect.
  const qualifyingMetres = 8
  function recordDrive(player: Player, items: Item[], metres: number) {
    if (metres <= .001) return
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
    return { xp: player?.deliveryXp ?? 0, ticket: player?.freightTicket ?? emptyTicket() }
  }
  function act(token: string, command: FreightAction) {
    const player = crew.profile(token)
    if (!player || (player.deliveryXp ?? 0) < haulerUnlockXp) return `Ore truck certification requires ${haulerUnlockXp} driver XP from Starter Island deliveries.`
    const ticket = player.freightTicket ?? emptyTicket()
    if (ticket.revision !== command.revision) return 'Your dispatch ticket has changed.'
    const order = oreContracts.find(c => c.id === (command.action === 'accept' ? command.choice : ticket.contract))
    if (!order) return 'Choose an available contract.'
    if (command.action === 'accept') {
      if (ticket.contract || !atFreightBay(command, dispatchBay)) return 'Collect a new ticket at the truck bay.'
      ticket.contract = order.id
    } else if (command.action === 'load') {
      if (ticket.loaded || !atFreightBay(command, hopperBay)) return 'Park beside the Slatecliff hopper.'
      if (command.choice !== order.ore) return 'This ore does not match your dispatch ticket.'
      ticket.loaded = true
      ticket.loadedAt = clock()
    } else {
      if (!ticket.loaded || !atFreightBay(command, order.buyer)) return 'Bring the loaded truck to the buyer.'
      if (clock() - ticket.loadedAt < (distance(hopperBay, order.buyer) - 8) / 22 * 1000) return 'The load is still in transit.'
      state.crewCoins += order.coins
      ticket.contract = null
      ticket.loaded = false
      ticket.loadedAt = 0
    }
    ticket.revision++
    player.freightTicket = ticket
    checkpoint?.()
  }
  return { recordDrive, creditCrate, status, act }
}
