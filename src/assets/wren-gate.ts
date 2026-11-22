import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { fenceRuns, hingePost } from '../gate-layout'
import type { MeshFactory } from '../island-meshes'
import { groundHeight } from '../terrain'
import { distance, mendingBench, wrenCottage } from '../world'
import type { Point } from '../world'
import { starterHouseModel } from './geometry/starter-house'
import { cottageBackModel, gardenFenceModel, wrenGateFinish, wrenGateGeometry } from './geometry/wren-gate'
import { createWrenGarden } from './wren-garden'

const half = 0.5
const quarterTurn = Math.PI * half
const sides = [-1, 1] as const
const { timber, cap, iron, brass } = wrenGateFinish

function fenceRun(meshes: MeshFactory, from: Point, to: Point) {
  const length = distance(from, to)
  const heading = Math.atan2(to.x - from.x, to.z - from.z) - quarterTurn
  const root = new TransformNode('Garden fence', meshes.scene)
  root.position.set(from.x, groundHeight(from), from.z)
  root.rotation.y = heading
  const { height, posts, rails, pickets } = gardenFenceModel
  const postSpacing = Math.max(posts.minSpacing, length / Math.ceil(length))
  for (let x = 0; x <= length + posts.endTolerance; x += postSpacing) {
    meshes.box(x, height * half, 0, posts.width, height, posts.depth, timber, root)
  }
  for (const y of rails.heights) meshes.box(length * half, y, rails.z, length, rails.height, rails.depth, timber, root)
  // Open spacing keeps the flower beds and path visible from the street.
  const { top } = pickets
  for (let x = pickets.firstX, i = 0; x < length; x += pickets.spacing, i++) {
    const boardHeight = top.height - ((i * top.stride) % top.variants) * top.step
    meshes.box(x, pickets.baseY + boardHeight * half, pickets.z, pickets.width, boardHeight, pickets.depth, cap, root)
  }
  meshes.batchModel(root)
}

function cottageBackAndSides({ box }: MeshFactory) {
  const { x, z, w, d } = wrenCottage
  const y = groundHeight(wrenCottage)
  const back = z + d * half
  const { door, knob, step, sideWindow } = cottageBackModel
  box(x, y + door.y, back + door.outset, ...door.size, door.color)
  box(x + knob.x, y + knob.y, back + knob.outset, ...knob.size, brass)
  box(x, y + step.y, back + step.outset, ...step.size, step.color)
  const { frame, glazing } = starterHouseModel.windows
  const [frameWidth, frameHeight, frameDepth] = frame.size
  const [paneWidth, paneHeight, paneDepth] = glazing.size
  const sideWall = w * half
  for (const side of sides) {
    box(x + side * (sideWall + frame.outset), y + sideWindow.y, z, frameDepth, frameHeight, frameWidth, frame.color)
    box(x + side * (sideWall + sideWindow.glazingOutset), y + sideWindow.y, z, paneDepth, paneHeight, paneWidth, glazing.color)
  }
}

export const wrenGateTopRail = wrenGateGeometry.topRail

function brassPin(cylinder: MeshFactory['cylinder'], x: number, y: number, z: number, root?: TransformNode) {
  const { diameter, length, sides: segments } = wrenGateGeometry.pin
  return cylinder(x, y, z, diameter, diameter, length, segments, brass, root)
}

export function createWrenGateAssembly({ box, cylinder, scene }: MeshFactory, { x, y, z }: Point & { y: number }) {
  const { posts, bottomRailY, pickets, brace, hinges, leaf: dimensions, wornPin: worn, pin } = wrenGateGeometry
  box(x, y + posts.y, z, ...posts.size, timber)
  box(x + posts.rightX, y + posts.y, z, ...posts.size, timber)
  const hinge = new TransformNode('Garden gate hinge', scene)
  hinge.position.set(x, y, z)
  const leaf = new TransformNode('Garden gate leaf', scene)
  leaf.parent = hinge
  const rail = wrenGateTopRail
  for (const y of [bottomRailY, rail.y]) box(rail.x, y, rail.z, rail.width, rail.height, rail.depth, timber, leaf)
  for (let x = pickets.firstX; x < dimensions.length; x += pickets.spacing) box(x, pickets.y, pickets.z, ...pickets.size, cap, leaf)
  box(dimensions.length * half, brace.y, brace.z, ...brace.size, timber, leaf).rotation.z = brace.angle
  for (const y of hinges.heights) box(hinges.x, y, hinges.z, ...hinges.size, iron, leaf)
  const wornPin = box(worn.x, worn.y, 0, ...worn.size, worn.color, hinge)
  const newPin = brassPin(cylinder, pin.x, pin.y, 0, hinge)
  return { hinge, leaf, wornPin, newPin }
}

function buildMendingBench({ scene, box, cylinder }: MeshFactory) {
  const bench = new TransformNode('Mending bench', scene)
  bench.position.set(mendingBench.x, groundHeight(mendingBench), mendingBench.z)
  bench.rotation.y = mendingBench.heading
  const { surface, surfaceColor, legs, shelf, tray, pin } = mendingBench.geometry
  box(0, surface.centreY, 0, surface.width, surface.thickness, surface.depth, surfaceColor, bench)
  for (const x of legs.x) for (const z of legs.z) box(x, legs.y, z, ...legs.size, legs.color, bench)
  box(0, shelf.y, 0, ...shelf.size, shelf.color, bench)
  box(tray.x, tray.y, tray.z, ...tray.size, tray.color, bench)
  return brassPin(cylinder, pin.x, pin.y, pin.z, bench)
}

export function createWrenGateModel(meshes: MeshFactory, sagAngle: number) {
  const { box, cylinder, scene } = meshes
  for (const { from, to } of fenceRuns) fenceRun(meshes, from, to)
  cottageBackAndSides(meshes)
  createWrenGarden(meshes)
  const floor = groundHeight(hingePost)
  const gate = createWrenGateAssembly(meshes, { ...hingePost, y: floor })
  // The worn pin lets the leaf scrape a shallow arc in the ground.
  const groove = new TransformNode('Gate groove', scene)
  const { leaf, scrape } = wrenGateGeometry
  const radius = leaf.length - scrape.endInset
  for (let angle = scrape.firstAngle; angle <= sagAngle + scrape.tailAngle; angle += scrape.spacing) {
    const x = hingePost.x + Math.cos(angle) * radius
    const z = hingePost.z + Math.sin(angle) * radius
    box(x, floor + scrape.lift, z, ...scrape.size, scrape.color, groove).rotation.y = -angle
  }
  const benchPin = buildMendingBench(meshes)
  const carried = brassPin(cylinder, 0, 0, 0)
  return { ...gate, groove, benchPin, carried }
}
