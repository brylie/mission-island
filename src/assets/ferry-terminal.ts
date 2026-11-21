import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { playerColors } from './crew'
import type { MeshFactory } from '../island-meshes'
import { groundHeight, waterLevel } from '../terrain'
import { ferryTerminal } from '../world'
import { ferryBarrier, ferryYard, rampDeck, tallyBoard, tallyControlOffsetX, timberPickups, timberSlipHeight, yardDrop } from '../worlds/starter/ferry-terminal'

interface DeckSegment { halfWidth: number, z: number, top: number }
interface TallySize { stages: number, coins: number, crates: number }

const steel = '#4c6461', stripe = '#f7cf79', barrierRed = '#aa622f', freshWood = '#c79a63', oldWood = '#87674d'
const empty = '#5d5a52', lamp = '#ffe6a3', unlit = '#6d6a60', done = '#7fbf7a'

// The striped barrier and its arm. Down, it closes the lane. Raised, it stands upright beside the open ramp.
function barrierArm({ box }: MeshFactory, root: TransformNode, y: number) {
  const { x, z, width } = ferryTerminal
  box(0, 0, 0, width, 0.32, 0.19, barrierRed, root)
  for (const dx of [-2.2, -1.45, -0.7, 0.05, 0.8, 1.55, 2.3]) {
    box(dx, 0.01, 0.1, 0.24, 0.33, 0.02, stripe, root, false).rotation.z = -0.42
  }
  root.position.set(x, y + 0.78, z)
}

function group(meshes: MeshFactory, name: string) {
  return new TransformNode(name, meshes.scene)
}

// Stage 0 shows the gap. Stage 1 braces the landing, stage 2 lays the deck, and the restored ramp opens the barrier.
function landing(meshes: MeshFactory, y: number, deck: readonly DeckSegment[]) {
  const { box, paintSurface } = meshes
  const { x, width } = ferryTerminal
  const wood = paintSurface('wood', oldWood)
  const broken = group(meshes, 'Ferry landing · broken')
  box(x, y - 0.08, -38, width, 0.23, 4, paintSurface('concrete', '#7f8479'), broken)
  for (const [i, boardZ] of [-40.3, -41, -41.7, -44, -44.7, -45.4, -46.1].entries()) {
    const last = i === 2 || i === 3
    const plank = box(x + (last ? 0.62 : 0), waterLevel + 0.23 - (last ? 0.16 : 0), boardZ, last ? width - 1.45 : width, 0.22, 0.66, wood, broken)
    if (last) plank.rotation.z = i === 2 ? -0.065 : 0.1
  }
  const braced = group(meshes, 'Ferry landing · braced')
  for (const side of [-1, 1]) {
    const edge = x + side * (width / 2 - 0.2)
    for (const z of [-38.5, -41.2, -43.9, -46.5]) {
      box(edge, (waterLevel - 1.2 + 0.1) / 2, z, 0.34, 1.4, 0.34, steel, braced)
      box(edge, 0.06, z, 0.5, 0.1, 0.5, '#8a8f86', braced)
    }
    const brace = box(edge, -0.45, -42.5, 0.12, 0.12, 8.2, freshWood, braced)
    brace.rotation.x = 0.09
  }
  for (const z of [-38.5, -41.2, -43.9, -46.5]) box(x, 0, z, width, 0.14, 0.22, freshWood, braced)
  const scaffold = group(meshes, 'Ferry landing · scaffold')
  for (const side of [-1, 1]) for (const z of [-38, -45]) box(x + side * 3.3, 1.2, z, 0.08, 2.6, 0.08, '#b8b2a4', scaffold)
  for (const side of [-1, 1]) box(x + side * 3.3, 2.3, -41.5, 0.08, 0.08, 7.2, '#b8b2a4', scaffold)
  const decked = group(meshes, 'Ferry landing · new deck')
  const deckWood = paintSurface('wood', freshWood)
  for (const solid of deck) {
    const length = solid.halfWidth * 2
    for (let along = -length / 2 + 0.17; along < length / 2; along += 0.36) {
      box(x, solid.top - 0.06, solid.z + along, width - 0.1, 0.12, 0.32, deckWood, decked)
    }
  }
  for (const side of [-1, 1]) {
    box(x + side * (width / 2 - 0.06), (rampDeck.nearTop + rampDeck.farTop) / 2 + 0.55, (rampDeck.near + rampDeck.far) / 2, 0.1, 0.1, rampDeck.near - rampDeck.far, '#d9d3c4', decked)
    for (let z = rampDeck.near - 0.4; z > rampDeck.far; z -= 2.7) box(x + side * (width / 2 - 0.06), 0.35, z, 0.1, 0.7, 0.1, '#d9d3c4', decked)
  }
  return { broken, braced, scaffold, decked }
}

