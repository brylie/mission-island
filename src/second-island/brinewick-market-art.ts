import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import type { Weather } from '../protocol'
import { brinewickMarketAt, brinewickMarketStops } from './brinewick-market'
import { buildings, streetCanopy } from './lots'
import { groundHeight, surfaceHeight } from './terrain'
import type { ScenerySolids } from './walking'

const timber = '#a48058', endGrain = '#735740', cream = '#f3deb7', coral = '#b86351', teal = '#3f6768'
const rackTop = 1.94, counterTop = 1.02
const fishHall = buildings.find(building => building.site === 'fish-market')!
export const brinewickRainRoof = {
  x: fishHall.x, y: groundHeight(fishHall.x, fishHall.z) + streetCanopy.height - .15,
  z: fishHall.z + (fishHall.depth + streetCanopy.depth) / 2,
  width: fishHall.width * streetCanopy.widthRatio, depth: streetCanopy.depth,
}

function fixture(meshes: MeshFactory, stop: typeof brinewickMarketStops[keyof typeof brinewickMarketStops]) {
  const root = new TransformNode(stop.id, meshes.scene)
  root.position.set(stop.x, surfaceHeight(stop.x, stop.z), stop.z)
  return root
}

function dryingRack(meshes: MeshFactory, root: TransformNode, shelf: boolean) {
  const { width, depth } = brinewickMarketStops.outdoorRack
  const upright = width / 2 - .08
  for (const side of [-1, 1]) {
    meshes.box(side * upright, rackTop / 2, 0, .14, rackTop, .14, timber, root)
    meshes.box(side * upright, .09, 0, .16, .18, depth - .01, endGrain, root)
    meshes.box(side * upright, .28, .15, .09, .41, .10, timber, root).rotation.x = -.69
  }
  meshes.box(0, rackTop, 0, width - .06, .10, .12, endGrain, root)
  if (shelf) meshes.box(0, .28, 0, width - .28, .09, depth - .06, timber, root)
}

function createNet(meshes: MeshFactory) {
  const root = new TransformNode('Cork-float drying net', meshes.scene)
  const positions: number[] = [], indices: number[] = []
  function strand(a: number[], b: number[]) {
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0])
    const dx = Math.sin(angle) * .012, dy = Math.cos(angle) * .012, i = positions.length / 3
    positions.push(a[0] - dx, a[1] + dy, a[2], a[0] + dx, a[1] - dy, a[2],
      b[0] - dx, b[1] + dy, b[2], b[0] + dx, b[1] - dy, b[2])
    indices.push(i, i + 1, i + 2, i + 1, i + 3, i + 2)
  }
  const point = (column: number, row: number) => {
    const x = (column - 8) * (.178 - row * .004)
    return [x, -.048 - row * (.165 + .012 * Math.cos(x * 1.08)), .06 + Math.sin(row * .44) * .13]
  }
  for (let row = 0; row < 7; row++) for (let col = 0; col < 17; col++) {
    if (col > 0) strand(point(col, row), point(col - 1, row))
    if (row > 0) strand(point(col, row), point(col, row - 1))
  }
  const twine = meshes.paint('#6f8174')
  twine.backFaceCulling = false
  meshes.surface('Knotted net', positions, indices, twine, root)
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * .455
    meshes.cylinder(x, -.075, .061, .118, .118, .21, 9, i % 2 ? cream : coral, root, false).rotation.z = Math.PI / 2
  }
  for (const x of [-1.36, 0, 1.36]) meshes.box(x, -.019, .046, .024, .11, .042, endGrain, root, false)
  return root
}

function workbench(meshes: MeshFactory, table: TransformNode) {
  const { width, depth } = brinewickMarketStops.worktable
  meshes.box(0, counterTop - .058, 0, width, .116, depth, timber, table)
  for (const x of [-1.51, 1.51]) for (const z of [-.41, .41]) {
    meshes.box(x, .46, z, .13, .96, .13, endGrain, table)
  }
  meshes.box(0, .31, 0, 3.10, .11, .27, endGrain, table)
  meshes.box(1.56, 1.52, -.35, .075, 1.00, .075, endGrain, table)
  meshes.box(1.12, 2.02, -.35, .95, .064, .075, timber, table)
}

