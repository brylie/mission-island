import type { Item, Player, Snapshot } from './protocol.ts'
import { deliveryDrop } from './jobs.ts'
import { walkingHeight } from './terrain.ts'
import { daySeconds, weatherAt } from './weather.ts'
import { distance, mendingBench, toolboxHome, wrenCottage } from './world.ts'
import type { Point } from './world.ts'

export const residentName = 'Wren'
export const favorCoins = 5
export type GateStage = 'sagging' | 'accepted' | 'inspected' | 'fitted' | 'mended'
export interface GateRepair {
  stage: GateStage
  pinHolder: number | null
  acceptedAt?: number
  mendedAt?: number
}
export interface GardenGate {
  open: boolean
  closePending: boolean
}
export interface FavorReceipt {
  resident: 'wren'
  coins: number
}
export type GateAction = 'talk' | 'inspect' | 'take-pin' | 'fit' | 'test' | 'open' | 'close' | 'return-toolbox'
export const gateActions: readonly GateAction[] = ['talk', 'inspect', 'take-pin', 'fit', 'test', 'open', 'close', 'return-toolbox']
export const gateStages: readonly GateStage[] = ['sagging', 'accepted', 'inspected', 'fitted', 'mended']
export type GateStep = 'inspected' | 'pin' | 'fitted' | 'stuck' | 'recalled' | 'returned'
type GateWorld = Pick<Snapshot, 'gate' | 'gateRepair' | 'items' | 'players' | 'islandTime' | 'mission' | 'jobs'>

export function initialGateRepair() {
  return {
    gate: { open: false, closePending: false } as GardenGate,
    gateRepair: { stage: 'sagging', pinHolder: null } as GateRepair,
    residentTrust: { wren: 0 },
  }
}

// Wren's front garden. The fence is taller than a jump, so the gate is the only way in.
const front = wrenCottage.z - wrenCottage.d / 2
export const fenceZ = front - 2.35
export const fenceHeight = 1.55
export const gateway: Point = { x: wrenCottage.x, z: fenceZ }
const gateWidth = 1.1
export const hingePost: Point = { x: gateway.x - gateWidth / 2, z: fenceZ }
export const gateLeaf = { length: 1.06, height: 1.5, thickness: .08 }
export const sagAngle = .3 // radians: the dragging leaf stops well short of an opening a person fits through
const openAngle = 1.75
export const fenceRuns = [
  { from: { x: wrenCottage.x - 2.6, z: front + .7 }, to: { x: wrenCottage.x - 2.6, z: fenceZ } },
  { from: { x: wrenCottage.x + 2.6, z: front + .7 }, to: { x: wrenCottage.x + 2.6, z: fenceZ } },
  { from: { x: wrenCottage.x - 2.6, z: fenceZ }, to: { x: hingePost.x - .06, z: fenceZ } },
  { from: { x: gateway.x + gateWidth / 2 + .06, z: fenceZ }, to: { x: wrenCottage.x + 2.6, z: fenceZ } },
]
const actionRadius = 2.5
const benchRadius = 2
const wrenRadius = 2.4

// Wren's day: home in the garden, the mending bench by the ferry freight yard from 07:00 to 17:00.
const home = { x: gateway.x, z: fenceZ + 1.6 }
const frontDoor = { x: gateway.x, z: front - .35 }
const backDoor = { x: gateway.x, z: wrenCottage.z + wrenCottage.d / 2 + .35 }
const lane = { x: gateway.x, z: fenceZ - 1.4 }
const work = { x: mendingBench.x - 1.3, z: mendingBench.z }
// Wren crosses Harbor Depot road just south of the fork, where drivers slow for the depot lane.
const toFerry = [lane, { x: -26.4, z: -13.4 }, work]
// The long way round: out the back door, between the Blue cottage and the fence, then down to the road.
const westPath = gateway.x - 4.6
type Leg = { point: Point; indoors?: boolean }
const detour: Leg[] = [
  { point: home }, { point: frontDoor }, { point: backDoor, indoors: true },
  { point: { x: westPath, z: backDoor.z } }, { point: { x: westPath, z: lane.z - .7 } },
  ...toFerry.slice(1).map((point) => ({ point })),
]
// The worn route from the back door to the road, shown as stepping stones until the gate is mended.
export const backPath = detour.slice(2, 5).map(({ point }) => point)
const shortcut: Leg[] = [{ point: home }, { point: gateway }, ...toFerry.map((point) => ({ point }))]
const wrenPace = 30 // metres per island hour
const departs = { work: 7, home: 17 }

