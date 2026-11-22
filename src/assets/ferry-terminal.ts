import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { playerColors } from './crew'
import type { MeshFactory } from '../island-meshes'
import { groundHeight, waterLevel } from '../terrain'
import { ferryTerminal } from '../world'
import { ferryBarrier, ferryYard, rampDeck, tallyBoard, tallyControlOffsetX, timberPickups, timberSlipHeight, yardDrop } from '../worlds/starter/ferry-terminal'
import {
  ferryApproachModel,
  ferryBarrierModel,
  ferryGantryModel,
  ferryLandingModel,
  ferryTallyModel,
  ferryTerminalFinishes as finish,
  ferryYardModel,
} from './geometry/ferry-terminal-model'

interface DeckSegment { halfWidth: number, z: number, top: number }
interface TallySize { stages: number, coins: number, crates: number }

const half = 0.5
const quarterTurn = Math.PI * half
const sides = [-1, 1] as const

// The raised arm uses the same striped model and moves aside to clear the ramp.
function barrierArm({ box }: MeshFactory, root: TransformNode, y: number) {
  const { x, z, width } = ferryTerminal
  const { arm, stripes } = ferryBarrierModel
  box(0, 0, 0, width, arm.height, arm.thickness, finish.barrier, root)
  for (const dx of stripes.x) {
    box(dx, stripes.centerY, stripes.centerZ, ...stripes.size, finish.barrierStripe, root, false).rotation.z = stripes.roll
  }
  root.position.set(x, y + arm.centerY, z)
}

function group(meshes: MeshFactory, name: string) {
  return new TransformNode(name, meshes.scene)
}

// Stage 0 shows the gap. The remaining layers are added as work progresses.
function landing(meshes: MeshFactory, y: number, deck: readonly DeckSegment[]) {
  const { box, paintSurface } = meshes
  const { x, width } = ferryTerminal
  const { near, far, nearTop, farTop } = rampDeck
  const { broken: gap, braced: support, scaffold: frame, deck: decking } = ferryLandingModel
  const wood = paintSurface('wood', finish.weatheredWood)
  const broken = group(meshes, 'Ferry landing · broken')
  const { slab, board, looseEnd } = gap
  box(x, y - slab.drop, near + slab.offsetZ, width, slab.thickness, slab.depth, paintSurface('concrete', finish.brokenConcrete), broken)
  for (const { offsetZ, roll } of gap.boards) {
    const loose = roll !== null
    const plank = box(
      x + (loose ? looseEnd.offsetX : 0),
      waterLevel + board.riseAboveWater - (loose ? looseEnd.drop : 0),
      near + offsetZ,
      loose ? width - looseEnd.widthLoss : width,
      board.height,
      board.depth,
      wood,
      broken,
    )
    if (loose) plank.rotation.z = roll
  }

  const braced = group(meshes, 'Ferry landing · braced')
  const { pile, pileCap, diagonal, tie } = support
  for (const side of sides) {
    const edge = x + side * (width * half - support.edgeInset)
    for (const offsetZ of support.pileOffsetsZ) {
      const z = near + offsetZ
      box(edge, (waterLevel - pile.embedDepth + pile.capY) * half, z, ...pile.size, finish.steel, braced)
      box(edge, pileCap.centerY, z, ...pileCap.size, finish.pileCap, braced)
    }
    box(edge, diagonal.centerY, near + diagonal.offsetZ, ...diagonal.size, finish.freshWood, braced).rotation.x = diagonal.tilt
  }
  for (const offsetZ of support.pileOffsetsZ) box(x, 0, near + offsetZ, width, tie.height, tie.depth, finish.freshWood, braced)

  const scaffold = group(meshes, 'Ferry landing · scaffold')
  const { uprights, ledger } = frame
  for (const side of sides) {
    for (const offsetZ of uprights.offsetsZ) box(x + side * frame.sideOffset, uprights.centerY, near + offsetZ, ...uprights.size, finish.scaffold, scaffold)
  }
  for (const side of sides) box(x + side * frame.sideOffset, ledger.centerY, near + ledger.offsetZ, ...ledger.size, finish.scaffold, scaffold)

  const decked = group(meshes, 'Ferry landing · new deck')
  const deckWood = paintSurface('wood', finish.freshWood)
  const { plank, rail, posts } = decking
  for (const solid of deck) {
    for (let along = -solid.halfWidth + plank.endInset; along < solid.halfWidth; along += plank.spacing) {
      box(x, solid.top - plank.drop, solid.z + along, width - plank.widthClearance, plank.height, plank.depth, deckWood, decked)
    }
  }
  for (const side of sides) {
    const edge = x + side * (width * half - rail.sideInset)
    box(edge, (nearTop + farTop) * half + rail.rise, (near + far) * half, rail.width, rail.height, near - far, finish.handrail, decked)
    for (let z = near - posts.endInset; z > far; z -= posts.spacing) box(edge, posts.centerY, z, ...posts.size, finish.handrail, decked)
  }
  return { broken, braced, scaffold, decked }
}

