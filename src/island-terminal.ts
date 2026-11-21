import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import { playerColors } from './assets/crew'
import { deckSolids, ferryStages, stageNeeds } from './ferry-repair'
import type { MeshFactory } from './island-meshes'
import type { Snapshot } from './protocol'
import { groundHeight, waterLevel } from './terrain'
import { ferryTerminal } from './world'
import { ferryYard, rampDeck, tallyBoard, timberPickups, yardDrop } from './worlds/starter/ferry-terminal'

const steel = '#4c6461', stripe = '#f7cf79', barrierRed = '#aa622f', freshWood = '#c79a63', oldWood = '#87674d'
const empty = '#5d5a52', lamp = '#ffe6a3', unlit = '#6d6a60', done = '#7fbf7a'

// The striped barrier and its arm. Down, it closes the lane. Raised, it stands upright beside the open ramp.
function barrierArm({ box }: MeshFactory, root: TransformNode, y: number) {
  const { x, z, width } = ferryTerminal
  box(0, 0, 0, width, .32, .19, barrierRed, root)
  for (const dx of [-2.2, -1.45, -.7, .05, .8, 1.55, 2.3]) {
    box(dx, .01, .1, .24, .33, .02, stripe, root, false).rotation.z = -.42
  }
  root.position.set(x, y + .78, z)
}

function group(meshes: MeshFactory, name: string) {
  return new TransformNode(name, meshes.scene)
}

// Stage 0 shows the gap. Stage 1 braces the landing, stage 2 lays the deck, and the restored ramp opens the barrier.
function landing(meshes: MeshFactory, y: number) {
  const { box, paintSurface } = meshes
  const { x, width } = ferryTerminal
  const wood = paintSurface('wood', oldWood)
  const broken = group(meshes, 'Ferry landing · broken')
  box(x, y - .08, -38, width, .23, 4, paintSurface('concrete', '#7f8479'), broken)
  for (const [i, boardZ] of [-40.3, -41, -41.7, -44, -44.7, -45.4, -46.1].entries()) {
    const last = i === 2 || i === 3
    const plank = box(x + (last ? .62 : 0), waterLevel + .23 - (last ? .16 : 0), boardZ, last ? width - 1.45 : width, .22, .66, wood, broken)
    if (last) plank.rotation.z = i === 2 ? -.065 : .1
  }
  const braced = group(meshes, 'Ferry landing · braced')
  for (const side of [-1, 1]) {
    const edge = x + side * (width / 2 - .2)
    for (const z of [-38.5, -41.2, -43.9, -46.5]) {
      box(edge, (waterLevel - 1.2 + .1) / 2, z, .34, 1.4, .34, steel, braced)
      box(edge, .06, z, .5, .1, .5, '#8a8f86', braced)
    }
    const brace = box(edge, -.45, -42.5, .12, .12, 8.2, freshWood, braced)
    brace.rotation.x = .09
  }
  for (const z of [-38.5, -41.2, -43.9, -46.5]) box(x, 0, z, width, .14, .22, freshWood, braced)
  const scaffold = group(meshes, 'Ferry landing · scaffold')
  for (const side of [-1, 1]) for (const z of [-38, -45]) box(x + side * 3.3, 1.2, z, .08, 2.6, .08, '#b8b2a4', scaffold)
  for (const side of [-1, 1]) box(x + side * 3.3, 2.3, -41.5, .08, .08, 7.2, '#b8b2a4', scaffold)
  const decked = group(meshes, 'Ferry landing · new deck')
  const deckWood = paintSurface('wood', freshWood)
  for (const solid of deckSolids) {
    const length = solid.halfWidth * 2
    for (let along = -length / 2 + .17; along < length / 2; along += .36) {
      box(x, solid.top - .06, solid.z + along, width - .1, .12, .32, deckWood, decked)
    }
  }
  for (const side of [-1, 1]) {
    box(x + side * (width / 2 - .06), (rampDeck.nearTop + rampDeck.farTop) / 2 + .55, (rampDeck.near + rampDeck.far) / 2,
      .1, .1, rampDeck.near - rampDeck.far, '#d9d3c4', decked)
    for (let z = rampDeck.near - .4; z > rampDeck.far; z -= 2.7) box(x + side * (width / 2 - .06), .35, z, .1, .7, .1, '#d9d3c4', decked)
  }
  return { broken, braced, scaffold, decked }
}

