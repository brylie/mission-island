import type { InteractionOption, InteractionPolicies } from './interactions/definition.ts'
import { gateMendedStage, gateWidth, gateway, hingePost } from './gate-layout.ts'
import type { Item, Player, Snapshot } from './protocol.ts'
import { residentAt, standing } from './residents/schedule.ts'
import { walkingHeight } from './terrain.ts'
import { distance, mendingBench, toolboxHome, wrenCottage } from './world.ts'
import type { Point } from './world.ts'
import { backPath, wrenSchedule } from './worlds/starter/residents/wren-route.ts'

export { backPath, gateMendedStage, gateway, hingePost }
export { fenceHeight, fenceZ } from './gate-layout.ts'
const residentName = 'Wren'
export const gateFavor = 'wren-gate'
export const favorCoins = 5
export type GateStage = 'sagging' | 'accepted' | 'inspected' | 'fitted' | 'mended'
export interface GateRepair {
  stage: GateStage
  pinHolder: number | null
  acceptedAt?: number
  mendedAt?: number
  // Wren's second repair: after a wet spell the leaf swells and catches until its edge is planed.
  swelling?: 'swollen' | 'planed'
}
export interface GardenGate {
  open: boolean
  closePending: boolean
}
export const gateActions = {
  'inspect': 'explicit',
  'take-pin': 'explicit',
  'fit': 'explicit',
  'test': 'explicit',
  'open': 'explicit',
  'close': 'explicit',
  'return-toolbox': 'explicit',
} as const satisfies InteractionPolicies
export type GateAction = keyof typeof gateActions

export const gateStages: readonly GateStage[] = ['sagging', 'accepted', 'inspected', 'fitted', 'mended']
export type GateStep = 'inspected' | 'pin' | 'fitted' | 'stuck' | 'recalled' | 'returned' | 'caught' | 'planed' | 'clear'
export type GateWorld = Pick<Snapshot, 'gate' | 'gateRepair' | 'items' | 'players' | 'islandTime' | 'mission' | 'jobs' | 'residents'>

export function initialGateRepair() {
  return {
    gate: { open: false, closePending: false } as GardenGate,
    gateRepair: { stage: 'sagging', pinHolder: null } as GateRepair,
  }
}

const front = wrenCottage.z - wrenCottage.d / 2
const fenceZ = gateway.z
export const gateLeaf = { length: 1.06, height: 1.5, thickness: 0.08 }
export const sagAngle = 0.3 // radians: the dragging leaf stops well short of an opening a person fits through
const openAngle = 1.75
export const fenceRuns = [
  { from: { x: wrenCottage.x - 2.6, z: front + 0.7 }, to: { x: wrenCottage.x - 2.6, z: fenceZ } },
  { from: { x: wrenCottage.x + 2.6, z: front + 0.7 }, to: { x: wrenCottage.x + 2.6, z: fenceZ } },
  { from: { x: wrenCottage.x - 2.6, z: fenceZ }, to: { x: hingePost.x - 0.06, z: fenceZ } },
  { from: { x: gateway.x + gateWidth / 2 + 0.06, z: fenceZ }, to: { x: wrenCottage.x + 2.6, z: fenceZ } },
]
const actionRadius = 2.5
const benchRadius = 2
const wrenRadius = 2.4

export function wrenRoute(state: Pick<Snapshot, 'gateRepair' | 'islandTime'>) {
  return wrenSchedule.route(state)
}

export function wrenAt(state: Pick<Snapshot, 'gateRepair' | 'islandTime'>) {
  return residentAt(wrenSchedule, state)
}

export function atGate(player: Pick<Player, 'x' | 'z'>) {
  return distance(player, gateway) <= actionRadius
}

function atMendingBench(player: Player) {
  return standing(player) && distance(player, mendingBench) < benchRadius
}

function atWren(state: Pick<Snapshot, 'gateRepair' | 'islandTime'>, player: Player) {
  const wren = wrenAt(state)
  return standing(player) && !wren.indoors && distance(player, wren) < wrenRadius
    && Math.abs(player.y - walkingHeight(wren)) < 1
}