// The gantry clears the flatbed and its chase camera on the approach to the ramp.
function gantry(meshes: MeshFactory, y: number) {
  const { box } = meshes
  const { x, z: barrierZ } = ferryTerminal
  const { offsetZ, uprights, crossbeam, sign, letters, lamps, status } = ferryGantryModel
  const z = barrierZ + offsetZ
  for (const side of sides) box(x + side * uprights.x, y + uprights.y, z, ...uprights.size, finish.steel)
  box(x, y + crossbeam.y, z, ...crossbeam.size, finish.steel)
  box(x, y + sign.y, z + sign.z, ...sign.size, finish.gantrySign)
  for (const dx of letters.x) box(x + dx, y + sign.y, z + letters.z, ...letters.size, finish.gantryLettering, undefined, false)
  // Meshes without a parent are merged into static batches, so each switchable piece gets its own node.
  const [lit, dark, soon, open] = ['lamps lit', 'lamps dark', 'opening soon', 'service open'].map((name) => group(meshes, `Ferry gantry · ${name}`))
  for (const side of sides) {
    box(x + side * lamps.x, y + lamps.y, z + lamps.z, ...lamps.size, finish.lampLit, lit, false)
    box(x + side * lamps.x, y + lamps.y, z + lamps.z, ...lamps.size, finish.lampDark, dark, false)
  }
  // Status boards hang on the west gantry post, outside the lane.
  box(x - uprights.x, y + status.y, z + status.z, ...status.size, finish.openingSoon, soon)
  box(x - uprights.x, y + status.y, z + status.z, ...status.size, finish.serviceOpen, open)
  return { lit, dark, soon, open }
}

function tally(meshes: MeshFactory, size: TallySize) {
  const { box } = meshes
  const y = groundHeight(tallyBoard)
  const root = group(meshes, 'Ferry tally board')
  root.position.set(tallyBoard.x, y, tallyBoard.z)
  root.rotation.y = tallyBoard.heading
  const { uprights, panel, till, timberSlip, cell, pips: stagePips, bars } = ferryTallyModel
  for (const dx of uprights.x) box(dx, uprights.y, 0, ...uprights.size, finish.weatheredWood, root)
  box(0, panel.y, 0, ...panel.size, finish.tallyBoard, root)
  box(-tallyControlOffsetX, till.y, till.z, ...till.size, finish.till, root)
  box(tallyControlOffsetX, timberSlipHeight, timberSlip.z, ...timberSlip.size, finish.timberSlip, root)
  const unfilledSwatches = [finish.tallyBoard, finish.tallyEmpty]
  const swatches = [...unfilledSwatches, ...playerColors, finish.tallyComplete]
  const cells = (dx: number, dy: number, width: number) =>
    swatches.map((color) => box(dx, dy, cell.z, width, cell.height, cell.thickness, color, root, false))
  const pips = Array.from({ length: size.stages }, (_, i) => cells(stagePips.startX + i * stagePips.spacing, stagePips.y, stagePips.width))
  const bar = (count: number, y: number, gap: number) => Array.from({ length: count }, (_, i) =>
    cells(bars.startX + i * (bars.span / count), y, bars.span / count - gap))
  const coins = bar(size.coins, bars.coins.y, bars.coins.cellGap)
  const crates = bar(size.crates, bars.crates.y, bars.crates.cellGap)
  return { pips, coins, crates, firstCrewSwatch: unfilledSwatches.length, completedSwatch: swatches.length - 1 }
}

