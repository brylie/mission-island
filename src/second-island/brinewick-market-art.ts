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
const fishHall = buildings.find((building) => building.site === 'fish-market')!
export const brinewickRainRoof = {
  x: fishHall.x,
  y: groundHeight(fishHall.x, fishHall.z) + streetCanopy.height - 0.15,
  z: fishHall.z + (fishHall.depth + streetCanopy.depth) / 2,
  width: fishHall.width * streetCanopy.widthRatio,
  depth: streetCanopy.depth,
}

function fixture(meshes: MeshFactory, stop: typeof brinewickMarketStops[keyof typeof brinewickMarketStops]) {
  const root = new TransformNode(stop.id, meshes.scene)
  root.position.set(stop.x, surfaceHeight(stop.x, stop.z), stop.z)
  return root
}

function dryingRack(meshes: MeshFactory, root: TransformNode, shelf: boolean) {
  const { width, depth } = brinewickMarketStops.outdoorRack
  const upright = width / 2 - 0.08
  for (const side of [-1, 1]) {
    meshes.box(side * upright, rackTop / 2, 0, 0.14, rackTop, 0.14, timber, root)
    meshes.box(side * upright, 0.09, 0, 0.16, 0.18, depth - 0.01, endGrain, root)
    meshes.box(side * upright, 0.28, 0.15, 0.09, 0.41, 0.10, timber, root).rotation.x = -0.69
  }
  meshes.box(0, rackTop, 0, width - 0.06, 0.10, 0.12, endGrain, root)
  if (shelf) meshes.box(0, 0.28, 0, width - 0.28, 0.09, depth - 0.06, timber, root)
}

function createNet(meshes: MeshFactory) {
  const root = new TransformNode('Cork-float drying net', meshes.scene)
  const positions: number[] = [], indices: number[] = []
  function strand(a: number[], b: number[]) {
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0])
    const dx = Math.sin(angle) * 0.012, dy = Math.cos(angle) * 0.012, i = positions.length / 3
    positions.push(a[0] - dx, a[1] + dy, a[2], a[0] + dx, a[1] - dy, a[2], b[0] - dx, b[1] + dy, b[2], b[0] + dx, b[1] - dy, b[2])
    indices.push(i, i + 1, i + 2, i + 1, i + 3, i + 2)
  }
  const point = (column: number, row: number) => {
    const x = (column - 8) * (0.178 - row * 0.004)
    return [x, -0.048 - row * (0.165 + 0.012 * Math.cos(x * 1.08)), 0.06 + Math.sin(row * 0.44) * 0.13]
  }
  for (let row = 0; row < 7; row++) for (let col = 0; col < 17; col++) {
    if (col > 0) strand(point(col, row), point(col - 1, row))
    if (row > 0) strand(point(col, row), point(col, row - 1))
  }
  const twine = meshes.paint('#6f8174')
  twine.backFaceCulling = false
  meshes.surface('Knotted net', positions, indices, twine, root)
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 0.455
    meshes.cylinder(x, -0.075, 0.061, 0.118, 0.118, 0.21, 9, i % 2 ? cream : coral, root, false).rotation.z = Math.PI / 2
  }
  for (const x of [-1.36, 0, 1.36]) meshes.box(x, -0.019, 0.046, 0.024, 0.11, 0.042, endGrain, root, false)
  return root
}

function workbench(meshes: MeshFactory, table: TransformNode) {
  const { width, depth } = brinewickMarketStops.worktable
  meshes.box(0, counterTop - 0.058, 0, width, 0.116, depth, timber, table)
  for (const x of [-1.51, 1.51]) for (const z of [-0.41, 0.41]) {
    meshes.box(x, 0.46, z, 0.13, 0.96, 0.13, endGrain, table)
  }
  meshes.box(0, 0.31, 0, 3.10, 0.11, 0.27, endGrain, table)
  meshes.box(1.56, 1.52, -0.35, 0.075, 1.00, 0.075, endGrain, table)
  meshes.box(1.12, 2.02, -0.35, 0.95, 0.064, 0.075, timber, table)
}

