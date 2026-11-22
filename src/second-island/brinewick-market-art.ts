import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import {
  brinewickMarketBasket,
  brinewickMarketCatchBoard,
  brinewickMarketFinish,
  brinewickMarketNet,
  brinewickMarketRack,
  brinewickMarketTable,
  brinewickMarketTray,
} from '../assets/geometry/brinewick-market'
import type { MeshFactory } from '../island-meshes'
import type { Weather } from '../protocol'
import { brinewickMarketAt, brinewickMarketStops } from './brinewick-market'
import { buildings, streetCanopy } from './lots'
import { groundHeight, surfaceHeight } from './terrain'
import type { ScenerySolids } from './walking'

const { timber, endGrain, cream, coral, teal } = brinewickMarketFinish
const sides = [-1, 1] as const
const half = 0.5
const quarterTurn = Math.PI * half
const coordinatesPerVertex = 3
const alternatingPeriod = 2
const rainRoofInset = 0.15
const netSwingFrequency = 2.1
const outdoorNetPitch = 0.14
const shelteredNetPitch = 0.035
const boardSwingFrequency = 2.7
const boardSwingPitch = 0.06
const raisedCoverPitch = -0.56

const fishHall = buildings.find((building) => building.site === 'fish-market')!
export const brinewickRainRoof = {
  x: fishHall.x,
  y: groundHeight(fishHall.x, fishHall.z) + streetCanopy.height - rainRoofInset,
  z: fishHall.z + (fishHall.depth + streetCanopy.depth) * half,
  width: fishHall.width * streetCanopy.widthRatio,
  depth: streetCanopy.depth,
}

function fixture(meshes: MeshFactory, stop: typeof brinewickMarketStops[keyof typeof brinewickMarketStops]) {
  const root = new TransformNode(stop.id, meshes.scene)
  root.position.set(stop.x, surfaceHeight(stop.x, stop.z), stop.z)
  return root
}

function dryingRack(meshes: MeshFactory, root: TransformNode, hasShelf: boolean) {
  const { footprint: { width, depth }, top, upright, foot, brace, crossbar, shelf } = brinewickMarketRack
  const postX = width * half - upright.endInset
  for (const side of sides) {
    const x = side * postX
    meshes.box(x, top * half, 0, upright.width, top, upright.depth, timber, root)
    meshes.box(x, foot.height * half, 0, foot.width, foot.height, depth - foot.depthInset, endGrain, root)
    meshes.box(x, brace.y, brace.z, ...brace.size, timber, root).rotation.x = brace.rake
  }
  meshes.box(0, top, 0, width - crossbar.widthInset, crossbar.height, crossbar.depth, endGrain, root)
  if (hasShelf) meshes.box(0, shelf.y, 0, width - shelf.widthInset, shelf.height, depth - shelf.depthInset, timber, root)
}

function createNet(meshes: MeshFactory) {
  const { weave, corks, ties } = brinewickMarketNet
  const root = new TransformNode('Cork-float drying net', meshes.scene)
  const positions: number[] = [], indices: number[] = []
  type Knot = [x: number, y: number, z: number]
  function strand([ax, ay, az]: Knot, [bx, by, bz]: Knot) {
    const angle = Math.atan2(by - ay, bx - ax)
    const dx = Math.sin(angle) * weave.halfStrandWidth, dy = Math.cos(angle) * weave.halfStrandWidth
    const startLeft = positions.length / coordinatesPerVertex
    const startRight = startLeft + 1, endLeft = startRight + 1, endRight = endLeft + 1
    positions.push(ax - dx, ay + dy, az, ax + dx, ay - dy, az, bx - dx, by + dy, bz, bx + dx, by - dy, bz)
    indices.push(startLeft, startRight, endLeft, startRight, endRight, endLeft)
  }

  const middle = (weave.columns - 1) * half
  const { crosswiseSag, forwardBow } = weave
  const point = (column: number, row: number): Knot => {
    const x = (column - middle) * (weave.columnSpacing - row * weave.taperPerRow)
    const y = -weave.belowCrossbar - row * (weave.rowSpacing + crosswiseSag.amplitude * Math.cos(x * crosswiseSag.frequency))
    const z = forwardBow.offset + Math.sin(row * forwardBow.frequency) * forwardBow.amplitude
    return [x, y, z]
  }
  for (let row = 0; row < weave.rows; row++) for (let column = 0; column < weave.columns; column++) {
    if (column > 0) strand(point(column, row), point(column - 1, row))
    if (row > 0) strand(point(column, row), point(column, row - 1))
  }
  const twine = meshes.paint(weave.finish)
  twine.backFaceCulling = false
  meshes.surface('Knotted net', positions, indices, twine, root)
  for (let i = 0; i < corks.count; i++) {
    const x = (i - (corks.count - 1) * half) * corks.spacing
    const paint = i % alternatingPeriod ? cream : coral
    meshes.cylinder(x, corks.y, corks.z, corks.diameter, corks.diameter, corks.length, corks.segments, paint, root, false).rotation.z = quarterTurn
  }
  for (const x of ties.x) meshes.box(x, ties.y, ties.z, ...ties.size, endGrain, root, false)
  return root
}