// A tall gantry just past the barrier, so the ferry works read from the bend in Harbor Depot road. Its sign
// clears the flatbed's chase camera, which passes beneath it onto the ramp.
const gantryZ = -33.2
function gantry(meshes: MeshFactory, y: number) {
  const { box } = meshes
  const { x } = ferryTerminal
  for (const side of [-1, 1]) box(x + side * 3.6, y + 3.2, gantryZ, 0.26, 6.4, 0.26, steel)
  box(x, y + 6.3, gantryZ, 7.5, 0.36, 0.3, steel)
  box(x, y + 5.7, gantryZ + 0.15, 3.4, 0.8, 0.08, '#1f5d73')
  for (const dx of [-1.2, -0.4, 0.4, 1.2]) box(x + dx, y + 5.7, gantryZ + 0.2, 0.42, 0.5, 0.02, '#f2ecd8', undefined, false)
  // Meshes without a parent are merged into static batches, so each switchable piece gets its own node.
  const [lit, dark, soon, open] = ['lamps lit', 'lamps dark', 'opening soon', 'service open'].map((name) => group(meshes, `Ferry gantry · ${name}`))
  for (const side of [-1, 1]) {
    box(x + side * 2.9, y + 5.95, gantryZ + 0.2, 0.34, 0.22, 0.2, lamp, lit, false)
    box(x + side * 2.9, y + 5.95, gantryZ + 0.2, 0.34, 0.22, 0.2, unlit, dark, false)
  }
  // Status boards hang on the west gantry post, outside the lane.
  box(x - 3.6, y + 1.6, gantryZ + 0.2, 0.9, 0.6, 0.06, '#f0b54b', soon)
  box(x - 3.6, y + 1.6, gantryZ + 0.2, 0.9, 0.6, 0.06, '#5aa66b', open)
  return { lit, dark, soon, open }
}

// The tally board: three stage pips, a coin bar and a timber bar coloured by whoever gave each part.
function tally(meshes: MeshFactory, size: TallySize) {
  const { box } = meshes
  const y = groundHeight(tallyBoard)
  const root = group(meshes, 'Ferry tally board')
  root.position.set(tallyBoard.x, y, tallyBoard.z)
  root.rotation.y = tallyBoard.heading
  for (const dx of [-0.95, 0.95]) box(dx, 0.95, 0, 0.12, 1.9, 0.12, oldWood, root)
  box(0, 1.5, 0, 1.9, 1.05, 0.06, '#e9e1c8', root)
  box(-tallyControlOffsetX, 1.02, 0.08, 0.3, 0.26, 0.22, '#3f5d5a', root)
  box(tallyControlOffsetX, timberSlipHeight, 0.06, 0.26, 0.34, 0.03, '#f7f2e2', root)
  const unfilledSwatches = ['#e9e1c8', empty]
  const swatches = [...unfilledSwatches, ...playerColors, done]
  const cell = (dx: number, dy: number, width: number) => swatches.map((color) => box(dx, dy, 0.04, width, 0.1, 0.02, color, root, false))
  const { coins: maxCoins, crates: maxCrates } = size
  const pips = Array.from({ length: size.stages }, (_, i) => cell(-0.4 + i * 0.4, 1.88, 0.3))
  const coins = Array.from({ length: maxCoins }, (_, i) => cell(-0.8 + i * (1.6 / maxCoins), 1.6, 1.6 / maxCoins - 0.02))
  const crates = Array.from({ length: maxCrates }, (_, i) => cell(-0.8 + i * (1.6 / maxCrates), 1.3, 1.6 / maxCrates - 0.04))
  return { pips, coins, crates, firstCrewSwatch: unfilledSwatches.length, completedSwatch: swatches.length - 1 }
}

