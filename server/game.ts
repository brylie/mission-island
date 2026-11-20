import { createJuniperHabitat } from '../src/juniper-habitat.ts'
import type { IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'
import type { RawData } from 'ws'
import type { Plugin, ViteDevServer } from 'vite'
import { WebSocket, WebSocketServer } from 'ws'
import type { FishingResult, Input, Item, Player, ServerMessage, Snapshot } from '../src/protocol'
import { atHomeChest, atHomeDoor, byTruckBed, canBoardSkiff, canCast, canSpray, freeBed, heldItem, inSkiff, nearbyItem } from '../src/actions.ts'
import { biteSeconds, castTravelSeconds, chargePower } from '../src/charged-actions.ts'
import type { ChargeKind } from '../src/charged-actions'
import { anglerCost, cleanCrewName, readAppearance } from '../src/crew-appearance.ts'
import { farmPlots, growthSeconds, market, nearbyPlot, saleValue, seedPrice } from '../src/farm.ts'
import { atFisher } from '../src/harbor-fisher.ts'
import { starterTools } from '../src/inventory.ts'
import { atJobBoard, deliveryDrop, deliveryRadius, isJobId, jobs, orderContribution } from '../src/jobs.ts'
import {
  crateSize, crateStarts, distance, extinguisherStarts, jumpSpeed, localPoint, lookout, offset,
  skiffStart, spawns, starterPay, truckSeatSpeed, truckStart,
} from '../src/world.ts'
import { truckPoint } from '../src/truck-pose.ts'
import type { TruckPose } from '../src/truck-pose.ts'
import { groundHeight, maxWadeDepth, walkingHeight, waterDepth } from '../src/terrain.ts'
import { starterDiscoveries } from '../src/scenery.ts'
import { createCargoPhysics } from './cargo.ts'
import { canOccupyGround, isInsideTruck, recoverSceneryOverlap, stepPlayer } from './movement.ts'
import { skiffExit, stepSkiff } from './skiff.ts'
import { castPoint, catchChance, stepFight } from './fishing.ts'
import { daylight, isNight, nextDawn, weatherAt } from '../src/weather.ts'
import { islandSaveFile } from './save.ts'
import type { IslandSave } from './save'

const tickSeconds = 1 / 30
const stopped: Input = { x: 0, z: 0, spray: false, careful: false, sprint: false }

interface CrewMember {
  player: Player
  socket: WebSocket | null
  input: Input
  lastInput: number
  reachUntil: number
  throwUntil: number
  primary: { kind: ChargeKind | 'reach' | 'spray' | 'reel'; since: number; itemId?: number } | null
  disconnectedAt: number
  verticalSpeed: number
}

function makeItems(): Item[] {
  return [...crateStarts, ...extinguisherStarts].map((point, id) => ({
    ...point, id, heading: 0, kind: id < crateStarts.length ? 'crate' : 'extinguisher',
    holder: null, onBed: false, delivered: false, spraying: false, y: 0.04, rotation: null,
  }))
}

function readHeading(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.atan2(Math.sin(value), Math.cos(value)) : undefined
}

function getInput(raw: unknown): Input {
  if (!raw || typeof raw !== 'object') return stopped
  const { x, z, spray, aim, careful, sprint, brake, raiseRightHand } = raw as Partial<Input>
  const axis = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
    ? Math.max(-1, Math.min(1, value)) : 0
  return {
    x: axis(x),
    z: axis(z),
    spray: spray === true,
    aim: readHeading(aim),
    careful: careful === true,
    sprint: sprint === true,
    brake: brake === true,
    raiseRightHand: raiseRightHand === true,
  }
}

export function createGame({ clock = Date.now, random = Math.random, save, checkpoint }: {
  clock?: () => number
  random?: () => number
  save?: IslandSave
  checkpoint?: () => void
} = {}) {
  const crew = new Map<string, CrewMember>()
  const profiles = new Map<string, Player>()
  let islandTime = save?.islandTime ?? 0
  const physics = createCargoPhysics()
  const juniper = createJuniperHabitat()
  let wildlifeTick = 0
  const state: Snapshot = {
    crewCoins: save?.crewCoins ?? 0, lastStarterPay: save?.lastStarterPay,
    type: 'state', players: [], skiff: { ...skiffStart, speed: 0 }, items: makeItems(),
    mission: 'delivery', fire: 1, farm: farmPlots.map(() => 'grass'), ...structuredClone(save?.world),
    truck: physics.parkTruck(save?.world.truck ?? truckStart),
    weather: weatherAt(islandTime), islandTime,
    juniper: juniper(0, weatherAt(islandTime), []),
    jobs: structuredClone(save?.world.jobs ?? { active: null, completed: 0 }),
  }
  state.skiff.speed = 0
  const growth = save?.growth.slice() ?? farmPlots.map(() => 0)
  for (const item of state.items) {
    item.spraying = false
    if (state.mission === 'complete' && item.kind === 'extinguisher') item.holder = null
    if (save) physics.restore(item)
    else physics.release(item, item)
  }

  function crewMember(player: Player): CrewMember {
    return {
      player, socket: null, input: stopped, lastInput: 0, reachUntil: 0, throwUntil: 0, primary: null,
      disconnectedAt: clock(), verticalSpeed: 0,
    }
  }

  function restingPlayer(player: Player) {
    return {
      ...player, name: cleanCrewName(player.name), discoveries: player.discoveries ?? [],
      connected: false, casting: null, charge: null, reaching: false, rightHandRaised: false, throwing: false, sleeping: false,
      swimming: player.swimming ?? false, rowing: false,
    }
  }

  for (const { token, player, reserved } of save?.crew ?? []) {
    const restored = restingPlayer(structuredClone(player))
    recoverSceneryOverlap(restored)
    profiles.set(token, restored)
    if (reserved) {
      crew.set(token, crewMember(restored))
      state.players.push(restored)
    }
  }

  function snapshotForSave(): IslandSave {
    const { truck, skiff, items, mission, fire, farm, jobs } = state
    const { x, z, heading } = truck
    return {
      version: 2, crewCoins: state.crewCoins, islandTime, growth: growth.slice(),
      ...(state.lastStarterPay && { lastStarterPay: state.lastStarterPay }),
      world: structuredClone({ truck: { x, z, heading }, skiff, items, mission, fire, farm, jobs }),
      crew: Array.from(profiles, ([token, player]) => ({
        token, player: structuredClone(restingPlayer(player)), reserved: crew.has(token),
      })),
    }
  }

  function stopPrimary(member: CrewMember) {
    member.primary = null
    member.player.charge = null
  }

  function stowTool(member: CrewMember) {
    member.player.equipped = null
    member.player.casting = null
  }

  function tell(member: CrewMember, message: ServerMessage) {
    if (member.socket?.readyState === WebSocket.OPEN) {
      member.socket.send(JSON.stringify(message))
    }
  }

  function fishResult(member: CrewMember, result: FishingResult) {
    tell(member, { type: 'fishing-result', result })
  }

  function payCrew(message: Extract<ServerMessage, { type: 'job-pay' | 'order-pay' | 'market-sale' }>) {
    state.crewCoins += message.coins
    if (message.type === 'job-pay') state.lastStarterPay = message.job
    for (const member of crew.values()) tell(member, message)
  }

  function startJob(member: CrewMember, id: unknown) {
    if (!isJobId(id) || state.mission !== 'complete' || state.jobs.active || !atJobBoard(member.player) ||
      member.player.sleeping || heldItem(state, member.player)) {
      tell(member, { type: 'order-unavailable' })
      return
    }
    const job = jobs[id]
    state.jobs.active = { id, progress: 0 }
    if (job.kind === 'delivery') {
      for (const [i, point] of crateStarts.entries()) {
        const crate = state.items[i]
        physics.remove(crate)
        Object.assign(crate, { holder: null, heading: 0, delivered: i >= job.quantity })
        if (!crate.delivered) physics.release(crate, point)
      }
    }
    checkpoint?.()
  }

  function advanceOrder(quantity: number) {
    const order = state.jobs.active
    if (!order) return
    order.progress += quantity
    const job = jobs[order.id]
    if (order.progress < job.quantity) return
    state.jobs.active = null
    state.jobs.completed++
    payCrew({ type: 'order-pay', id: order.id, coins: job.coins })
  }

  function deliverCrate(item: Item) {
    item.delivered = true
    if (state.jobs.active) {
      advanceOrder(1)
    } else if (state.items.filter((entry) => entry.kind === 'crate').every((crate) => crate.delivered)) {
      state.mission = 'fire'
      payCrew({ type: 'job-pay', job: 'delivery', coins: starterPay.delivery.coins })
    } else {
      payCrew({ type: 'job-pay', job: 'crate', coins: starterPay.crate.coins })
    }
  }

  function visitMarket(member: CrewMember) {
    const { player } = member
    const contribution = orderContribution(state, player.goods)
    if (contribution) {
      player.goods[contribution.goods] -= contribution.quantity
      advanceOrder(contribution.quantity)
      return
    }
    const proceeds = saleValue(player.goods)
    if (!proceeds) return
    player.goods = { fish: 0, carrots: 0 }
    payCrew({ type: 'market-sale', coins: proceeds })
  }

  function useHomeChest(member: CrewMember) {
    const { player } = member
    stopPrimary(member)
    const firstVisit = !player.starterSeedClaimed
    if (firstVisit) {
      player.starterSeedClaimed = true
      player.seeds++
      tell(member, { type: 'starter-seed' })
    }
    if (!player.inventory.length) {
      player.inventory = [...starterTools]
      player.equipped = 'fishing-rod'
    } else if (!firstVisit) {
      player.inventory = []
      stowTool(member)
    }
  }

  function isReadyToCast(member: CrewMember) {
    const { player, input } = member
    return canCast(state, player) && !input.x && !input.z &&
      (!inSkiff(player.seat) || !state.players.some((other) => other.rowing))
  }

  function startPrimary(member: CrewMember, now: number) {
    const { player } = member
    if (member.primary || player.sleeping) return
    const item = heldItem(state, player)
    if (item?.kind === 'crate' && !player.seat) {
      member.primary = { kind: 'throw', since: now, itemId: item.id }
      player.charge = { kind: 'throw', power: 0 }
    } else if (item && canSpray(state, player, item)) {
      member.primary = { kind: 'spray', since: now, itemId: item.id }
    } else if (!item && player.equipped === 'fishing-rod') {
      if (!isReadyToCast(member)) {
        if (inSkiff(player.seat)) fishResult(member, 'boat-moving')
        return
      }
      if (player.casting?.fight) {
        member.primary = { kind: 'reel', since: now }
        return
      }
      if (player.casting) return
      member.primary = { kind: 'cast', since: now }
      player.charge = { kind: 'cast', power: 0 }
    } else if (!item && !player.seat) {
      if (player.grounded && !player.onBed) {
        const plot = nearbyPlot(player)
        if (player.equipped === 'hoe' && state.farm[plot] === 'grass') state.farm[plot] = 'tilled'
        if (player.equipped === 'watering-can' && state.farm[plot] === 'planted') {
          state.farm[plot] = 'watered'
        }
      }
      member.primary = { kind: 'reach', since: now }
      member.reachUntil = now + 220
    }
  }

  function releasePrimary(member: CrewMember, aim: number | undefined, now: number) {
    const { player, primary } = member
    stopPrimary(member)
    if (!primary || (primary.kind !== 'throw' && primary.kind !== 'cast')) return
    const heading = aim ?? member.input.aim ?? player.heading
    const power = chargePower(primary.kind, (now - primary.since) / 1000)
    if (primary.kind === 'cast' && isReadyToCast(member)) {
      const bobber = castPoint({ ...player, heading }, power)
      if (bobber) {
        if (!player.seat) player.heading = heading
        player.casting = { bobber, elapsed: 0, power }
      } else fishResult(member, 'dry-cast')
    }
    if (primary.kind !== 'throw' || player.seat) return
    const item = heldItem(state, player)
    if (!item || item.id !== primary.itemId || item.kind !== 'crate') return
    player.heading = heading
    item.heading = heading
    const front = offset(player, 0, 0.89)
    const origin = canOccupyGround(front, crateSize / 2, -1) &&
      (!isInsideTruck(state.truck, front) || player.onBed) ? front : player
    item.holder = null
    physics.launch(item, origin, player.y + 1.76, power)
    member.throwUntil = now + 270
    player.throwing = true
  }

  function updateItems() {
    for (const item of state.items) {
      if (item.holder === null) continue
      const holder = state.players.find((player) => player.id === item.holder)
      if (holder) {
        const crate = item.kind === 'crate'
        const winding = crate && holder.charge?.kind === 'throw' ? holder.charge.power : 0
        Object.assign(item, crate ? offset(holder, 0, 0.89) : offset(holder, -0.49, 0.59))
        item.heading = holder.heading
        item.y = holder.y + (crate ? 1.13 + winding * 0.41 : 0.24)
      }
    }
  }

  function interact(member: CrewMember) {
    const { player } = member
    if (player.seat) return
    if (player.sleeping) {
      player.sleeping = false
      return
    }
    const ownDoor = atHomeDoor(player)
    const item = heldItem(state, player)
    if (item) {
      stopPrimary(member)
      item.holder = null
      const dropoff = deliveryDrop(state)
      if (item.kind === 'crate' && dropoff && distance(player, dropoff) < deliveryRadius) {
        deliverCrate(item)
      } else if (item.kind === 'crate') {
        const slot = byTruckBed(state, player) ? freeBed(state) : undefined
        if (slot === undefined) {
          const drop = canOccupyGround(item, crateSize / 2, -0.10) && !isInsideTruck(state.truck, item) ? item : player
          physics.release(item, drop, item.y)
        } else {
          physics.load(item, state.truck, slot)
        }
      } else {
        item.y = groundHeight(item) + 0.04
      }
    } else if (ownDoor && isNight(state.weather.hour)) {
      stopPrimary(member)
      player.casting = null
      member.input = stopped
      player.sleeping = true
      return
    } else if (!ownDoor && atHomeChest(player)) {
      useHomeChest(member)
    } else if (player.grounded && !player.onBed && distance(player, market) < 2.25) {
      visitMarket(member)
    } else {
      const plot = player.grounded && !player.onBed ? nearbyPlot(player) : -1
      if (state.farm[plot] === 'tilled') {
        if (!player.seeds) return
        player.seeds--
        growth[plot] = 0
        state.farm[plot] = 'planted'
        return
      }
      if (state.farm[plot] === 'ripe') {
        state.farm[plot] = 'grass'
        player.goods.carrots++
        return
      }
      const nearby = nearbyItem(state, player)
      if (!nearby) {
        if (ownDoor) tell(member, { type: 'crew-note' })
        else if (atFisher(player, state.weather.hour)) tell(member, { type: 'fisher-chat' })
        return
      }
      stopPrimary(member)
      stowTool(member)
      nearby.holder = player.id
      nearby.rotation = null
      physics.remove(nearby)
    }
    updateItems()
  }

  function toggleSeat(member: CrewMember) {
    const { player } = member
    if (player.seat) {
      const boating = inSkiff(player.seat)
      if (!boating && Math.abs(state.truck.speed) > truckSeatSpeed) return
      const side = player.seat === 'driver' ? -1 : 1
      const exit = boating ? skiffExit(state.skiff, player.seat)
        : [offset(state.truck, side * 2.1, 0.9), offset(state.truck, 0, -3.8)]
          .find((point) => canOccupyGround(point, 0.45, -0.10))
      if (!exit) return
      player.seat = null
      stopPrimary(member)
      player.casting = null
      player.rowing = false
      Object.assign(player, exit, { y: walkingHeight(exit), grounded: true, onBed: false })
      updateItems()
      return
    }
    if (canBoardSkiff(state, player)) {
      stopPrimary(member)
      player.casting = null
      player.seat = state.players.some((entry) => entry.seat === 'port') ? 'starboard' : 'port'
      updateRiders()
      return
    }
    if (distance(state.truck, player) >= 4.5 || Math.abs(state.truck.speed) > truckSeatSpeed || !player.grounded || player.onBed || player.truckSurface ||
      heldItem(state, player)?.kind === 'crate') return
    if (!state.players.some((entry) => entry.seat === 'driver')) player.seat = 'driver'
    else if (!state.players.some((entry) => entry.seat === 'passenger')) player.seat = 'passenger'
    if (player.seat) {
      stopPrimary(member)
      stowTool(member)
    }
    updateRiders()
    updateItems()
  }

  function updateRiders() {
    for (const player of state.players) {
      if (!player.seat) continue
      if (inSkiff(player.seat)) {
        Object.assign(player, offset(state.skiff, player.seat === 'port' ? -0.44 : 0.44, 0.25))
        player.heading = state.skiff.heading
        player.y = 0
        player.grounded = true
        player.onBed = false
        player.truckSurface = undefined
        player.swimming = false
        continue
      }
      Object.assign(player, truckPoint(state.truck, player.seat === 'driver' ? -0.65 : 0.65, 0, 1.05))
      player.heading = state.truck.heading
      player.grounded = true
      player.onBed = false
      player.truckSurface = undefined
      player.swimming = false
    }
  }

  function advanceIsland() {
    islandTime += tickSeconds
    state.weather = weatherAt(islandTime)
    const connectedCrew = state.players.filter((player) => player.connected)
    if (isNight(state.weather.hour) && connectedCrew.length && connectedCrew.every((player) => player.sleeping)) {
      islandTime = nextDawn(islandTime)
      state.weather = weatherAt(islandTime)
      checkpoint?.()
    }
    state.islandTime = islandTime
    if (!isNight(state.weather.hour)) {
      for (const player of connectedCrew) player.sleeping = false
    }
    const sun = daylight(state.weather.hour)
    for (const [plot, stage] of state.farm.entries()) {
      if (stage === 'planted' && state.weather.rain > 0.35) state.farm[plot] = 'watered'
      if (state.farm[plot] === 'watered') {
        growth[plot] += tickSeconds * sun
        if (growth[plot] >= growthSeconds) state.farm[plot] = 'ripe'
      }
    }
  }

  function expireCrew(now: number) {
    for (const [token, member] of crew) {
      const reserveFor = inSkiff(member.player.seat) ? 120_000 : 12_000
      if (member.socket || now - member.disconnectedAt < reserveFor) continue
      const item = heldItem(state, member.player)
      if (item) {
        item.holder = null
        if (item.kind === 'crate') physics.release(item, item)
        else item.y = groundHeight(item) + 0.04
      }
      member.player.seat = null
      member.player.onBed = false
      member.player.truckSurface = undefined
      state.players = state.players.filter((player) => player !== member.player)
      crew.delete(token)
    }
  }

  function respawn(member: CrewMember) {
    const { player } = member
    const item = heldItem(state, player)
    if (item) {
      item.holder = null
      const safe = canOccupyGround(player, crateSize / 2, -maxWadeDepth) && waterDepth(player) <= maxWadeDepth
      if (item.kind === 'crate') physics.release(item, safe ? player : crateStarts[item.id])
      else {
        const point = safe ? player : extinguisherStarts[item.id - crateStarts.length]
        Object.assign(item, { x: point.x, z: point.z, y: groundHeight(point) + 0.04, spraying: false })
      }
    }
    const home = spawns[player.id]
    Object.assign(player, { ...home, y: groundHeight(home), heading: 0, seat: null, grounded: true, onBed: false, truckSurface: undefined,
      swimming: false, sleeping: false, casting: null, reaching: false, rightHandRaised: false, throwing: false, rowing: false })
    stopPrimary(member)
    member.input = stopped
    member.verticalSpeed = 0
    member.reachUntil = 0
    member.throwUntil = 0
    checkpoint?.()
  }

  function updateFishing(member: CrewMember, allowed: boolean) {
    const { player } = member
    if (!allowed) {
      if (member.primary?.kind === 'cast' || member.primary?.kind === 'reel') stopPrimary(member)
      player.casting = null
    } else if (player.casting) {
      const cast = player.casting
      cast.elapsed += tickSeconds
      if (cast.fight) {
        const result = stepFight(cast.fight, cast.elapsed - castTravelSeconds - biteSeconds,
          member.primary?.kind === 'reel', tickSeconds)
        if (result) {
          if (result === 'caught') player.goods.fish++
          fishResult(member, result)
          player.casting = null
          stopPrimary(member)
          if (result === 'caught') checkpoint?.()
        }
      } else if (cast.elapsed >= castTravelSeconds + biteSeconds) {
        if (random() < catchChance(cast.power)) {
          cast.fight = { progress: 0, tension: 0.25, pulling: false }
        } else {
          fishResult(member, 'no-bite')
          player.casting = null
        }
      }
    }
  }

  function walkCrew(member: CrewMember, before: TruckPose, connected: boolean, now: number) {
    const { player, input } = member
    const { truck } = state
    const item = heldItem(state, player)
    stepPlayer(member, before, truck, connected ? input : stopped, Boolean(item), tickSeconds, looseCargoTop)
    if (!connected) return
    for (const region of starterDiscoveries) {
      if (!player.discoveries.includes(region.id) && distance(player, region.site) < 8) {
        player.discoveries.push(region.id)
        checkpoint?.()
      }
    }
    if (player.charge && input.aim !== undefined && !input.x && !input.z) player.heading = input.aim
    player.reaching = !item && (member.primary?.kind === 'reach' || now < member.reachUntil)
    player.rightHandRaised = input.raiseRightHand === true && !player.swimming && !player.sleeping &&
      item?.kind !== 'crate' && !player.throwing
    if (item && (input.spray || (member.primary?.kind === 'spray' && member.primary.itemId === item.id)) &&
      canSpray(state, player, item)) {
      item.spraying = true
      if (distance(player, lookout) < 5) {
        player.heading = Math.atan2(lookout.x - player.x, lookout.z - player.z)
        state.fire = Math.max(0, state.fire - tickSeconds / 5)
        if (state.fire === 0) {
          state.mission = 'complete'
          payCrew({ type: 'job-pay', job: 'fire', coins: starterPay.fire.coins })
          for (const tool of state.items.filter(({ kind }) => kind === 'extinguisher')) {
            tool.holder = null
            tool.spraying = false
          }
          checkpoint?.()
        }
      }
    }
  }

  function looseCargoTop(point: { x: number; z: number }, margin: number) {
    let top = -Infinity
    for (const item of state.items) {
      if (item.kind !== 'crate' || item.holder !== null || item.delivered || item.onBed) continue
      const local = localPoint(item, point)
      const size = crateSize / 2 + margin
      if (Math.abs(local.x) < size && Math.abs(local.z) < size) top = Math.max(top, item.y + crateSize / 2)
    }
    return top
  }

  function tick() {
    const now = clock()
    advanceIsland()
    expireCrew(now)
    const members = [...crew.values()]
    const active = (member: CrewMember) => Boolean(member.socket && member.lastInput >= now - 400)
    const driver = members.find((member) => member.player.seat === 'driver')
    const before = state.truck
    state.truck = physics.step(state.items, before, driver && active(driver) ? driver.input : stopped, tickSeconds)
    const rowers = members.filter((member) => inSkiff(member.player.seat) && active(member))
    const still = stepSkiff(state.skiff, rowers.map((member) => member.input), tickSeconds)
    updateRiders()
    for (const member of members) {
      const { player, input } = member
      player.rowing = Boolean(inSkiff(player.seat) && active(member) && (input.x || input.z))
    }
    for (const item of state.items) item.spraying = false
    for (const member of members) {
      const { player } = member
      const connected = active(member)
      player.reaching = false
      player.rightHandRaised = false
      player.throwing = now < member.throwUntil
      if (!connected) stopPrimary(member)
      updateFishing(member, connected && isReadyToCast(member) && (!inSkiff(player.seat) || still))
      if (player.charge && member.primary) {
        player.charge.power = chargePower(player.charge.kind, (now - member.primary.since) / 1000)
      }
      if (player.seat) {
        member.verticalSpeed = 0
        member.reachUntil = 0
        continue
      }
      walkCrew(member, before, connected, now)
    }
    updateItems()
    // Animal motion follows real simulation ticks, even when the crew sleeps through the night.
    if (++wildlifeTick % 3 === 0) {
      state.juniper = juniper(wildlifeTick * tickSeconds, state.weather, state.players.filter(p => p.connected && !p.sleeping))
    }
    const snapshot = JSON.stringify(state)
    for (const { socket } of members) {
      if (socket?.readyState === WebSocket.OPEN && socket.bufferedAmount < 65_536) {
        socket.send(snapshot)
      }
    }
  }

  function readMessage(data: RawData): Record<string, unknown> | undefined {
    try {
      const buffer = Array.isArray(data) ? Buffer.concat(data) : Buffer.isBuffer(data) ? data : Buffer.from(new Uint8Array(data))
      const parsed: unknown = JSON.parse(buffer.toString('utf8'))
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : undefined
    } catch {
      return undefined
    }
  }

  function admit(socket: WebSocket, message: Record<string, unknown>, reply: (message: ServerMessage) => void) {
    const token = message.token
    if (message.type !== 'join' || typeof token !== 'string' || !/^[a-f0-9]{32}$/.test(token)) return
    const existing = crew.get(token)
    if (existing?.socket) {
      reply({ type: 'duplicate' })
      socket.close()
      return
    }
    if (!existing && crew.size >= spawns.length) {
      reply({ type: 'full' })
      socket.close()
      return
    }
    const profile = profiles.get(token)
    const open = spawns.flatMap((_, index) => state.players.some((player) => player.id === index) ? [] : [index])
    const id = profile && open.includes(profile.id) ? profile.id : open[0]
    const member = existing ?? crewMember(profile ? { ...profile, id } : {
      ...spawns[id], id, heading: 0, y: groundHeight(spawns[id]), grounded: true,
        name: '', discoveries: [], onBed: false, reaching: false, rightHandRaised: false, connected: true, sleeping: false, swimming: false,
        seat: null, rowing: false, inventory: [], equipped: null,
        goods: { fish: 0, carrots: 0 }, seeds: 0, charge: null, casting: null, throwing: false, ownsAngler: false },
    )
    if (!existing) state.players.push(member.player)
    crew.set(token, member)
    profiles.set(token, member.player)
    member.socket = socket
    member.player.connected = true
    if (!existing) checkpoint?.()
    return member
  }

  function handlePrimary(member: CrewMember, message: Record<string, unknown>) {
    const now = clock()
    if (message.phase === 'start') {
      member.lastInput = now
      startPrimary(member, now)
    } else if (message.phase === 'release') {
      if (now - member.lastInput <= 400) releasePrimary(member, readHeading(message.aim), now)
      else stopPrimary(member)
    } else if (message.phase === 'cancel') {
      stopPrimary(member)
    }
  }

  function handleAction(member: CrewMember, message: Record<string, unknown>) {
    switch (message.type) {
      case 'input':
        member.input = getInput(message.input)
        member.lastInput = clock()
        if (member.input.x || member.input.z) member.player.sleeping = false
        break
      case 'primary':
        handlePrimary(member, message)
        break
      case 'equip':
        if (!member.player.inventory.some((item) => item === message.item) ||
          heldItem(state, member.player) || (member.player.seat && !inSkiff(member.player.seat))) break
        stopPrimary(member)
        if (member.player.equipped === message.item) stowTool(member)
        else {
          member.player.casting = null
          member.player.equipped = member.player.inventory.find((item) => item === message.item) ?? null
        }
        break
      case 'appearance': {
        const appearance = readAppearance(message.appearance)
        if (appearance.uniform === 'angler' && !member.player.ownsAngler) appearance.uniform = 'default'
        member.player.appearance = appearance
        break
      }
      case 'crew-name':
        member.player.name = cleanCrewName(message.name)
        checkpoint?.()
        break
      case 'buy-seed': {
        const { player } = member
        if (!player.seat && player.grounded && !player.onBed && !heldItem(state, player) &&
          distance(player, market) < 2.25 && state.crewCoins >= seedPrice) {
          state.crewCoins -= seedPrice
          player.seeds++
          checkpoint?.()
        }
        break
      }
      case 'buy-angler':
        if (!member.player.ownsAngler && state.crewCoins >= anglerCost) {
          state.crewCoins -= anglerCost
          member.player.ownsAngler = true
          checkpoint?.()
        }
        break
      case 'interact':
        interact(member)
        // Save order progress, completion, and crew payouts together.
        checkpoint?.()
        break
      case 'seat':
        if (!member.player.sleeping) toggleSeat(member)
        break
      case 'jump':
        if (!member.player.seat && member.player.grounded && !member.player.swimming) {
          member.player.sleeping = false
          if (member.primary?.kind === 'cast') stopPrimary(member)
          member.player.casting = null
          member.player.grounded = false
          member.player.onBed = false
          member.player.truckSurface = undefined
          member.verticalSpeed = jumpSpeed
        }
        break
      case 'take-job':
        startJob(member, message.id)
        break
      case 'respawn':
        respawn(member)
        break
    }
  }

  function connect(socket: WebSocket) {
    let member: CrewMember | undefined
    const joinTimeout = setTimeout(() => socket.close(), 3_000)
    const reply = (message: ServerMessage) => socket.send(JSON.stringify(message))
    socket.on('error', () => socket.terminate())
    socket.on('message', (data, binary) => {
      if (binary) return
      const message = readMessage(data)
      if (!message) return
      if (member) {
        handleAction(member, message)
        return
      }
      member = admit(socket, message, reply)
      if (member) {
        clearTimeout(joinTimeout)
        reply({ type: 'welcome', id: member.player.id })
      }
    })
    socket.on('close', () => {
      clearTimeout(joinTimeout)
      if (member?.socket !== socket) return
      member.socket = null
      member.input = stopped
      stopPrimary(member)
      member.player.casting = null
      member.reachUntil = 0
      member.player.connected = false
      member.player.sleeping = false
      member.disconnectedAt = clock()
    })
  }

  return { tick, connect, snapshotForSave, get crewCoins() { return state.crewCoins } }
}

function attachGame(server: NonNullable<ViteDevServer['httpServer']>, middlewares: ViteDevServer['middlewares'], root: string, port: number) {
  const archive = islandSaveFile(root, port, process.env.MISSION_ISLAND_SAVE)
  let saveFailed = false
  function checkpoint() {
    if (!archive) return
    try {
      archive.write(game.snapshotForSave())
      saveFailed = false
    } catch (error) {
      if (!saveFailed) console.error('Could not save Mission Island:', error)
      saveFailed = true
    }
  }
  const game = createGame({ save: archive?.load(), checkpoint })
  // Saltwind's survey can read the same bank without reserving a Starter Island crew slot.
  middlewares.use('/api/crew-bank', (request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' }).end()
      return
    }
    response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ crewCoins: game.crewCoins }))
  })
  const sockets = new WebSocketServer({ noServer: true, maxPayload: 256 })
  const live = new Set<WebSocket>()
  const timer = setInterval(game.tick, tickSeconds * 1000)
  const saving = archive && setInterval(checkpoint, 2000)
  const heartbeat = setInterval(() => {
    for (const socket of sockets.clients) {
      if (!live.delete(socket)) socket.terminate()
      else socket.ping()
    }
  }, 10_000)
  sockets.on('connection', (socket) => {
    live.add(socket)
    socket.on('pong', () => live.add(socket))
    socket.on('close', () => live.delete(socket))
    game.connect(socket)
  })
  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (request.url !== '/play') return
    const origin = request.headers.origin
    if (origin !== undefined && origin !== `http://${request.headers.host}` &&
      origin !== `https://${request.headers.host}`) {
      socket.destroy()
      return
    }
    sockets.handleUpgrade(request, socket, head, (ws) => sockets.emit('connection', ws))
  })
  server.on('close', () => {
    clearInterval(timer)
    clearInterval(heartbeat)
    clearInterval(saving)
    checkpoint()
    for (const socket of sockets.clients) socket.terminate()
    sockets.close()
  })
}

function serveLanInvites(server: Pick<ViteDevServer, 'middlewares' | 'resolvedUrls'>) {
  server.middlewares.use('/api/lan-invite', (_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    response.end(JSON.stringify(server.resolvedUrls?.network ?? []))
  })
}

export function multiplayer(): Plugin {
  return {
    name: 'mission-island-multiplayer',
    configureServer(server) {
      serveLanInvites(server)
      if (server.httpServer) attachGame(server.httpServer, server.middlewares, server.config.root, server.config.server.port ?? 5173)
    },
    configurePreviewServer(server) {
      serveLanInvites(server)
      attachGame(server.httpServer, server.middlewares, server.config.root, server.config.preview.port ?? 5173)
    },
  }
}