// The pad follows the freight yard bounds. Both timber stacks use the gameplay drop and pickup points.
function yard(meshes: MeshFactory) {
  const { box, paintSurface } = meshes
  const { minX, maxX, minZ, maxZ } = ferryYard
  const { pad, markings, pallet, bundle, pickupPallet, pickupSign } = ferryYardModel
  const centerX = (minX + maxX) * half, centerZ = (minZ + maxZ) * half
  const width = maxX - minX, depth = maxZ - minZ
  box(centerX, pad.centerY, centerZ, width, pad.height, depth, paintSurface('gravel'), undefined, false)
  const crossLineWidth = width - (markings.frontOffsetX + markings.frontOffsetX)
  const sideLineDepth = depth - (markings.inset + markings.inset)
  for (const z of [minZ + markings.inset, maxZ - markings.inset]) {
    box(centerX + markings.frontOffsetX, markings.centerY, z, crossLineWidth, markings.thickness, markings.lineWidth, finish.yardLine, undefined, false)
  }
  box(maxX - markings.inset, markings.centerY, centerZ, markings.lineWidth, markings.thickness, sideLineDepth, finish.yardLine, undefined, false)
  box(yardDrop.x, pallet.centerY, yardDrop.z, pallet.width, pallet.height, pallet.depth, finish.weatheredWood)
  const timber = paintSurface('wood', finish.freshWood)
  const stacked = Array.from({ length: bundle.count }, (_, i) => {
    const root = group(meshes, 'Ferry yard timber')
    box(yardDrop.x + bundle.startX + i * bundle.spacing, bundle.centerY, yardDrop.z, ...bundle.size, timber, root)
    return root
  })
  const [first] = timberPickups
  const last = timberPickups[timberPickups.length - 1]
  box((first.x + last.x) * half, pickupPallet.centerY, first.z, last.x - first.x + pickupPallet.endClearance, pickupPallet.height, pickupPallet.depth, finish.weatheredWood)
  const signX = last.x + pickupSign.offsetX, signZ = first.z + pickupSign.offsetZ
  box(signX, pickupSign.post.centerY, signZ, ...pickupSign.post.size, finish.weatheredWood)
  box(signX, pickupSign.board.centerY, signZ, ...pickupSign.board.size, finish.freshWood)
  return stacked
}

export function createFerryTerminalModel(meshes: MeshFactory, deck: readonly DeckSegment[], tallySize: TallySize) {
  const { box, paintSurface } = meshes
  const { x, z, width } = ferryTerminal
  const { slab, curb, pile } = ferryApproachModel
  const { postInset, raisedLift } = ferryBarrierModel
  const near = rampDeck.near
  const y = groundHeight(ferryTerminal)
  const concrete = paintSurface('concrete', finish.coastConcrete)
  const midpoint = (z + near) * half
  box(x, y - slab.drop, midpoint, width, slab.thickness, z - near, concrete)
  for (const side of sides) {
    const edge = x + side * (width * half - postInset)
    box(edge, y + ferryBarrier.height * half, z, ferryBarrier.thickness, ferryBarrier.height, ferryBarrier.thickness, finish.weatheredWood)
    box(edge, y + curb.centerY, midpoint - curb.offsetZ, curb.width, curb.height, z - near - curb.spanInset, concrete)
    box(edge, waterLevel - pile.centerDepthBelowWater, near + pile.offsetZ, ...pile.size, finish.steel)
  }
  const down = group(meshes, 'Ferry barrier · down')
  barrierArm(meshes, down, y)
  const raised = group(meshes, 'Ferry barrier · raised')
  barrierArm(meshes, raised, y)
  raised.position.set(x - width * half + postInset, y + width * half + raisedLift, z)
  raised.rotation.z = quarterTurn
  const stages = landing(meshes, y, deck)
  const signs = gantry(meshes, y)
  const board = tally(meshes, tallySize)
  const stackedTimber = yard(meshes)
  return { down, raised, stages, signs, board, stackedTimber }
}