// A tall gantry just past the barrier, so the ferry works read from the bend in Harbor Depot road. Its sign
// clears the flatbed's chase camera, which passes beneath it onto the ramp.
const gantryZ = -33.2
function gantry(meshes: MeshFactory, y: number) {
  const { box } = meshes
  const { x } = ferryTerminal
  for (const side of [-1, 1]) box(x + side * 3.6, y + 3.2, gantryZ, .26, 6.4, .26, steel)
  box(x, y + 6.3, gantryZ, 7.5, .36, .3, steel)
  box(x, y + 5.7, gantryZ + .15, 3.4, .8, .08, '#1f5d73')
  for (const dx of [-1.2, -.4, .4, 1.2]) box(x + dx, y + 5.7, gantryZ + .2, .42, .5, .02, '#f2ecd8', undefined, false)
  // Meshes without a parent are merged into static batches, so each switchable piece gets its own node.
  const [lit, dark, soon, open] = ['lamps lit', 'lamps dark', 'opening soon', 'service open'].map((name) => group(meshes, `Ferry gantry · ${name}`))
  for (const side of [-1, 1]) {
    box(x + side * 2.9, y + 5.95, gantryZ + .2, .34, .22, .2, lamp, lit, false)
    box(x + side * 2.9, y + 5.95, gantryZ + .2, .34, .22, .2, unlit, dark, false)
  }
  // Status boards hang on the west gantry post, outside the lane.
  box(x - 3.6, y + 1.6, gantryZ + .2, .9, .6, .06, '#f0b54b', soon)
  box(x - 3.6, y + 1.6, gantryZ + .2, .9, .6, .06, '#5aa66b', open)
  return { lit, dark, soon, open }
}

// The tally board: three stage pips, a coin bar and a timber bar coloured by whoever gave each part.
function tally(meshes: MeshFactory) {
  const { box } = meshes
  const y = groundHeight(tallyBoard)
  const root = group(meshes, 'Ferry tally board')
  root.position.set(tallyBoard.x, y, tallyBoard.z)
  root.rotation.y = tallyBoard.heading
  for (const dx of [-.95, .95]) box(dx, .95, 0, .12, 1.9, .12, oldWood, root)
  box(0, 1.5, 0, 1.9, 1.05, .06, '#e9e1c8', root)
  box(-.85, 1.02, .08, .3, .26, .22, '#3f5d5a', root)
  box(.85, 1.15, .06, .26, .34, .03, '#f7f2e2', root)
  const swatches = ['#e9e1c8', empty, ...playerColors, done]
  const cell = (dx: number, dy: number, width: number) => swatches.map((color) => box(dx, dy, .04, width, .1, .02, color, root, false))
  const maxCoins = Math.max(...ferryStages.map(({ coins }) => coins)), maxCrates = Math.max(...ferryStages.map(({ crates }) => crates))
  const pips = ferryStages.map((_, i) => cell(-.4 + i * .4, 1.88, .3))
  const coins = Array.from({ length: maxCoins }, (_, i) => cell(-.8 + i * (1.6 / maxCoins), 1.6, 1.6 / maxCoins - .02))
  const crates = Array.from({ length: maxCrates }, (_, i) => cell(-.8 + i * (1.6 / maxCrates), 1.3, 1.6 / maxCrates - .04))
  const show = (options: Mesh[], index: number) => options.forEach((mesh, i) => mesh.setEnabled(i === index))
  const owners = (ledger: number[], needed: number, length: number) => {
    const slots = ledger.flatMap((amount, slot) => Array.from({ length: amount }, () => slot + 2))
    return Array.from({ length }, (_, i) => i < slots.length ? slots[i] : i < needed ? 1 : 0)
  }
  return (state: Pick<Snapshot, 'ferryRepair'>) => {
    const { ferryRepair } = state
    const needs = stageNeeds(state)
    const ledger = ferryRepair.ledger[ferryRepair.stage]
    pips.forEach((options, i) => show(options, i < ferryRepair.stage ? swatches.length - 1 : i === ferryRepair.stage ? 1 : 0))
    const coinCells = needs && ledger ? owners(ledger.coins, needs.coins, maxCoins) : coins.map(() => swatches.length - 1)
    const crateCells = needs && ledger ? owners(ledger.crates, needs.crates, maxCrates) : crates.map(() => swatches.length - 1)
    coins.forEach((options, i) => show(options, coinCells[i]))
    crates.forEach((options, i) => show(options, crateCells[i]))
  }
}

