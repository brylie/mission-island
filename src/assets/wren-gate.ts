import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createWrenGarden } from './wren-garden'
import { fenceHeight, fenceRuns, gateLeaf, hingePost, mendingPinHeight } from '../gate-layout'
import type { MeshFactory } from '../island-meshes'
import { groundHeight } from '../terrain'
import { distance, mendingBench, wrenCottage } from '../world'
import type { Point } from '../world'

const timber = '#7d6a52', cap = '#d6c7a3', iron = '#4a4644', rust = '#8c5a3c', brass = '#e2b55a', soil = '#5b4532'

function fenceRun(meshes: MeshFactory, from: Point, to: Point) {
  const length = distance(from, to)
  const heading = Math.atan2(to.x - from.x, to.z - from.z) - Math.PI / 2
  const root = new TransformNode('Garden fence', meshes.scene)
  root.position.set(from.x, groundHeight(from), from.z)
  root.rotation.y = heading
  for (let x = 0; x <= length + 0.01; x += Math.max(0.5, length / Math.ceil(length))) {
    meshes.box(x, fenceHeight / 2, 0, 0.11, fenceHeight, 0.11, timber, root)
  }
  for (const y of [0.32, 1.18]) meshes.box(length / 2, y, 0.07, length, 0.08, 0.04, timber, root)
  // Hand-cut boards: tops vary a little so the fence reads as built, not stamped.
  // Open spacing lets the beds and path show through a fence that must stand taller than a jump.
  for (let x = 0.1, i = 0; x < length; x += 0.21, i++) {
    const height = 1.44 - ((i * 5) % 3) * 0.03
    meshes.box(x, 0.06 + height / 2, 0.1, 0.075, height, 0.025, cap, root)
  }
  meshes.batchModel(root)
}

// The plain house model only dresses the front. Wren's cottage also needs a back door and side windows,
// so the long way round reads from the street.
function cottageBackAndSides({ box }: MeshFactory) {
  const { x, z, w, d } = wrenCottage
  const y = groundHeight(wrenCottage)
  box(x, y + 1.2, z + d / 2 + 0.04, 1.1, 2.3, 0.13, '#4f6f62')
  box(x + 0.38, y + 1.15, z + d / 2 + 0.12, 0.07, 0.07, 0.05, brass)
  box(x, y + 0.09, z + d / 2 + 0.42, 1.4, 0.18, 0.55, '#a9a294')
  for (const side of [-1, 1]) {
    box(x + side * (w / 2 + 0.04), y + 2, z, 0.15, 1.03, 1.24, '#fff3d0')
    box(x + side * (w / 2 + 0.12), y + 2, z, 0.06, 0.77, 0.96, '#4c7a83')
  }
}

// Wren's gate: a leaf on a hinge pivot that the host swings, a hinge whose worn top pin
// lets the free end drop into a groove, and the mending bench where new pins wait.
export function createWrenGateModel(meshes: MeshFactory, sagAngle: number) {
  const { box, cylinder, scene } = meshes
  for (const { from, to } of fenceRuns) fenceRun(meshes, from, to)
  cottageBackAndSides(meshes)
  createWrenGarden(meshes)
  const base = groundHeight(hingePost)
  box(hingePost.x, base + 0.8, hingePost.z, 0.14, 1.6, 0.14, timber)
  box(hingePost.x + 1.12, base + 0.8, hingePost.z, 0.14, 1.6, 0.14, timber)
  const hinge = new TransformNode('Garden gate hinge', scene)
  hinge.position.set(hingePost.x, base, hingePost.z)
  const leaf = new TransformNode('Garden gate leaf', scene)
  leaf.parent = hinge
  for (const y of [0.3, 1.2]) box(gateLeaf.length / 2 + 0.03, y, 0, gateLeaf.length - 0.04, 0.09, 0.05, timber, leaf)
  for (let x = 0.12; x < gateLeaf.length; x += 0.19) box(x, 0.78, 0.03, 0.075, 1.36, 0.025, cap, leaf)
  const brace = box(gateLeaf.length / 2, 0.75, -0.01, 1.08, 0.07, 0.04, timber, leaf)
  brace.rotation.z = 0.74
  for (const y of [0.32, 1.2]) box(0.12, y, -0.04, 0.2, 0.05, 0.02, iron, leaf)
  const wornPin = box(0.02, 1.2, 0, 0.035, 0.1, 0.035, rust, hinge)
  const newPin = cylinder(0.02, 1.2, 0, 0.045, 0.045, 0.16, 8, brass, hinge)
  const groove = new TransformNode('Gate groove', scene)
  for (let angle = -0.05; angle <= sagAngle + 0.25; angle += 0.07) {
    const radius = gateLeaf.length - 0.08
    box(hingePost.x + Math.cos(angle) * radius, groundHeight(hingePost) + 0.012, hingePost.z + Math.sin(angle) * radius, 0.16, 0.02, 0.12, soil, groove).rotation.y = -angle
  }

  const benchY = groundHeight(mendingBench)
  const bench = new TransformNode('Mending bench', scene)
  bench.position.set(mendingBench.x, benchY, mendingBench.z)
  bench.rotation.y = mendingBench.heading
  const { centreY, width, thickness, depth } = mendingBench.geometry.surface
  box(0, centreY, 0, width, thickness, depth, '#a77a52', bench)
  for (const x of [-0.7, 0.7]) for (const z of [-0.27, 0.27]) box(x, 0.4, z, 0.09, 0.8, 0.09, '#7a5a3f', bench)
  box(0, 0.2, 0, 1.4, 0.05, 0.55, '#7a5a3f', bench)
  box(0.35, 0.89, 0.1, 0.4, 0.06, 0.26, '#3f5d5a', bench)
  const benchPin = cylinder(0.35, mendingPinHeight, 0.1, 0.045, 0.045, 0.16, 8, brass, bench)
  const carried = cylinder(0, 0, 0, 0.045, 0.045, 0.16, 8, brass)

  return { hinge, leaf, wornPin, newPin, groove, benchPin, carried }
}
