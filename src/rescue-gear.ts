import { learnerVehicleGear, pickupExtinguisherScale } from './assets/geometry/response-pickup.ts'
import { practiceStopSpeedMps } from './learner-vehicles.ts'
import type { Item, Player, Snapshot } from './protocol.ts'
import { truckPoint } from './truck-pose.ts'
import { distance, itemStarts, type Point } from './world.ts'

// Wilderness rescue gear carried by the Seabrook Fire and Rescue pickup. Each
// piece is a world item: take it from the bed with E, carry it, use it with
// left click, set it down anywhere, and stow it again at the pickup.
export const rescueGear = {
  'first-aid': { name: 'First aid kit', use: 'check', hint: 'Check on a crewmate' },
  'flashlight': { name: 'Flashlight', use: 'light', hint: 'Shining ahead' },
  'throw-bag': { name: 'Throw bag', use: 'throw', hint: 'Hold to throw' },
  'ring-buoy': { name: 'Ring buoy', use: 'throw', hint: 'Hold to throw' },
  'radio': { name: 'Radio', use: 'signal', hint: 'Radio the crew' },
  'whistle': { name: 'Whistle', use: 'signal', hint: 'Blow the whistle' },
} as const
export type RescueGearKind = keyof typeof rescueGear
export type ItemKind = 'crate' | 'extinguisher' | 'toolbox' | RescueGearKind
export type CrewSignal = 'radio' | 'whistle'

export const signalCooldownMs = 1500
const firstAidReachM = 2.4
// A thrown line lands this far ahead, depending on how long the throw was held.
const shortestThrowM = 3
const longestThrowM = 11
export const throwRangeM = { min: shortestThrowM, max: longestThrowM } as const
const stowReachM = 3.2
const half = 0.5
const quarterTurn = Math.PI * half

export function isRescueGear(kind: ItemKind): kind is RescueGearKind {
  return kind in rescueGear
}

export function itemName(kind: ItemKind) {
  if (isRescueGear(kind)) return rescueGear[kind].name
  return kind === 'crate' ? 'Crate' : kind === 'toolbox' ? 'Toolbox' : 'Extinguisher'
}

type Quaternion = { x: number, y: number, z: number, w: number }

// Vehicle gear has a slot on its vehicle; the Fire Supplies extinguishers do not.
function gearSlot(item: Pick<Item, 'id'>) {
  const start = itemStarts[item.id]
  return 'slot' in start ? { vehicle: start.vehicle, ...learnerVehicleGear[start.vehicle][start.slot] } : undefined
}

export function isVehicleGear(item: Pick<Item, 'id'>) {
  return gearSlot(item) !== undefined
}

// How large an item's model is drawn: vehicle extinguishers are compact.
export function itemScale(item: Pick<Item, 'id'>) {
  return gearSlot(item)?.kind === 'extinguisher' ? pickupExtinguisherScale : 1
}

// Thrown lines and buoys float; everything else rests on the ground.
export function floats(kind: ItemKind) {
  return kind === 'ring-buoy' || kind === 'throw-bag'
}

function multiply(a: Quaternion, b: Quaternion): Quaternion {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  }
}

const aboutY = (angle: number) => ({ x: 0, y: Math.sin(angle * half), z: 0, w: Math.cos(angle * half) })
const aboutX = (angle: number) => ({ x: Math.sin(angle * half), y: 0, z: 0, w: Math.cos(angle * half) })
const aboutZ = (angle: number) => ({ x: 0, y: 0, z: Math.sin(angle * half), w: Math.cos(angle * half) })

// The vehicle's yaw, pitch and roll in the physics body's YXZ order, then the
// slot's own turn and, for a lying tank, a quarter turn to lay it along the bed.
export function stowedPose(item: Pick<Item, 'id'>, vehicles: Snapshot['vehicles']) {
  const slot = gearSlot(item)!
  const vehicle = vehicles[slot.vehicle]
  const point = truckPoint(vehicle, slot.x, slot.y + slot.lift, slot.z)
  const body = multiply(multiply(aboutY(vehicle.heading), aboutX(vehicle.pitch)), aboutZ(vehicle.roll))
  const turned = multiply(body, aboutY(slot.yaw))
  return { ...point, heading: vehicle.heading + slot.yaw, rotation: slot.lie ? multiply(turned, aboutX(quarterTurn)) : turned }
}

// A held ring buoy hangs upright at the side, turned with the carrier.
export function uprightAtSide(heading: number) {
  return multiply(aboutY(heading), aboutZ(quarterTurn))
}

// Gear can be taken or stowed while its vehicle is stopped and the player is at its bed.
function atGearBed(state: Pick<Snapshot, 'vehicles'>, vehicle: keyof typeof learnerVehicleGear, player: Point) {
  const pose = state.vehicles[vehicle]
  const slots = learnerVehicleGear[vehicle]
  const bed = truckPoint(pose, 0, 0, (slots[0].z + slots[2].z) * half)
  return Math.abs(pose.speed) <= practiceStopSpeedMps && distance(bed, player) < stowReachM
}

export function canTakeStowed(state: Pick<Snapshot, 'vehicles'>, item: Item, player: Point) {
  const slot = gearSlot(item)
  return slot !== undefined && atGearBed(state, slot.vehicle, player)
}

export function canStow(state: Pick<Snapshot, 'vehicles'>, player: Player, item: Item) {
  return !player.seat && canTakeStowed(state, item, player)
}

// The crewmate nearest to a first aid kit, if anyone is close enough to check on.
export function firstAidPatient(state: Pick<Snapshot, 'players'>, helper: Player) {
  return state.players
    .filter((other) => other.id !== helper.id && other.connected && !other.seat && distance(other, helper) < firstAidReachM)
    .sort((a, b) => distance(a, helper) - distance(b, helper))[0]
}

// How crew hold an item: the ring buoy hangs at the side like the toolbox, and
// the smaller gear is held out in one hand like a tool.
export function carryPose(kind: ItemKind): 'crate' | 'extinguisher' | 'toolbox' | 'tool' {
  if (!isRescueGear(kind)) return kind
  return kind === 'ring-buoy' ? 'toolbox' : 'tool'
}

export function throwDistance(power: number) {
  return throwRangeM.min + (throwRangeM.max - throwRangeM.min) * Math.min(1, Math.max(0, power))
}
