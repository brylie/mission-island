import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { brinewickFerryGeometry, type WaterfrontBox } from './geometry/brinewick-waterfront'

export function createBrinewickFerry(meshes: MeshFactory) {
  const root = new TransformNode('Brinewick Ferry', meshes.scene)
  const { hull, deckSide, bridge, windowFrames, roofEquipment } = brinewickFerryGeometry
  const { rail, posts, deckMarkings } = deckSide
  function addBoxes(parts: readonly WaterfrontBox[], side = 1) {
    for (const [x, y, z, width, height, depth, color] of parts) meshes.box(side * x, y, z, width, height, depth, color, root)
  }
  addBoxes(hull)
  for (const side of [-1, 1]) {
    addBoxes(rail, side)
    for (let z = posts.firstZ; z < posts.endZ; z += posts.spacing) {
      meshes.box(side * posts.x, posts.y, z, ...posts.size, posts.color, root)
    }
    addBoxes(deckMarkings, side)
  }
  addBoxes(bridge)
  for (const x of windowFrames.x) meshes.box(x, windowFrames.y, windowFrames.z, ...windowFrames.size, windowFrames.color, root)
  addBoxes(roofEquipment)
  return root
}