function fillTray(meshes: MeshFactory, table: TransformNode, x: number) {
  const z = .04
  meshes.box(x, counterTop + .025, z, 1.32, .05, .74, '#d4e7da', table)
  for (const side of [-1, 1]) {
    meshes.box(x, 1.09, z + side * .349, 1.32, .09, .04, teal, table)
    meshes.box(x + side * .64, 1.09, z, .04, .09, .66, teal, table)
  }
  const catchRoot = new TransformNode('Fish on the display tray', meshes.scene)
  catchRoot.parent = table
  for (const [index, offset] of [-.43, -.14, .15, .44].entries()) {
    const direction = index % 2 ? 1 : -1
    const body = meshes.sphere(x + offset, 1.118, z + direction * .03, .19, .088, .41, index % 2 ? '#8babb2' : '#608a92', catchRoot, false)
    body.rotation.y = .22 * direction
    meshes.sphere(x + offset - .035, 1.084, z - direction * .19, .19, .05, .17, '#597b80', catchRoot, false, 4)
    meshes.sphere(x + offset + .043, 1.14, z + direction * .17, .039, .036, .038, '#243c3f', catchRoot, false, 5)
  }
  const cover = new TransformNode('Canvas tray cover', meshes.scene)
  cover.parent = table
  cover.position.set(x, 1.183, z - .38)
  meshes.box(0, .009, .38, 1.39, .05, .77, '#d6b487', cover)
  meshes.box(0, -.027, .753, 1.38, .10, .027, '#b8825d', cover).rotation.x = -.12
  for (const side of [-1, 1]) {
    meshes.box(side * .688, -.024, .38, .03, .095, .73, '#b8825d', cover)
    meshes.box(side * .46, .039, .378, .031, .012, .75, cream, cover, false)
  }
  return { catchRoot, cover }
}

function catchBoard(meshes: MeshFactory, table: TransformNode) {
  const anchor = new TransformNode('Catch board hook', meshes.scene)
  anchor.parent = table
  anchor.position.set(.76, 1.99, -.35)
  meshes.box(0, -.017, 0, .046, .075, .047, endGrain, anchor)
  meshes.box(0, -.20, 0, 1.47, .40, .08, endGrain, anchor)
  const label = new DynamicTexture('Brinewick daily catch lettering', { width: 384, height: 96 }, meshes.scene, true)
  label.drawText('TODAY’S CATCH', null, 64, 'bold 46px Georgia', cream, teal, true)
  const print = new StandardMaterial('Catch board face', meshes.scene)
  print.diffuseTexture = label
  print.backFaceCulling = false
  meshes.surface('Daily catch lettering', [.70, -.37, .043, -.70, -.37, .043, -.70, -.03, .043, .70, -.03, .043],
    [0, 1, 2, 0, 2, 3], print, anchor, [0, 0, 1, 0, 1, 1, 0, 1])
  return anchor
}

function marketBasket(meshes: MeshFactory, rack: TransformNode, index: number) {
  const root = new TransformNode('Wicker fish basket', meshes.scene)
  root.parent = rack
  const color = index === 1 ? '#b58555' : '#ca9f6c'
  meshes.cylinder(0, .14, 0, .48, .34, .28, 10, color, root, false)
  meshes.cylinder(0, .275, 0, .50, .48, .05, 10, cream, root, false)
  meshes.cylinder(0, .302, 0, .39, .39, .009, 10, endGrain, root, false)
  for (const x of [-.24, .24]) meshes.box(x, .265, 0, .065, .052, .18, color, root, false)
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
  net.position.set(outdoorRack.position.x, outdoorRack.position.y + rackTop, outdoorRack.position.z)
  const trays = [-.76, .76].map(x => fillTray(meshes, table, x))
  const board = catchBoard(meshes, table)
  const baskets = [0, 1, 2].map(i => marketBasket(meshes, outdoorRack, i))
  return (time: number, weather: Weather, overview = false) => {
    const state = brinewickMarketAt(weather)
    net.setEnabled(Boolean(state.net) && !overview)
    if (state.net) {
      const rack = state.net === 'outdoorRack' ? outdoorRack : shelteredRack
      net.position.set(rack.position.x, rack.position.y + rackTop, rack.position.z)
      net.rotation.x = Math.sin(time * 2.1) * (state.net === 'outdoorRack' ? .14 : .035)
    }
    board.setEnabled(state.phase === 'trading')
    board.rotation.x = .06 * Math.sin(time * 2.7)
    for (const { catchRoot, cover } of trays) {
      catchRoot.setEnabled(state.phase !== 'setup' && !overview)
      cover.setEnabled(state.phase === 'closing')
      cover.rotation.x = -.56 * (1 - state.cover)
    }
    for (const [i, basket] of baskets.entries()) {
      basket.position.set(state.phase === 'closing' ? -.54 : (i - 1) * .95, .325 + (state.phase === 'closing' ? i * .20 : 0), .015)
    }
    return state
  }
}