export function toolboxItem(state: Pick<Snapshot, 'items'>) {
  return state.items.find((item) => item.kind === 'toolbox')
}

export function onBench(item: Pick<Item, 'x' | 'z' | 'holder'>) {
  return item.holder === null && distance(item, toolboxHome) < 0.3
}

// The toolbox is on loan from the moment Wren asks. Once it is back on the bench after the repair, it stays there.
// Once Wren relies on the crew without checking their work, the toolbox is theirs to borrow whenever they like.
export function wrenLendsToolbox(state: Pick<Snapshot, 'residents'>) {
  const wren = state.residents.wren
  return Boolean(wren && wren.trust >= 3 && !wren.breach)
}

export function toolboxPickable(state: Pick<Snapshot, 'gateRepair' | 'residents'>, item: Item) {
  const { stage, swelling } = state.gateRepair
  return stage !== 'sagging' && !(stage === 'mended' && onBench(item) && !swelling && !wrenLendsToolbox(state))
}

function connectedAt(state: GateWorld, id: number | null) {
  const holder = state.players.find((player) => player.id === id)
  return holder?.connected && atGate(holder) ? holder : undefined
}

// Fit needs the acting player, the single unfitted pin and the toolbox at the gate at the same moment.
export function canFit(state: GateWorld, player: Player) {
  if (state.gateRepair.stage !== 'inspected' || !standing(player) || !atGate(player)) return false
  return Boolean(connectedAt(state, state.gateRepair.pinHolder)) && toolboxAtGate(state)
}

// The toolbox counts at the gate when it is set down there or carried by a connected crewmate standing there.
export function toolboxAtGate(state: GateWorld) {
  const toolbox = toolboxItem(state)
  if (!toolbox) return false
  return toolbox.holder === null ? atGate(toolbox) : Boolean(connectedAt(state, toolbox.holder))
}

function handsFor(state: GateWorld, player: Player) {
  return state.items.find((item) => item.holder === player.id)
}

function repairStep(state: GateWorld, player: Player): GateAction | null {
  if (state.gateRepair.stage === 'accepted') return 'inspect'
  if (canFit(state, player)) return 'fit'
  return state.gateRepair.stage === 'fitted' ? 'test' : null
}

interface GateOptions { primary: GateAction[], secondary: GateAction[] }

// Every gate action open to this player. Primary steps outrank setting down a held item; the secondary
// swing comes after picking up anything nearby. Talking to Wren is a resident interaction.
function gateOptions(state: GateWorld, player: Player): GateOptions {
  const options: GateOptions = { primary: [], secondary: [] }
  if (!standing(player)) return options
  const { stage } = state.gateRepair
  const held = handsFor(state, player)
  const handsFree = !held || held.kind === 'toolbox'
  const nearWren = handsFree && atWren(state, player)
  if (nearWren && stage === 'mended' && held?.kind === 'toolbox') options.primary.push('return-toolbox')
  const repair = handsFree && atGate(player) ? repairStep(state, player) : null
  if (repair) options.primary.push(repair)
  if (handsFree && stage === 'inspected' && state.gateRepair.pinHolder === null && atMendingBench(player)) options.primary.push('take-pin')
  if (!held && atGate(player)) options.secondary.push(state.gate.open && !state.gate.closePending ? 'close' : 'open')
  return options
}

// Where the reticle finds each gate action: Wren, the bench tray, or the gate itself.
function gateTarget(state: Pick<Snapshot, 'gateRepair' | 'islandTime'>, action: GateAction) {
  if (action === 'return-toolbox') {
    const wren = wrenAt(state)
    return { name: residentName, at: { x: wren.x, y: walkingHeight(wren) + 1.1, z: wren.z }, radius: 0.55 }
  }
  if (action === 'take-pin') return { name: 'Hinge pins', at: { x: mendingBench.x, y: walkingHeight(mendingBench) + 0.95, z: mendingBench.z }, radius: 0.6 }
  return gateSwingTarget()
}