type MendedStage = 'broken' | 'fixed-today' | 'settled'
export function gateMendedStage({ gateRepair, islandTime }: Pick<Snapshot, 'gateRepair' | 'islandTime'>): MendedStage {
  if (gateRepair.stage !== 'mended' || gateRepair.mendedAt === undefined) return 'broken'
  const dawns = Math.floor(islandTime / daySeconds) - Math.floor(gateRepair.mendedAt / daySeconds)
  return dawns < 1 ? 'fixed-today' : 'settled'
}

export function wrenRoute(state: Pick<Snapshot, 'gateRepair' | 'islandTime'>) {
  return gateMendedStage(state) === 'settled' ? shortcut : detour
}

function along(route: Leg[], metres: number) {
  let left = metres
  for (let i = 1; i < route.length; i++) {
    const [start, end] = [route[i - 1].point, route[i].point]
    const length = distance(start, end)
    if (left <= length) {
      const fraction = length ? left / length : 1
      return { x: start.x + (end.x - start.x) * fraction, z: start.z + (end.z - start.z) * fraction,
        heading: Math.atan2(end.x - start.x, end.z - start.z), indoors: route[i].indoors === true, done: false }
    }
    left -= length
  }
  const last = route[route.length - 1].point
  return { ...last, heading: 0, indoors: false, done: true }
}

export function wrenAt(state: Pick<Snapshot, 'gateRepair' | 'islandTime'>) {
  const { hour } = weatherAt(state.islandTime)
  const route = wrenRoute(state)
  const returning = hour >= departs.home
  const walked = (hour - (returning ? departs.home : departs.work)) * wrenPace
  if (hour < departs.work || walked < 0) return { ...home, heading: Math.PI, walking: false, indoors: false }
  const path = returning ? [...route].reverse().map((leg, i, legs) => ({ point: leg.point, indoors: legs[i - 1]?.indoors })) : route
  const spot = along(path, walked)
  if (spot.done) {
    return returning ? { ...home, heading: Math.PI, walking: false, indoors: false }
      : { ...work, heading: Math.PI / 2, walking: false, indoors: false }
  }
  return { x: spot.x, z: spot.z, heading: spot.heading, walking: true, indoors: spot.indoors }
}

function standing(player: Player) {
  return player.grounded && !player.seat && !player.onBed && !player.swimming && !player.sleeping && !player.truckSurface
}

function atGate(player: Pick<Player, 'x' | 'z'>) {
  return distance(player, gateway) <= actionRadius
}

function atMendingBench(player: Player) {
  return standing(player) && distance(player, mendingBench) < benchRadius
}

function atWren(state: Pick<Snapshot, 'gateRepair' | 'islandTime'>, player: Player) {
  const wren = wrenAt(state)
  return standing(player) && !wren.indoors && distance(player, wren) < wrenRadius &&
    Math.abs(player.y - walkingHeight(wren)) < 1
}

export function toolboxItem(state: Pick<Snapshot, 'items'>) {
  return state.items.find((item) => item.kind === 'toolbox')
}

export function onBench(item: Pick<Item, 'x' | 'z' | 'holder'>) {
  return item.holder === null && distance(item, toolboxHome) < .3
}