function workbench(meshes: MeshFactory, table: TransformNode) {
  const { footprint: { width, depth }, top, slabThickness, leg, stretcher, signPost, signRail } = brinewickMarketTable
  meshes.box(0, top - slabThickness * half, 0, width, slabThickness, depth, timber, table)
  for (const side of sides) for (const end of sides) {
    meshes.box(side * leg.x, leg.y, end * leg.z, ...leg.size, endGrain, table)
  }
  meshes.box(...stretcher.center, ...stretcher.size, endGrain, table)
  meshes.box(...signPost.center, ...signPost.size, endGrain, table)
  meshes.box(...signRail.center, ...signRail.size, timber, table)
}

function createTrayCover(meshes: MeshFactory, table: TransformNode, x: number, z: number) {
  const { hinge, canvas, bindingFinish, frontBinding, sideBinding, strap } = brinewickMarketTray.cover
  const cover = new TransformNode('Canvas tray cover', meshes.scene)
  cover.parent = table
  cover.position.set(x, hinge.y, z - hinge.rearward)
  meshes.box(...canvas.center, ...canvas.size, canvas.finish, cover)
  meshes.box(...frontBinding.center, ...frontBinding.size, bindingFinish, cover).rotation.x = frontBinding.rake
  for (const side of sides) {
    meshes.box(side * sideBinding.x, sideBinding.y, sideBinding.z, ...sideBinding.size, bindingFinish, cover)
    meshes.box(side * strap.x, strap.y, strap.z, ...strap.size, cream, cover, false)
  }
  return cover
}

function fillTray(meshes: MeshFactory, table: TransformNode, x: number) {
  const { z, base, longRim, endRim, fish } = brinewickMarketTray
  meshes.box(x, brinewickMarketTable.top + base.rise, z, ...base.size, base.finish, table)
  for (const side of sides) {
    meshes.box(x, longRim.y, z + side * longRim.z, ...longRim.size, teal, table)
    meshes.box(x + side * endRim.x, endRim.y, z, ...endRim.size, teal, table)
  }
  const catchRoot = new TransformNode('Fish on the display tray', meshes.scene)
  catchRoot.parent = table
  const { body, tail, eye } = fish
  for (const [index, offset] of fish.x.entries()) {
    const alternate = index % alternatingPeriod
    const direction = alternate ? 1 : -1
    const fishX = x + offset
    meshes.sphere(fishX, body.y, z + direction * body.z, ...body.size, body.finishes[alternate], catchRoot, false).rotation.y = body.yaw * direction
    meshes.sphere(fishX + tail.x, tail.y, z - direction * tail.z, ...tail.size, tail.finish, catchRoot, false, tail.segments)
    meshes.sphere(fishX + eye.x, eye.y, z + direction * eye.z, ...eye.size, eye.finish, catchRoot, false, eye.segments)
  }
  return { catchRoot, cover: createTrayCover(meshes, table, x, z) }
}

