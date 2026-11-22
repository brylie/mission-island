import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { fireWatch, fireWatchFloor, fireWatchPoint } from '../fire-watch'
import { fireWatchGeometry } from './geometry/fire-watch'

const half = 0.5
const double = 2
const quarterTurn = Math.PI * half
const roofSides = 4
const finderSides = 16
const signs = [-1, 1] as const

type Box = MeshFactory['box']

// Height of the walking surface at a tower-local point, or 0 on open ground.
function floorAt(x: number, z: number) {
  const point = fireWatchPoint(x, z)
  return fireWatchFloor(point) ?? 0
}

// A box stretched between two points, used for braces, stringers and sloped rails.
function strut(box: Box, root: TransformNode, from: readonly [number, number, number], to: readonly [number, number, number], size: number, color: string) {
  const [x1, y1, z1] = from, [x2, y2, z2] = to
  const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1
  const length = Math.hypot(dx, dy, dz)
  const mesh = box((x1 + x2) * half, (y1 + y2) * half, (z1 + z2) * half, size, size, length, color, root)
  mesh.rotation.y = Math.atan2(dx, dz)
  mesh.rotation.x = -Math.atan2(dy, Math.hypot(dx, dz))
  return mesh
}

function buildFrame(box: Box, root: TransformNode) {
  const { deck, legs, braceLevels, brace, colors } = fireWatchGeometry
  const corner = deck.area[1] - legs.inset
  for (const sx of signs) {
    for (const sz of signs) {
      strut(box, root, [sx * (corner + legs.splay), 0, sz * (corner + legs.splay)], [sx * corner, deck.top - deck.thickness, sz * corner], legs.size, colors.timber)
    }
  }
  const levels = [0, ...braceLevels, deck.top - deck.thickness]
  const spread = (y: number) => corner + legs.splay * (1 - y / deck.top)
  for (const [index, y] of levels.entries()) {
    if (index) {
      for (const s of signs) {
        box(0, y, s * spread(y), spread(y) * double, brace.size, brace.size, colors.timberShade, root)
        box(s * spread(y), y, 0, brace.size, brace.size, spread(y) * double, colors.timberShade, root)
      }
    }
    const next = levels[index + 1]
    if (next === undefined) continue
    // X bracing on every face of each bay.
    for (const s of signs) {
      for (const flip of signs) {
        strut(box, root, [flip * spread(y), y, s * spread(y)], [-flip * spread(next), next, s * spread(next)], brace.size, colors.timberShade)
        strut(box, root, [s * spread(y), y, flip * spread(y)], [s * spread(next), next, -flip * spread(next)], brace.size, colors.timberShade)
      }
    }
  }
  const [minX, maxX, minZ, maxZ] = deck.area
  box(0, deck.top - deck.thickness * half, 0, maxX - minX, deck.thickness, maxZ - minZ, colors.tread, root)
}

function buildStairs(box: Box, root: TransformNode) {
  const { flights, landings, treadRise, tread, stringer, stairPosts, colors } = fireWatchGeometry
  for (const { area: [minX, maxX, minZ, maxZ], rise: [low, high] } of flights) {
    const steps = Math.round(Math.abs(high - low) / treadRise)
    const run = (maxZ - minZ) / steps
    const width = maxX - minX - stringer.width * double
    const centreX = (minX + maxX) * half
    for (let step = 0; step < steps; step++) {
      const z = minZ + run * (step + half)
      const y = low + (high - low) * (z - minZ) / (maxZ - minZ)
      box(centreX, y - tread.thickness * half, z, width, tread.thickness, run + tread.nosing, colors.tread, root)
    }
    for (const side of [minX + stringer.width * half, maxX - stringer.width * half]) {
      strut(box, root, [side, low - stringer.depth * half, minZ], [side, high - stringer.depth * half, maxZ], stringer.width, colors.timber)
    }
  }
  for (const { area: [minX, maxX, minZ, maxZ], top } of landings) {
    if (top === fireWatchGeometry.deck.top) continue
    box((minX + maxX) * half, top - tread.thickness, (minZ + maxZ) * half, maxX - minX, tread.thickness * double, maxZ - minZ, colors.tread, root)
    for (const x of [minX, maxX]) {
      for (const z of [minZ, maxZ]) box(x, top * half, z, stairPosts.size, top, stairPosts.size, colors.timber, root)
    }
  }
  buildSkirt(box, root)
}

// Slats along the outside of the stair block, so the closed space under the flights reads as solid.
function buildSkirt(box: Box, root: TransformNode) {
  const [minX, maxX, minZ, maxZ] = fireWatchGeometry.stairOuter
  const { rail, colors, treadRise } = fireWatchGeometry
  const spacing = rail.postSpacing * half
  const runs: [number, number, number, number][] = [[minX, minZ, minX, maxZ], [minX, minZ, maxX, minZ], [maxX, minZ, maxX, maxZ]]
  for (const [x1, z1, x2, z2] of runs) {
    const length = Math.hypot(x2 - x1, z2 - z1)
    const count = Math.floor(length / spacing)
    for (let slat = 1; slat < count; slat++) {
      const x = x1 + (x2 - x1) * slat / count, z = z1 + (z2 - z1) * slat / count
      const height = Math.min(floorAt(x, z), fireWatchGeometry.braceLevels[0]) - treadRise
      if (height > 0) box(x, height * half, z, rail.thickness, height, rail.thickness, colors.timberShade, root)
    }
  }
}