// The toolbox is on loan from the moment Wren asks. Once it is back on the bench after the repair, it stays there.
function toolboxPickable(state: Pick<Snapshot, 'gateRepair'>, item: Item) {
  const { stage } = state.gateRepair
  return stage !== 'sagging' && !(stage === 'mended' && onBench(item))
}

function connectedAt(state: GateWorld, id: number | null) {
  const holder = state.players.find((player) => player.id === id)
  return holder?.connected && atGate(holder) ? holder : undefined
}

// Fit needs the acting player, the single unfitted pin and the toolbox at the gate at the same moment.
export function canFit(state: GateWorld, player: Player) {
  if (state.gateRepair.stage !== 'inspected' || !standing(player) || !atGate(player)) return false
  if (!connectedAt(state, state.gateRepair.pinHolder)) return false
  const toolbox = toolboxItem(state)
  if (!toolbox) return false
  return toolbox.holder === null ? atGate(toolbox) : Boolean(connectedAt(state, toolbox.holder))
}

function handsFor(state: GateWorld, player: Player) {
  return state.items.find((item) => item.holder === player.id)
}

// The one pick-up rule, shared by E's item pickup and the gate, so a swing never hides an item in reach.
export function canPickUp(state: Pick<Snapshot, 'gateRepair' | 'mission' | 'jobs'>, item: Item, player: Player) {
  const eligible = item.kind === 'crate' ? deliveryDrop(state) !== undefined
    : item.kind === 'toolbox' ? toolboxPickable(state, item) : state.mission === 'fire'
  return eligible && !item.delivered && item.holder === null && distance(item, player) < 2.7 && Math.abs(item.y - player.y) < 2.1
}

function repairStep(state: GateWorld, player: Player): GateAction | null {
  if (state.gateRepair.stage === 'accepted') return 'inspect'
  if (canFit(state, player)) return 'fit'
  return state.gateRepair.stage === 'fitted' ? 'test' : null
}

interface GateOptions { primary: GateAction[]; secondary: GateAction[] }

// Every gate action open to this player. Primary steps outrank setting down a held item; the secondary
// swing and a general chat with Wren come after picking up anything nearby.
export function gateOptions(state: GateWorld, player: Player): GateOptions {
  const options: GateOptions = { primary: [], secondary: [] }
  if (!standing(player)) return options
  const { stage } = state.gateRepair
  const held = handsFor(state, player)
  const handsFree = !held || held.kind === 'toolbox'
  const nearWren = handsFree && atWren(state, player)
  if (nearWren && stage === 'sagging') options.primary.push('talk')
  if (nearWren && stage === 'mended' && held?.kind === 'toolbox') options.primary.push('return-toolbox')
  const repair = handsFree && atGate(player) ? repairStep(state, player) : null
  if (repair) options.primary.push(repair)
  if (handsFree && stage === 'inspected' && state.gateRepair.pinHolder === null && atMendingBench(player)) options.primary.push('take-pin')
  if (!held && atGate(player)) options.secondary.push(state.gate.open && !state.gate.closePending ? 'close' : 'open')
  if (nearWren && stage !== 'sagging') options.secondary.push('talk')
  return options
}

// Where the reticle finds each gate action: Wren, the bench tray, or the gate itself.
export function gateTarget(state: Pick<Snapshot, 'gateRepair' | 'islandTime'>, action: GateAction) {
  if (action === 'talk' || action === 'return-toolbox') {
    const wren = wrenAt(state)
    return { name: residentName, at: { x: wren.x, y: walkingHeight(wren) + 1.1, z: wren.z }, radius: .55 }
  }
  if (action === 'take-pin') return { name: 'Hinge pins', at: { x: mendingBench.x, y: walkingHeight(mendingBench) + .95, z: mendingBench.z }, radius: .6 }
  return { name: `${residentName}’s gate`, at: { x: gateway.x, y: walkingHeight(gateway) + .85, z: gateway.z }, radius: .8 }
}

