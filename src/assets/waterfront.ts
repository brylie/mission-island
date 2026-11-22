import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Material } from '@babylonjs/core/Materials/material'
import { hash } from '../math/noise'
import { boxSurfaceUVs } from '../surface-uvs'
import type { MeshFactory } from '../island-meshes'
import { waterLevel } from '../terrain'
import type { Point } from '../world'
import { harborDock, harborDockPiles, skiffStart } from '../world'
import { dockDeckModel, dockPileBarnacles, harborBuoy, harborDockGeometry, harborDockPile, harborSkiff } from './geometry/waterfront'

const half = 0.5
const sides = [-1, 1] as const
const verticesPerPair = 2
const fullTurn = Math.PI + Math.PI
const firstFanTriangleEnd = 2
const diameterPerRadius = 2

export function createDockDeck(meshes: MeshFactory, x: number, firstZ: number, top: number, planks: number, deck: Material = meshes.paintRecipe('weathered-board')) {
  const { box, paintSurface } = meshes
  const { spacing, width, plankDepth, plankThickness } = harborDockGeometry
  const { beamOffset, beam, plankVariation, nail } = dockDeckModel
  const length = (planks - 1) * spacing + plankDepth
  const plankCenterY = top - plankThickness * half
  const timber = paintSurface('wood')
  for (const side of sides) {
    box(x + side * beamOffset, top - beam.drop, firstZ - (length - plankDepth) * half, beam.width, beam.height, length, timber)
  }
  for (let i = 0; i < planks; i++) {
    const z = firstZ - i * spacing, offset = (hash(i, 1, plankVariation.seed) - half) * plankVariation.sway
    const plank = box(x + offset, plankCenterY, z, width, plankThickness, plankDepth, deck)
    boxSurfaceUVs(plank, true, hash(i, 0, plankVariation.seed) * plankVariation.grainPhase)
    for (const side of sides) {
      const fastener = box(x + side * beamOffset, top + nail.rise, z + side * nail.z, ...nail.size, nail.color, undefined, false)
      fastener.rotation.y = hash(i, side, plankVariation.seed) * nail.yawSpread
    }
  }
}

export function createDockPile(
  meshes: MeshFactory,
  { x, z, top, bottom, diameter }: typeof harborDockPiles[number],
  material: Material = meshes.paintSurface('wood'),
  root?: TransformNode,
) {
  return meshes.cylinder(x, (top + bottom) * half, z, diameter, diameter, top - bottom, harborDockPile.sides, material, root)
}

export function createDock(meshes: MeshFactory, shaderPile?: Point, deck: Material = meshes.paintRecipe('weathered-board')) {
  const { x, firstZ, top, planks } = harborDock
  createDockDeck(meshes, x, firstZ, top, planks, deck)
  const barnacles = meshes.paintRecipe('barnacle-belt')
  const { crossSections, startFace, surfaceGap, tideBand, textureStep } = dockPileBarnacles
  for (const pile of harborDockPiles) {
    const { x: px, z, diameter } = pile
    if (px === shaderPile?.x && z === shaderPile.z) continue
    createDockPile(meshes, pile)
    // Cover the outer faces below the deck, leaving the exposed timber bare.
    const vertices: number[] = [], uvs: number[] = [], indices: number[] = []
    const face = px < x ? startFace.port : startFace.starboard
    for (let i = 0; i < crossSections; i++) {
      const angle = (i + face) * fullTurn / harborDockPile.sides
      const radius = diameter * half + surfaceGap
      const dx = radius * Math.cos(angle), dz = -radius * Math.sin(angle)
      const low = waterLevel - tideBand.below, high = waterLevel + tideBand.above + hash(i, z, tideBand.seed) * tideBand.irregularity
      vertices.push(px + dx, low, z + dz, px + dx, high, z + dz)
      const u = i * textureStep
      uvs.push(u, low, u, high)
      const bottom = i * verticesPerPair, previous = bottom - verticesPerPair
      if (i) indices.push(previous, previous + 1, bottom, bottom, previous + 1, bottom + 1)
    }
    meshes.surface('Barnacles on intertidal piling', vertices, indices, barnacles, undefined, uvs).freezeWorldMatrix()
  }
}

const rimHeight = (z: number) => harborSkiff.rim.baseY + Math.max(0, z) * harborSkiff.rim.bowRise

// The hull outline's half-width at a station along the keel.
function outlineHalfWidth(z: number) {
  const starboard = harborSkiff.outline.filter(([x]) => x >= 0).sort((a, b) => a[1] - b[1])
  for (let i = 1; i < starboard.length; i++) {
    const [x0, z0] = starboard[i - 1], [x1, z1] = starboard[i]
    if (z <= z1) return x0 + (x1 - x0) * Math.max(0, (z - z0) / (z1 - z0))
  }
  return 0
}

// A bench's width where it meets the inner lining. The lining runs from the
// cockpit floor up to just below the rim, narrowing and shortening toward the floor.
function thwartWidth(z: number) {
  const { floor, inner, thwart } = harborSkiff
  const top = thwart.y + thwart.height * half
  const t = (top - floor.y) / (rimHeight(z) - inner.rimDrop - floor.y)
  const widthRatio = floor.widthRatio + (inner.widthRatio - floor.widthRatio) * t
  const lengthRatio = floor.lengthRatio + (inner.lengthRatio - floor.lengthRatio) * t
  return (outlineHalfWidth(z / lengthRatio) * widthRatio - thwart.clearance) * diameterPerRadius
}