export function gateSwingTarget() {
  return { name: `${residentName}’s gate`, at: { x: gateway.x, y: walkingHeight(gateway) + 0.85, z: gateway.z }, radius: 0.8 }
}

function gateHint(action: GateAction, state: Pick<Snapshot, 'gateRepair'>): [string, string] {
  const broken = state.gateRepair.stage !== 'mended'
  const labels: Record<GateAction, string> = {
    'inspect': 'Inspect the sagging hinge',
    'take-pin': 'Take a hinge pin',
    'fit': 'Fit the hinge pin',
    'test': 'Swing the gate to test it',
    'open': broken ? 'Try the sagging gate' : 'Open the gate',
    'close': 'Close the gate',
    'return-toolbox': `Return the toolbox to ${residentName}`,
  }
  return ['E', labels[action]]
}

export function gateInteractions(state: GateWorld, player: Player) {
  const { primary, secondary } = gateOptions(state, player)
  function option(action: GateAction): InteractionOption<GateAction> {
    const [key, label] = gateHint(action, state)
    return { action, key, label, ...gateTarget(state, action) }
  }
  return { primary: primary.map(option), secondary: secondary.map(option) }
}

export const gateStepText: Record<GateStep, string> = {
  inspected: 'Top hinge pin worn through · Fetch a new one at the mending bench by the ferry',
  pin: 'Hinge pin in hand · Bring it and the toolbox to the gate',
  fitted: 'New hinge pin fitted · Swing the gate to test it',
  stuck: 'The gate drags in its groove and sticks',
  recalled: `${residentName} put the toolbox back on the mending bench`,
  returned: `Toolbox back on ${residentName}’s mending bench`,
  caught: 'The gate catches on its swollen edge · Plane it with the toolbox, then swing it again',
  planed: 'Swollen edge planed · Swing the gate to check it',
  clear: `The gate swings clear · Tell ${residentName} it is fixed`,
}

// The leaf angle follows the host gate state. A mended gate swings clear; a sagging or swollen one stops short.
export function leafAngle(state: Pick<Snapshot, 'gate' | 'gateRepair'>) {
  if (!state.gate.open) return 0
  return state.gateRepair.stage === 'mended' && state.gateRepair.swelling !== 'swollen' ? openAngle : sagAngle
}

interface GateSolid {
  x: number
  z: number
  halfWidth: number
  halfDepth: number
  floor: number
  top: number
  bound: number
  cos: number
  sin: number
  heading: number
}

export function plank(from: Point, to: Point, depth: number, height: number): GateSolid {
  const x = (from.x + to.x) / 2, z = (from.z + to.z) / 2
  const halfWidth = distance(from, to) / 2
  const heading = -Math.atan2(to.z - from.z, to.x - from.x)
  const floor = walkingHeight({ x, z })
  return { x, z, halfWidth, halfDepth: depth / 2, floor, top: floor + height, bound: Math.hypot(halfWidth, depth / 2), cos: Math.cos(heading), sin: Math.sin(heading), heading }
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
    if (Math.abs(dx * solid.cos - dz * solid.sin) <= solid.halfWidth + padding
      && Math.abs(dx * solid.sin + dz * solid.cos) <= solid.halfDepth + padding) top = Math.max(top, solid.top)
  }
  return top
}

export function gateBlockers(state: Pick<Snapshot, 'gate' | 'gateRepair'>) {
  return [leafSolid(leafAngle(state))]
}

// The leaf only swings shut once Wren, the crew and any loose cargo are out of the opening.
export function gatewayClear(state: Pick<Snapshot, 'players' | 'items' | 'gateRepair' | 'islandTime'>) {
  const wren = wrenAt(state)
  return distance(wren, gateway) >= 1.5
    && state.players.every((player) => !player.connected || distance(player, gateway) >= 1.3)
    && state.items.every((item) => item.holder !== null || item.delivered || distance(item, gateway) >= 1.3)
}

interface FavorGuide { title: string, detail: string, next: string }