export function gateHint(action: GateAction, state: Pick<Snapshot, 'gateRepair'>): [string, string] {
  const broken = state.gateRepair.stage !== 'mended'
  const labels: Record<GateAction, string> = {
    talk: `Talk to ${residentName}`, inspect: 'Inspect the sagging hinge', 'take-pin': 'Take a hinge pin',
    fit: 'Fit the hinge pin', test: 'Swing the gate to test it', open: broken ? 'Try the sagging gate' : 'Open the gate',
    close: 'Close the gate', 'return-toolbox': `Return the toolbox to ${residentName}`,
  }
  return ['E', labels[action]]
}

export const gateStepText: Record<GateStep, string> = {
  inspected: 'Top hinge pin worn through · Fetch a new one at the mending bench by the ferry',
  pin: 'Hinge pin in hand · Bring it and the toolbox to the gate',
  fitted: 'New hinge pin fitted · Swing the gate to test it',
  stuck: 'The gate drags in its groove and sticks',
  recalled: `${residentName} put the toolbox back on the mending bench`,
  returned: `Toolbox back on ${residentName}’s mending bench`,
}

// The leaf angle follows the host gate state. A mended gate swings clear; a sagging one drags short.
export function leafAngle(state: Pick<Snapshot, 'gate' | 'gateRepair'>) {
  if (!state.gate.open) return 0
  return state.gateRepair.stage === 'mended' ? openAngle : sagAngle
}

interface GateSolid {
  x: number; z: number; halfWidth: number; halfDepth: number; floor: number; top: number
  bound: number; cos: number; sin: number; heading: number
}

export function plank(from: Point, to: Point, depth: number, height: number): GateSolid {
  const x = (from.x + to.x) / 2, z = (from.z + to.z) / 2
  const halfWidth = distance(from, to) / 2
  const heading = -Math.atan2(to.z - from.z, to.x - from.x)
  const floor = walkingHeight({ x, z })
  return { x, z, halfWidth, halfDepth: depth / 2, floor, top: floor + height, bound: Math.hypot(halfWidth, depth / 2),
    cos: Math.cos(heading), sin: Math.sin(heading), heading }
}

function leafSolid(angle: number) {
  const tip = { x: hingePost.x + Math.cos(angle) * gateLeaf.length, z: hingePost.z + Math.sin(angle) * gateLeaf.length }
  return plank(hingePost, tip, gateLeaf.thickness, gateLeaf.height)
}

export function solidTop(solids: readonly GateSolid[], point: Point, padding: number) {
  let top = -Infinity
  for (const solid of solids) {
    const dx = point.x - solid.x, dz = point.z - solid.z
    if (Math.abs(dz) > solid.bound + 2 * padding || Math.abs(dx) > solid.bound + 2 * padding) continue
    if (Math.abs(dx * solid.cos - dz * solid.sin) <= solid.halfWidth + padding &&
      Math.abs(dx * solid.sin + dz * solid.cos) <= solid.halfDepth + padding) top = Math.max(top, solid.top)
  }
  return top
}

export function gateBlockers(state: Pick<Snapshot, 'gate' | 'gateRepair'>) {
  return [leafSolid(leafAngle(state))]
}

// The leaf only swings shut once Wren, the crew and any loose cargo are out of the opening.
export function gatewayClear(state: Pick<Snapshot, 'players' | 'items' | 'gateRepair' | 'islandTime'>) {
  const wren = wrenAt(state)
  return distance(wren, gateway) >= 1.5 &&
    state.players.every((player) => !player.connected || distance(player, gateway) >= 1.3) &&
    state.items.every((item) => item.holder !== null || item.delivered || distance(item, gateway) >= 1.3)
}

interface FavorGuide { title: string; detail: string; next: string }