// The freight yard pad beside the lane, its stacked timber, and the Seabrook stack where timber is collected.
function yard(meshes: MeshFactory) {
  const { box, paintSurface } = meshes
  const { minX, maxX, minZ, maxZ } = ferryYard
  box((minX + maxX) / 2, .03, (minZ + maxZ) / 2, maxX - minX, .06, maxZ - minZ, paintSurface('gravel'), undefined, false)
  for (const z of [minZ + .2, maxZ - .2]) box((minX + maxX) / 2 + .5, .065, z, maxX - minX - 1, .01, .12, '#ece5cf', undefined, false)
  box(maxX - .2, .065, (minZ + maxZ) / 2, .12, .01, maxZ - minZ - .4, '#ece5cf', undefined, false)
  box(yardDrop.x, .07, yardDrop.z, 2.6, .14, 1.4, oldWood)
  const timber = paintSurface('wood', freshWood)
  const stacked = [0, 1, 2].map((i) => {
    const bundle = group(meshes, 'Ferry yard timber')
    box(yardDrop.x - .9 + i * .9, .55, yardDrop.z, .84, .84, 1.3, timber, bundle)
    return bundle
  })
  const [first] = timberPickups
  const last = timberPickups[timberPickups.length - 1]
  box((first.x + last.x) / 2, .07, first.z, last.x - first.x + 1.4, .14, 1.3, oldWood)
  box(last.x + 1.1, .7, first.z + .2, .08, 1.4, .08, oldWood)
  box(last.x + 1.1, 1.3, first.z + .2, .7, .45, .05, freshWood)
  return (state: Pick<Snapshot, 'ferryRepair'>) => {
    const count = stageNeeds(state)?.cratesGiven ?? 0
    stacked.forEach((mesh, i) => mesh.setEnabled(i < count))
  }
}

export function createFerryTerminal(meshes: MeshFactory) {
  const { box, paintSurface } = meshes
  const { x, z, width } = ferryTerminal
  const y = groundHeight(ferryTerminal)
  const concrete = paintSurface('concrete', '#92978b')
  box(x, y - .08, (z + rampDeck.near) / 2, width, .23, z - rampDeck.near, concrete)
  for (const side of [-1, 1]) {
    const edge = x + side * (width / 2 - .12)
    box(edge, y + .56, z, .24, 1.12, .24, oldWood)
    box(edge, y + .44, (z + rampDeck.near) / 2 - .3, .18, .8, z - rampDeck.near - .6, concrete)
    box(edge, waterLevel - .85, -43.9, .32, 2.4, .32, steel)
  }
  const down = group(meshes, 'Ferry barrier · down')
  barrierArm(meshes, down, y)
  const raised = group(meshes, 'Ferry barrier · raised')
  barrierArm(meshes, raised, y)
  raised.position.set(x - width / 2 + .12, y + width / 2 + .7, z)
  raised.rotation.z = Math.PI / 2
  const stages = landing(meshes, y)
  const signs = gantry(meshes, y)
  const updateTally = tally(meshes)
  const updateYard = yard(meshes)
  let shown = ''

  function update(state: Pick<Snapshot, 'ferryRepair'>) {
    const { stage, ledger, haul } = state.ferryRepair
    const key = `${stage}:${haul}:${JSON.stringify(ledger[stage] ?? null)}`
    if (key === shown) return
    shown = key
    const restored = stage >= ferryStages.length
    down.setEnabled(!restored)
    raised.setEnabled(restored)
    stages.broken.setEnabled(stage === 0)
    stages.braced.setEnabled(stage >= 1)
    stages.scaffold.setEnabled(stage >= 1 && !restored)
    stages.decked.setEnabled(stage >= 2)
    signs.soon.setEnabled(stage === 2)
    signs.open.setEnabled(restored)
    signs.lit.setEnabled(restored)
    signs.dark.setEnabled(!restored)
    updateTally(state)
    updateYard(state)
  }

  update({ ferryRepair: { stage: 0, ledger: [{ coins: [0, 0], crates: [0, 0] }], haul: 0 } })
  return { update }
}