function fillTray(meshes: MeshFactory, table: TransformNode, x: number) {
  const z = 0.04
  meshes.box(x, counterTop + 0.025, z, 1.32, 0.05, 0.74, '#d4e7da', table)
  for (const side of [-1, 1]) {
    meshes.box(x, 1.09, z + side * 0.349, 1.32, 0.09, 0.04, teal, table)
    meshes.box(x + side * 0.64, 1.09, z, 0.04, 0.09, 0.66, teal, table)
  }
  const catchRoot = new TransformNode('Fish on the display tray', meshes.scene)
  catchRoot.parent = table
  for (const [index, offset] of [-0.43, -0.14, 0.15, 0.44].entries()) {
    const direction = index % 2 ? 1 : -1
    const body = meshes.sphere(x + offset, 1.118, z + direction * 0.03, 0.19, 0.088, 0.41, index % 2 ? '#8babb2' : '#608a92', catchRoot, false)
    body.rotation.y = 0.22 * direction
    meshes.sphere(x + offset - 0.035, 1.084, z - direction * 0.19, 0.19, 0.05, 0.17, '#597b80', catchRoot, false, 4)
    meshes.sphere(x + offset + 0.043, 1.14, z + direction * 0.17, 0.039, 0.036, 0.038, '#243c3f', catchRoot, false, 5)
  }
  const cover = new TransformNode('Canvas tray cover', meshes.scene)
  cover.parent = table
  cover.position.set(x, 1.183, z - 0.38)
  meshes.box(0, 0.009, 0.38, 1.39, 0.05, 0.77, '#d6b487', cover)
  meshes.box(0, -0.027, 0.753, 1.38, 0.10, 0.027, '#b8825d', cover).rotation.x = -0.12
  for (const side of [-1, 1]) {
    meshes.box(side * 0.688, -0.024, 0.38, 0.03, 0.095, 0.73, '#b8825d', cover)
    meshes.box(side * 0.46, 0.039, 0.378, 0.031, 0.012, 0.75, cream, cover, false)
  }
  return { catchRoot, cover }
}

function catchBoard(meshes: MeshFactory, table: TransformNode) {
  const anchor = new TransformNode('Catch board hook', meshes.scene)
  anchor.parent = table
  anchor.position.set(0.76, 1.99, -0.35)
  meshes.box(0, -0.017, 0, 0.046, 0.075, 0.047, endGrain, anchor)
  meshes.box(0, -0.20, 0, 1.47, 0.40, 0.08, endGrain, anchor)
  const label = new DynamicTexture('Brinewick daily catch lettering', { width: 384, height: 96 }, meshes.scene, true)
  label.drawText('TODAY’S CATCH', null, 64, 'bold 46px Georgia', cream, teal, true)
  const print = new StandardMaterial('Catch board face', meshes.scene)
  print.diffuseTexture = label
  print.backFaceCulling = false
  meshes.surface('Daily catch lettering', [0.70, -0.37, 0.043, -0.70, -0.37, 0.043, -0.70, -0.03, 0.043, 0.70, -0.03, 0.043], [0, 1, 2, 0, 2, 3], print, anchor, [0, 0, 1, 0, 1, 1, 0, 1])
  return anchor
}

function marketBasket(meshes: MeshFactory, rack: TransformNode, index: number) {
  const root = new TransformNode('Wicker fish basket', meshes.scene)
  root.parent = rack
  const color = index === 1 ? '#b58555' : '#ca9f6c'
  meshes.cylinder(0, 0.14, 0, 0.48, 0.34, 0.28, 10, color, root, false)
  meshes.cylinder(0, 0.275, 0, 0.50, 0.48, 0.05, 10, cream, root, false)
  meshes.cylinder(0, 0.302, 0, 0.39, 0.39, 0.009, 10, endGrain, root, false)
  for (const x of [-0.24, 0.24]) meshes.box(x, 0.265, 0, 0.065, 0.052, 0.18, color, root, false)
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
  const trays = [-0.76, 0.76].map((x) => fillTray(meshes, table, x))
  const board = catchBoard(meshes, table)
  const baskets = [0, 1, 2].map((i) => marketBasket(meshes, outdoorRack, i))
  return (time: number, weather: Weather, overview = false) => {
    const state = brinewickMarketAt(weather)
    net.setEnabled(Boolean(state.net) && !overview)
    if (state.net) {
      const rack = state.net === 'outdoorRack' ? outdoorRack : shelteredRack
      net.position.set(rack.position.x, rack.position.y + rackTop, rack.position.z)
      net.rotation.x = Math.sin(time * 2.1) * (state.net === 'outdoorRack' ? 0.14 : 0.035)
    }
    board.setEnabled(state.phase === 'trading')
    board.rotation.x = 0.06 * Math.sin(time * 2.7)
    for (const { catchRoot, cover } of trays) {
      catchRoot.setEnabled(state.phase !== 'setup' && !overview)
      cover.setEnabled(state.phase === 'closing')
      cover.rotation.x = -0.56 * (1 - state.cover)
    }
    for (const [i, basket] of baskets.entries()) {
      basket.position.set(state.phase === 'closing' ? -0.54 : (i - 1) * 0.95, 0.325 + (state.phase === 'closing' ? i * 0.20 : 0), 0.015)
    }
    return state
  }
}