function toolboxWhere(state: Pick<Snapshot, 'items' | 'players'>, player: Player) {
  const toolbox = toolboxItem(state)
  if (!toolbox) return ''
  if (toolbox.holder === player.id) return 'You have the toolbox.'
  const holder = state.players.find((entry) => entry.id === toolbox.holder)
  if (holder) return holder.connected ? 'Your partner has the toolbox.'
    : `Your partner left with the toolbox. Talk to ${residentName} to have it put back on the mending bench.`
  if (onBench(toolbox)) return `The toolbox is on ${residentName}’s mending bench by the ferry approach.`
  return atGate(toolbox) ? 'The toolbox is set down by the gate.' : `The toolbox was left away from the gate. Talk to ${residentName} to get it back.`
}

// Built from the shared snapshot, so a crewmate who joins mid-job sees the same favor.
export function gateRepairGuide(state: Pick<Snapshot, 'gateRepair' | 'items' | 'players' | 'islandTime'>, player: Player): FavorGuide {
  const { stage, pinHolder } = state.gateRepair
  const title = `${residentName}’s gate`
  if (stage === 'sagging') return { title, detail: `${residentName}’s garden gate drags a groove in the path.`,
    next: `Talk to ${residentName} at the lilac-roofed cottage east of the Blue cottage, or at the mending bench by the ferry approach during the day.` }
  if (stage === 'mended') {
    const settled = gateMendedStage(state) === 'settled'
    return { title, detail: 'Gate repaired. The crew earned a favor with Wren.',
      next: settled ? 'Wren uses the gate now. Watch for the short walk through it each morning.'
        : 'Walk with Wren from the cottage tomorrow morning.' }
  }
  const detail = `${residentName}’s top hinge is loose, so the gate drags a groove and sticks.`
  const tools = toolboxWhere(state, player)
  if (stage === 'accepted') return { title, detail, next: `${tools} Inspect the hinge at ${residentName}’s gate, east of the Blue cottage.` }
  if (stage === 'fitted') return { title, detail: 'The new pin is in.', next: 'Swing the gate to test it.' }
  const pin = pinHolder === null ? 'Pick up a hinge pin at the mending bench by the ferry approach.'
    : pinHolder === player.id ? 'You have the hinge pin. Bring it to the gate.' : 'Your partner has the hinge pin.'
  return { title, detail, next: `${tools} ${pin} Fit it at the gate with the toolbox close by.` }
}

// Mission card steps: inspect, fetch a pin, fit it, test the swing.
export function favorProgress({ stage, pinHolder }: GateRepair) {
  return { sagging: 0, accepted: 0, inspected: pinHolder === null ? 1 : 2, fitted: 3, mended: 4 }[stage]
}

// Wren remembers the repair once the crew has earned trust, and greets them differently from the next morning.
export function wrenLines(state: Pick<Snapshot, 'gateRepair' | 'residentTrust' | 'islandTime'>): [string, string] {
  const { stage } = state.gateRepair
  if (stage === 'mended' && state.residentTrust.wren > 0 && gateMendedStage(state) === 'settled') {
    return ['“Morning! The gate swings like new, so I’ve stopped going round the back. I won’t forget who fixed it.”',
      '“If the ferry crew ever needs fittings made, come and find me at the mending bench.”']
  }
  if (stage === 'mended') return ['“Thank you, both of you. I’ll walk through it properly tomorrow morning.”',
    '“Leave the toolbox on my mending bench when you’re finished with it.”']
  if (stage === 'fitted') return ['“That sounds like a new pin going in. Give the gate a swing and see if it clears.”',
    '“If it still drags, have another look at the top hinge.”']
  if (stage === 'inspected') return ['“Worn right through, was it? The spare hinge pins are in the tray on my mending bench by the ferry.”',
    '“Bring a pin and the toolbox to the gate. Either of you can fit it.”']
  return ['“My gate’s top hinge has worked loose. It drags a groove in the path, so I go round the back of the cottage instead.”',
    '“Borrow the toolbox from my mending bench by the ferry. Have a look at the hinge first, then you’ll know which part it needs.”']
}