function catchBoard(meshes: MeshFactory, table: TransformNode) {
  const { pivot, hook, plank, lettering } = brinewickMarketCatchBoard
  const anchor = new TransformNode('Catch board hook', meshes.scene)
  anchor.parent = table
  anchor.position.set(...pivot)
  meshes.box(...hook.center, ...hook.size, endGrain, anchor)
  meshes.box(...plank.center, ...plank.size, endGrain, anchor)
  const label = new DynamicTexture('Brinewick daily catch lettering', lettering.canvasSize, meshes.scene, true)
  label.drawText(lettering.text, null, lettering.baseline, lettering.font, cream, teal, true)
  const print = new StandardMaterial('Catch board face', meshes.scene)
  print.diffuseTexture = label
  print.backFaceCulling = false
  meshes.surface('Daily catch lettering', lettering.corners.flat(), [...lettering.indices], print, anchor, [...lettering.uv])
  return anchor
}

function marketBasket(meshes: MeshFactory, rack: TransformNode, finish: string) {
  const { bowl, rim, inset, handle, segments } = brinewickMarketBasket
  const root = new TransformNode('Wicker fish basket', meshes.scene)
  root.parent = rack
  meshes.cylinder(0, bowl.y, 0, ...bowl.diameters, bowl.height, segments, finish, root, false)
  meshes.cylinder(0, rim.y, 0, ...rim.diameters, rim.height, segments, cream, root, false)
  meshes.cylinder(0, inset.y, 0, ...inset.diameters, inset.height, segments, endGrain, root, false)
  for (const side of sides) meshes.box(side * handle.x, handle.y, 0, ...handle.size, finish, root, false)
  return root
}

export function createBrinewickMarket(meshes: MeshFactory, solids?: ScenerySolids) {
  const first = meshes.scene.meshes.length
  const stops = brinewickMarketStops
  const outdoorRack = fixture(meshes, stops.outdoorRack), shelteredRack = fixture(meshes, stops.shelteredRack)
  dryingRack(meshes, outdoorRack, true)
  dryingRack(meshes, shelteredRack, false)
  const table = fixture(meshes, stops.worktable)
  workbench(meshes, table)
  // Permanent supports own the collisions. Nets and stock stay inside these footprints.
  solids?.capture(meshes.scene.meshes.slice(first))
  for (const root of [outdoorRack, shelteredRack, table]) meshes.batchModel(root)

  const net = createNet(meshes)
  const { top: rackTop } = brinewickMarketRack
  net.position.set(outdoorRack.position.x, outdoorRack.position.y + rackTop, outdoorRack.position.z)
  const trays = brinewickMarketTray.x.map((x) => fillTray(meshes, table, x))
  const board = catchBoard(meshes, table)
  const { finishes, display } = brinewickMarketBasket
  const baskets = finishes.map((finish) => marketBasket(meshes, outdoorRack, finish))
  const middleBasket = (baskets.length - 1) * half
  return (time: number, weather: Weather, overview = false) => {
    const state = brinewickMarketAt(weather)
    net.setEnabled(Boolean(state.net) && !overview)
    if (state.net) {
      const outdoor = state.net === 'outdoorRack'
      const rack = outdoor ? outdoorRack : shelteredRack
      net.position.set(rack.position.x, rack.position.y + rackTop, rack.position.z)
      net.rotation.x = Math.sin(time * netSwingFrequency) * (outdoor ? outdoorNetPitch : shelteredNetPitch)
    }
    board.setEnabled(state.phase === 'trading')
    board.rotation.x = boardSwingPitch * Math.sin(time * boardSwingFrequency)
    const closing = state.phase === 'closing'
    for (const { catchRoot, cover } of trays) {
      catchRoot.setEnabled(state.phase !== 'setup' && !overview)
      cover.setEnabled(closing)
      cover.rotation.x = raisedCoverPitch * (1 - state.cover)
    }
    for (const [i, basket] of baskets.entries()) {
      basket.position.set(closing ? display.stackX : (i - middleBasket) * display.spacing, display.y + (closing ? i * display.stackStep : 0), display.z)
    }
    return state
  }
}