// The freight yard pad beside the lane, its stacked timber, and the Seabrook stack where timber is collected.
function yard(meshes: MeshFactory) {
  const { box, paintSurface } = meshes
  const { minX, maxX, minZ, maxZ } = ferryYard
  box((minX + maxX) / 2, 0.03, (minZ + maxZ) / 2, maxX - minX, 0.06, maxZ - minZ, paintSurface('gravel'), undefined, false)
  for (const z of [minZ + 0.2, maxZ - 0.2]) box((minX + maxX) / 2 + 0.5, 0.065, z, maxX - minX - 1, 0.01, 0.12, '#ece5cf', undefined, false)
  box(maxX - 0.2, 0.065, (minZ + maxZ) / 2, 0.12, 0.01, maxZ - minZ - 0.4, '#ece5cf', undefined, false)
  box(yardDrop.x, 0.07, yardDrop.z, 2.6, 0.14, 1.4, oldWood)
  const timber = paintSurface('wood', freshWood)
  const stacked = [0, 1, 2].map((i) => {
    const bundle = group(meshes, 'Ferry yard timber')
    box(yardDrop.x - 0.9 + i * 0.9, 0.55, yardDrop.z, 0.84, 0.84, 1.3, timber, bundle)
    return bundle
  })
  const [first] = timberPickups
  const last = timberPickups[timberPickups.length - 1]
  box((first.x + last.x) / 2, 0.07, first.z, last.x - first.x + 1.4, 0.14, 1.3, oldWood)
  box(last.x + 1.1, 0.7, first.z + 0.2, 0.08, 1.4, 0.08, oldWood)
  box(last.x + 1.1, 1.3, first.z + 0.2, 0.7, 0.45, 0.05, freshWood)
  return stacked
}

export function createFerryTerminalModel(meshes: MeshFactory, deck: readonly DeckSegment[], tallySize: TallySize) {
  const { box, paintSurface } = meshes
  const { x, z, width } = ferryTerminal
  const y = groundHeight(ferryTerminal)
  const concrete = paintSurface('concrete', '#92978b')
  box(x, y - 0.08, (z + rampDeck.near) / 2, width, 0.23, z - rampDeck.near, concrete)
  for (const side of [-1, 1]) {
    const edge = x + side * (width / 2 - 0.12)
    box(edge, y + ferryBarrier.height / 2, z, ferryBarrier.thickness, ferryBarrier.height, ferryBarrier.thickness, oldWood)
    box(edge, y + 0.44, (z + rampDeck.near) / 2 - 0.3, 0.18, 0.8, z - rampDeck.near - 0.6, concrete)
    box(edge, waterLevel - 0.85, -43.9, 0.32, 2.4, 0.32, steel)
  }
  const down = group(meshes, 'Ferry barrier · down')
  barrierArm(meshes, down, y)
  const raised = group(meshes, 'Ferry barrier · raised')
  barrierArm(meshes, raised, y)
  raised.position.set(x - width / 2 + 0.12, y + width / 2 + 0.7, z)
  raised.rotation.z = Math.PI / 2
  const stages = landing(meshes, y, deck)
  const signs = gantry(meshes, y)
  const board = tally(meshes, tallySize)
  const stackedTimber = yard(meshes)
  return { down, raised, stages, signs, board, stackedTimber }
}