// The higher floor on either side of a rail running along (dirX, dirZ).
function railHeight(x: number, z: number, dirX: number, dirZ: number) {
  const offset = fireWatchGeometry.rail.thickness
  return Math.max(floorAt(x - dirZ * offset, z + dirX * offset), floorAt(x + dirZ * offset, z - dirX * offset))
}

function buildRails(box: Box, root: TransformNode) {
  const { rail, rails, colors } = fireWatchGeometry
  for (const [x1, z1, x2, z2] of rails) {
    const length = Math.hypot(x2 - x1, z2 - z1)
    const count = Math.max(1, Math.round(length / rail.postSpacing))
    const dirX = (x2 - x1) / length, dirZ = (z2 - z1) / length
    const posts = Array.from({ length: count + 1 }, (_, index) => {
      const x = x1 + (x2 - x1) * index / count, z = z1 + (z2 - z1) * index / count
      return [x, railHeight(x, z, dirX, dirZ) + rail.height, z] as const
    })
    for (const [x, top, z] of posts) box(x, top - rail.height * half, z, rail.post, rail.height, rail.post, colors.rail, root)
    for (const [index, post] of posts.entries()) {
      const next = posts[index + 1]
      if (!next) continue
      strut(box, root, post, next, rail.thickness, colors.rail)
      strut(box, root, [post[0], post[1] - rail.height * half, post[2]], [next[0], next[1] - rail.height * half, next[2]], rail.thickness * half, colors.rail)
    }
  }
}

function buildCab(meshes: MeshFactory, root: TransformNode) {
  const { box, cylinder } = meshes
  const { deck, cab, colors, finder, flag } = fireWatchGeometry
  const [minX, maxX, minZ, maxZ] = deck.area
  const inset = cab.postSize * half
  const roofBase = deck.top + cab.roofHeight
  for (const x of [minX + inset, maxX - inset]) {
    for (const z of [minZ + inset, maxZ - inset]) box(x, deck.top + cab.roofHeight * half, z, cab.postSize, cab.roofHeight, cab.postSize, colors.cabTrim, root)
  }
  // A lintel band below the eaves frames the open windows.
  for (const s of signs) {
    box(0, roofBase - cab.lintel * half, s * (maxZ - inset), maxX - minX, cab.lintel, cab.wallThickness, colors.cabWall, root)
    box(s * (maxX - inset), roofBase - cab.lintel * half, 0, cab.wallThickness, cab.lintel, maxZ - minZ, colors.cabWall, root)
  }
  const span = (maxX - minX) * half + cab.roofOverhang
  const soffit = box(0, roofBase, 0, span * double, cab.lintel * half, span * double, colors.cabTrim, root)
  soffit.receiveShadows = true
  const roof = cylinder(0, roofBase + cab.roofRise * half, 0, 0, span * double * Math.SQRT2, cab.roofRise, roofSides, colors.roof, root)
  roof.rotation.y = quarterTurn * half
  const [pedestalWidth, pedestalHeight, pedestalDepth] = finder.pedestal
  box(0, deck.top + pedestalHeight * half, 0, pedestalWidth, pedestalHeight, pedestalDepth, colors.finder, root)
  const [topWidth, topHeight] = finder.top
  cylinder(0, deck.top + pedestalHeight + topHeight * half, 0, topWidth, topWidth, topHeight, finderSides, colors.finderTop, root)
  const [sightWidth, sightHeight] = finder.sight
  for (const s of signs) box(0, deck.top + pedestalHeight + topHeight + sightHeight * half, s * finder.ring * half, sightWidth, sightHeight, sightWidth, colors.finder, root)
  const poleTop = roofBase + cab.roofRise + flag.height
  box(0, (roofBase + cab.roofRise * half + poleTop) * half, 0, flag.pole, poleTop - roofBase - cab.roofRise * half, flag.pole, colors.cabTrim, root)
  const [clothWidth, clothHeight] = flag.cloth
  box(clothWidth * half, poleTop - clothHeight * half, 0, clothWidth, clothHeight, flag.pole * half, colors.flag, root)
}

export function createFireWatch(meshes: MeshFactory, base: number) {
  const root = new TransformNode('Fire Watch tower', meshes.scene)
  root.position.set(fireWatch.x, base, fireWatch.z)
  root.rotation.y = fireWatch.heading
  buildFrame(meshes.box, root)
  buildStairs(meshes.box, root)
  buildRails(meshes.box, root)
  buildCab(meshes, root)
  meshes.batchModel(root)
  return root
}