function toolboxWhere(state: Pick<Snapshot, 'items' | 'players'>, player: Player) {
  const toolbox = toolboxItem(state)
  if (!toolbox) return ''
  if (toolbox.holder === player.id) return 'You have the toolbox.'
  const holder = state.players.find((entry) => entry.id === toolbox.holder)
  if (holder) return holder.connected
    ? 'Your partner has the toolbox.'
    : `Your partner left with the toolbox. Talk to ${residentName} to have it put back on the mending bench.`
  if (onBench(toolbox)) return `The toolbox is on ${residentName}’s mending bench by the ferry yard.`
  return atGate(toolbox) ? 'The toolbox is set down by the gate.' : `The toolbox was left away from the gate. Talk to ${residentName} to get it back.`
}

// Built from the shared snapshot, so a crewmate who joins mid-job sees the same favor.
export function gateRepairGuide(state: Pick<Snapshot, 'gateRepair' | 'items' | 'players' | 'islandTime'>, player: Player): FavorGuide {
  const { stage, pinHolder } = state.gateRepair
  const title = `${residentName}’s gate`
  if (stage === 'sagging') return { title, detail: `${residentName}’s garden gate drags a groove in the path.`, next: `Talk to ${residentName} at the lilac-roofed cottage east of the Blue cottage, or at the mending bench by the ferry freight yard during the day.` }
  if (stage === 'mended') {
    const settled = gateMendedStage(state) === 'settled'
    return { title, detail: 'Gate repaired. The crew earned a favor with Wren.', next: settled
      ? 'Wren uses the gate now. Watch for the short walk through it each morning.'
      : 'Walk with Wren from the cottage tomorrow morning.' }
  }
  const detail = `${residentName}’s top hinge is loose, so the gate drags a groove and sticks.`
  const tools = toolboxWhere(state, player)
  if (stage === 'accepted') return { title, detail, next: `${tools} Inspect the hinge at ${residentName}’s gate, east of the Blue cottage.` }
  if (stage === 'fitted') return { title, detail: 'The new pin is in.', next: 'Swing the gate to test it.' }
  const pin = pinHolder === null
    ? 'Pick up a hinge pin at the mending bench by the ferry freight yard.'
    : pinHolder === player.id ? 'You have the hinge pin. Bring it to the gate.' : 'Your partner has the hinge pin.'
  return { title, detail, next: `${tools} ${pin} Fit it at the gate with the toolbox close by.` }
}

// Mission card steps: inspect, fetch a pin, fit it, test the swing.
export function favorProgress({ stage, pinHolder }: GateRepair) {
  return { sagging: 0, accepted: 0, inspected: pinHolder === null ? 1 : 2, fitted: 3, mended: 4 }[stage]
}

// Wren remembers the repair once the crew has earned trust, and greets them differently from the next morning.
export function wrenLines(state: Pick<Snapshot, 'gateRepair' | 'islandTime'>, kept: readonly string[]): [string, string] {
  const { stage } = state.gateRepair
  if (stage === 'mended' && kept.includes(gateFavor) && gateMendedStage(state) === 'settled') {
    return ['“Morning! The gate swings like new, so I’ve stopped going round the back. I won’t forget who fixed it.”', '“If the ferry crew ever needs fittings made, come and find me at the mending bench.”']
  }
  if (stage === 'mended') return ['“Thank you, both of you. I’ll walk through it properly tomorrow morning.”', '“Leave the toolbox on my mending bench when you’re finished with it.”']
  if (stage === 'fitted') return ['“That sounds like a new pin going in. Give the gate a swing and see if it clears.”', '“If it still drags, have another look at the top hinge.”']
  if (stage === 'inspected') return ['“Worn right through, was it? The spare hinge pins are in the tray on my mending bench by the ferry.”', '“Bring a pin and the toolbox to the gate. Either of you can fit it.”']
  return ['“My gate’s top hinge has worked loose. It drags a groove in the path, so I go round the back of the cottage instead.”', '“Borrow the toolbox from my mending bench by the ferry. Have a look at the hinge first, then you’ll know which part it needs.”']
}
