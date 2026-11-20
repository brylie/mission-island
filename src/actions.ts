import type { Item, Player, Snapshot } from './protocol'
import { market, nearbyPlot, saleValue, seedPrice } from './farm.ts'
import { cargoSlots, crateSize, crewHomes, distance, lookout, truckBed, truckSeatSpeed } from './world.ts'
import { truckPoint } from './truck-pose.ts'
import { isNight } from './weather.ts'
import { atJobBoard, deliveryDrop, deliveryRadius, orderContribution } from './jobs.ts'

export function heldItem(state: Snapshot, player: Player) {
  return state.items.find((item) => item.holder === player.id)
}

export function nearbyItem(state: Snapshot, player: Player) {
  const delivering = deliveryDrop(state) !== undefined
  return state.items
    .filter((item) =>
      !item.delivered && item.holder === null &&
      (item.kind === 'crate' ? delivering : state.mission === 'fire') &&
      distance(item, player) < 2.7 && Math.abs(item.y - player.y) < 2.1,
    )
    .sort((a, b) => distance(a, player) - distance(b, player))[0]
}

export function freeBed(state: Snapshot) {
  return cargoSlots.find((slot) => {
    const position = truckPoint(state.truck, 0, truckBed.top + crateSize / 2, slot)
    return !state.items.some((item) => item.onBed && distance(item, position) < 0.93)
  })
}

export function byTruckBed(state: Snapshot, player: Player) {
  return distance(truckPoint(state.truck, 0, truckBed.top, truckBed.center), player) < 3.5
}

export function canSpray(state: Snapshot, player: Player, item?: Item) {
  return state.mission === 'fire' && !player.seat &&
    item?.kind === 'extinguisher'
}

export function inSkiff(seat: Player['seat']) {
  return seat === 'port' || seat === 'starboard'
}

export function canBoardSkiff(state: Snapshot, player: Player) {
  return !player.seat && player.grounded && !player.onBed && !heldItem(state, player) &&
    Math.abs(state.skiff.speed) < 0.65 && distance(state.skiff, player) < 3.3 &&
    state.players.filter((crew) => inSkiff(crew.seat)).length < 2
}

export function atHomeChest(player: Player) {
  const home = crewHomes[player.id]
  return !player.seat && player.grounded && !player.onBed && home && distance(home.chest, player) < 2
}

export function atHomeDoor(player: Player) {
  const home = crewHomes[player.id]
  if (!home || player.seat || !player.grounded || player.onBed) return false
  const { x, z, d } = home.building
  const door = { x, z: z - d / 2 - 0.55 }
  const gap = distance(player, door)
  return gap < 1.45 && gap < distance(player, home.chest)
}

export function canCast(state: Snapshot, player: Player) {
  if (player.equipped !== 'fishing-rod') return false
  if (inSkiff(player.seat)) return Math.abs(state.skiff.speed) < 0.35
  return !player.seat && player.grounded && !player.onBed && !player.swimming
}

function farmOrMarketHint(state: Snapshot, player: Player): [string, string] | undefined {
  if (player.grounded && !player.onBed && distance(player, market) < 2.25) {
    const contribution = orderContribution(state, player.goods)
    if (contribution) {
      const { goods, quantity } = contribution
      const label = goods === 'carrots' && quantity === 1 ? 'carrot' : goods
      return ['E', `Contribute ${quantity} ${label} to crew order`]
    }
    const value = saleValue(player.goods)
    if (value) return ['E / B', `Sell for ${value} coins · buy a carrot seed for ${seedPrice}`]
    return player.coins >= seedPrice ? ['B', `Buy a carrot seed for ${seedPrice} coin`] : ['', 'Sell fish or carrots to buy seeds']
  }
  const plot = player.grounded && !player.onBed ? state.farm[nearbyPlot(player)] : undefined
  if (plot === 'grass') return player.equipped === 'hoe' ? ['Left click', 'Till soil'] : ['2', 'Equip hoe']
  if (plot === 'tilled') return player.seeds ? ['E', 'Plant a carrot seed']
    : ['', player.starterSeedClaimed ? 'Buy carrot seeds at Seabrook Market' : 'Pick up a starter seed at home']
  if (plot === 'planted') return player.equipped === 'watering-can' ? ['Left click', 'Water carrots'] : ['3', 'Equip watering can']
  if (plot === 'watered') return ['', state.weather.hour > 6 && state.weather.hour < 18
    ? 'Carrots are growing' : 'Watered · growth resumes at sunrise']
  if (plot === 'ripe') return ['E', 'Harvest carrots']
}

function cargoHint(state: Snapshot, player: Player, item: Item): [string, string] {
  if (item.kind === 'extinguisher') {
    return state.mission === 'fire' && distance(player, lookout) < 5 ? ['Left click', 'Hold to spray'] : ['E', 'Set extinguisher down']
  }
  const drop = deliveryDrop(state)
  if (drop && distance(player, drop) < deliveryRadius) return ['E', 'Deliver crate']
  if (byTruckBed(state, player) && freeBed(state) !== undefined) return ['E', 'Load crate']
  return ['Left click', 'Hold to throw · E to set down']
}

export function actionHint(state: Snapshot, player: Player): [string, string] {
  if (player.sleeping) return ['E', 'Waiting for your crewmate · Cancel']
  if (player.swimming) return canBoardSkiff(state, player) ? ['F', 'Climb into skiff'] : ['WASD', 'Swim to shore']
  const fight = player.casting?.fight
  if (fight) return ['Left click', fight.pulling ? 'Fish pulling · release to ease tension' : 'Fish hooked · hold to reel']
  if (player.casting) return ['', 'Watching the bobber']
  if (inSkiff(player.seat)) {
    if (canCast(state, player)) return ['Left click', 'Hold and release to cast']
    return player.inventory.includes('fishing-rod') && !player.equipped
      ? ['1', 'Equip fishing rod'] : ['WASD', 'Paddle and steer']
  }
  if (player.seat) {
    if (Math.abs(state.truck.speed) <= truckSeatSpeed) return ['F', 'Exit truck']
    return player.seat === 'driver' ? ['Space', 'Brake to exit truck'] : ['', 'Wait for the truck to stop']
  }
  const item = heldItem(state, player)
  if (item) return cargoHint(state, player, item)
  if (isNight(state.weather.hour) && atHomeDoor(player)) return ['E', 'Turn in for the night']
  if (atHomeChest(player)) {
    if (!player.starterSeedClaimed) return ['E', player.inventory.length ? 'Collect starter carrot seed' : 'Take tools and a carrot seed']
    return ['E', player.inventory.length ? 'Store tools' : 'Take starter tools']
  }
  if (state.mission === 'complete' && !state.jobs.active && atJobBoard(player)) return ['E', 'Open the harbor job board']
  const work = farmOrMarketHint(state, player)
  if (work) return work
  const nearby = nearbyItem(state, player)
  if (nearby?.onBed) return ['E', 'Unload crate']
  if (nearby?.kind === 'crate') return ['E', 'Pick up crate']
  if (nearby?.kind === 'extinguisher') return ['E', 'Pick up extinguisher']
  if (player.grounded && !player.onBed && !player.truckSurface && distance(player, state.truck) < 4.5 &&
    Math.abs(state.truck.speed) <= truckSeatSpeed) return ['F', 'Board truck']
  if (canBoardSkiff(state, player)) return ['F', 'Board skiff']
  if (canCast(state, player)) return ['Left click', 'Hold and release to cast']
  return ['', '']
}