function buildGunwale(meshes: MeshFactory, boat: TransformNode, wood: Material) {
  const { outline, gunwale: { section } } = harborSkiff
  const trim = outline.flatMap(([x, z]) => {
    const y = rimHeight(z)
    return section.flatMap((point) => [x * point.widthRatio, y + point.height, z * point.lengthRatio])
  })
  const [topOuter, topInner, bottomOuter, bottomInner] = section.map((_, i) => i)
  const trimIndices = outline.flatMap((_, i) => {
    const a = i * section.length
    const b = (i + 1) % outline.length * section.length
    const aTopOuter = a + topOuter, aTopInner = a + topInner
    const aBottomOuter = a + bottomOuter, aBottomInner = a + bottomInner
    const bTopOuter = b + topOuter, bTopInner = b + topInner
    const bBottomOuter = b + bottomOuter, bBottomInner = b + bottomInner
    // Top, outer, inner, and bottom faces of each connected rim segment.
    return [
      aTopOuter,
      bTopOuter,
      aTopInner,
      bTopOuter,
      bTopInner,
      aTopInner,
      aTopOuter,
      aBottomOuter,
      bTopOuter,
      bTopOuter,
      aBottomOuter,
      bBottomOuter,
      aTopInner,
      bTopInner,
      aBottomInner,
      bTopInner,
      bBottomInner,
      aBottomInner,
      aBottomOuter,
      aBottomInner,
      bBottomOuter,
      bBottomOuter,
      aBottomInner,
      bBottomInner,
    ]
  })
  const trimUvs = outline.flatMap(([x, z]) => section.flatMap(({ grainOffset }) => [x, z + grainOffset]))
  const rim = meshes.surface('Wood rim', trim, trimIndices, wood, boat, trimUvs)
  meshes.shadows.addShadowCaster(rim, false)
}

export function createHarborBoat(meshes: MeshFactory) {
  const { scene, box, surface, paintSurface } = meshes
  const boat = new TransformNode('Harbor skiff', scene)
  boat.position.set(skiffStart.x, waterLevel, skiffStart.z)
  boat.rotation.y = skiffStart.heading
  const { outline, outer, inner, floor, gunwale, thwart, outboard } = harborSkiff
  const hullVertices: number[] = []
  const liningVertices: number[] = []
  const sideIndices: number[] = []
  for (const [i, [x, z]] of outline.entries()) {
    const y = rimHeight(z)
    hullVertices.push(x * outer.widthRatio, outer.floorY + Math.max(0, z) * outer.bowLift, z * outer.lengthRatio, x, y, z)
    liningVertices.push(x * floor.widthRatio, floor.y, z * floor.lengthRatio, x * inner.widthRatio, y - inner.rimDrop, z * inner.lengthRatio)
    const a = i * verticesPerPair
    const b = ((i + 1) % outline.length) * verticesPerPair
    sideIndices.push(a, b, a + 1, b, b + 1, a + 1)
  }
  surface('Flared hull', hullVertices, sideIndices, outer.color, boat)
  surface('Inside hull', liningVertices, sideIndices.slice().reverse(), inner.color, boat)
  const decking = outline.flatMap(([x, z]) => [x * floor.widthRatio, floor.y, z * floor.lengthRatio])
  const triangles: number[] = []
  for (let i = firstFanTriangleEnd; i < outline.length; i++) triangles.push(0, i - 1, i)
  surface('Cockpit floor', decking, triangles, floor.color, boat)
  const wood = paintSurface('wood', gunwale.color)
  buildGunwale(meshes, boat, wood)
  for (const z of thwart.stations) {
    // The hull narrows toward the ends, so the bench fits its narrower edge.
    const width = Math.min(thwartWidth(z - thwart.depth * half), thwartWidth(z + thwart.depth * half))
    box(0, thwart.y, z, width, thwart.height, thwart.depth, wood, boat)
  }
  box(0, outboard.leg.y, outboard.leg.z, ...outboard.leg.size, outboard.leg.color, boat)
  box(0, outboard.cowl.y, outboard.cowl.z, ...outboard.cowl.size, outboard.cowl.color, boat)
  return boat
}

export function createBuoy({ scene, sphere, box, cylinder }: MeshFactory, x: number, z: number) {
  const buoy = new TransformNode('Mooring buoy', scene)
  const { float, band, tab } = harborBuoy
  buoy.position.set(x, waterLevel, z)
  sphere(0, float.y, 0, ...float.size, float.color, buoy, false)
  cylinder(0, band.y, 0, band.diameter, band.diameter, band.height, band.sides, band.color, buoy)
  box(0, tab.y, 0, ...tab.size, tab.color, buoy, false)
  return buoy
}

const buoyBobAmplitude = 0.065
const buoyBobRate = 1.6
const buoyPitchRate = 1.13
const buoyPitchPhaseRatio = 0.6
const buoyPitchAmplitude = 0.035
const buoyRollRate = 1.4
const buoyRollAmplitude = 0.048

export function poseFloating(node: TransformNode, time: number, phase = 0, amplitude = buoyBobAmplitude) {
  node.position.y = waterLevel + Math.sin(time * buoyBobRate + phase) * amplitude
  node.rotation.x = Math.sin(time * buoyPitchRate + phase * buoyPitchPhaseRatio) * buoyPitchAmplitude
  node.rotation.z = Math.cos(time * buoyRollRate + phase) * buoyRollAmplitude
}
