import type { Item, Player, Snapshot } from './protocol'
import { clothingCounter, market, nearbyPlot, saleValue, seedPrice } from './farm.ts'
import { cargoSlots, cottageDoor, crateSize, crewHomes, distance, lookout, truckBed, truckSeatSpeed } from './world.ts'
import { truckPoint } from './truck-pose.ts'
import { isNight } from './weather.ts'
import { atJobBoard, deliveryDrop, deliveryRadius, orderContribution } from './jobs.ts'
import { atFisher, fisherName } from './harbor-fisher.ts'
import { gateAction, gateHint, toolboxPickable } from './gate-repair.ts'
import type { GateAction } from './gate-repair.ts'

export function heldItem(state: Pick<Snapshot, 'items'>, player: Player) {
  return state.items.find((item) => item.holder === player.id)
}

export function nearbyItem(state: Snapshot, player: Player) {
  const delivering = deliveryDrop(state) !== undefined
  return state.items
    .filter((item) =>
      !item.delivered && item.holder === null &&
      (item.kind === 'crate' ? delivering : item.kind === 'toolbox' ? toolboxPickable(state, item) : state.mission === 'fire') &&
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
  const gap = distance(player, cottageDoor(home))
  return gap < 1.45 && gap < distance(player, home.chest)
}

function canBrowseClothing(player: Player) {
  return player.grounded && !player.seat && !player.onBed && !player.swimming && !player.sleeping && !player.truckSurface
}

function atHomeWardrobe(player: Player) {
  const home = crewHomes[player.id]
  if (!home || !canBrowseClothing(player)) return false
  const gap = distance(player, home.wardrobe)
  return gap < 1.45 && gap < distance(player, cottageDoor(home))
}

export function atClothingCounter(player: Player) {
  return canBrowseClothing(player) && distance(player, clothingCounter) < 2.15
}

export function clothingInteraction(player: Player) {
  if (atHomeWardrobe(player)) return 'open-wardrobe'
  if (atClothingCounter(player) && distance(player, clothingCounter) < distance(player, market)) return 'open-clothing-counter'
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
    return state.crewCoins >= seedPrice ? ['B', `Buy a carrot seed for ${seedPrice} coin`] : ['', 'Sell fish or carrots to buy seeds']
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
  if (item.kind === 'toolbox') return ['E', 'Set toolbox down']
  if (item.kind === 'extinguisher') {
    return state.mission === 'fire' && distance(player, lookout) < 5 ? ['Left click', 'Hold to spray'] : ['E', 'Set extinguisher down']
  }
  const drop = deliveryDrop(state)
  if (drop && distance(player, drop) < deliveryRadius) return ['E', 'Deliver crate']
  if (byTruckBed(state, player) && freeBed(state) !== undefined) return ['E', 'Load crate']
  return ['Left click', 'Hold to throw · E to set down']
}

function ridingHint(state: Snapshot, player: Player): [string, string] {
  if (inSkiff(player.seat)) {
    if (canCast(state, player)) return ['Left click', 'Hold and release to cast']
    return player.inventory.includes('fishing-rod') && !player.equipped
      ? ['1', 'Equip fishing rod'] : ['WASD', 'Paddle and steer']
  }
  if (Math.abs(state.truck.speed) <= truckSeatSpeed) return ['F', 'Exit truck']
  return player.seat === 'driver' ? ['Space', 'Brake to exit truck'] : ['', 'Wait for the truck to stop']
}

export function actionHint(state: Snapshot, player: Player): [string, string] {
  if (player.sleeping) return ['E', 'Waiting for your crewmate · Cancel']
  if (player.swimming) return canBoardSkiff(state, player) ? ['F', 'Climb into skiff'] : ['WASD', 'Swim to shore']
  const fight = player.casting?.fight
  if (fight) return ['Left click', fight.pulling ? 'Fish pulling · release to ease tension' : 'Fish hooked · hold to reel']
  if (player.casting) return ['', 'Watching the bobber']
  if (player.seat) return ridingHint(state, player)
  const gate = gateAction(state, player)
  if (gate) return gateHint(gate, state)
  const item = heldItem(state, player)
  if (item) return cargoHint(state, player, item)
  const clothing = clothingInteraction(player)
  if (clothing) return ['E', clothing === 'open-wardrobe' ? 'Open your wardrobe' : 'Browse the clothing counter']
  const ownDoor = atHomeDoor(player)
  if (ownDoor && isNight(state.weather.hour)) return ['E', 'Turn in for the night']
  if (!ownDoor && atHomeChest(player)) {
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
  if (nearby?.kind === 'toolbox') return ['E', 'Pick up the toolbox']
  if (ownDoor) return ['E', 'Read your welcome note']
  if (atFisher(player, state.weather.hour)) return ['E', `Talk to ${fisherName}`]
  if (player.grounded && !player.onBed && !player.truckSurface && distance(player, state.truck) < 4.5 &&
    Math.abs(state.truck.speed) <= truckSeatSpeed) return ['F', 'Board truck']
  if (canBoardSkiff(state, player)) return ['F', 'Board skiff']
  if (canCast(state, player)) return ['Left click', 'Hold and release to cast']
  return ['', '']
}

// What E sends. A gate step carries the action the player saw, so the host can refuse a stale one.
export function interactRequest(state: Snapshot, player: Player): { type: 'interact'; intent?: GateAction } | 'open-job-board' {
  const intent = gateAction(state, player)
  if (intent) return { type: 'interact', intent }
  if (state.mission === 'complete' && !state.jobs.active && atJobBoard(player) && !heldItem(state, player)) return 'open-job-board'
  return { type: 'interact' }
}
