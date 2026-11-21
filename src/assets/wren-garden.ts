import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { groundHeight } from '../terrain'
import { houseRoofRise, wrenCottage } from '../world'
import { chimney, flowerBeds, frontPath, rainBarrel, sawhorse, steppingStones, windowBoxes, woodpile } from '../worlds/starter/wren-garden'

const stoneTones = ['#8d877a', '#9a9384', '#7f7b70', '#a39b89']
const soil = '#6a513a', plank = '#a17a55', log = '#8a6646', logEnd = '#c9a678', brick = '#9c5a45', leaf = '#5f8a4e'

function flowerBed({ box, sphere }: MeshFactory, bed: typeof flowerBeds[number]) {
  const y = groundHeight(bed)
  box(bed.x, y + 0.07, bed.z, bed.width + 0.1, 0.14, bed.depth + 0.1, plank)
  box(bed.x, y + 0.15, bed.z, bed.width - 0.04, 0.04, bed.depth - 0.04, soil)
  // Staggered clumps of leaves and blooms so the bed reads as planted, not tiled.
  const across = Math.max(1, Math.round(bed.width / 0.32)), along = Math.max(1, Math.round(bed.depth / 0.32))
  for (let i = 0; i < across; i++) {
    for (let j = 0; j < along; j++) {
      const px = bed.x - bed.width / 2 + (i + 0.5) * bed.width / across + ((i + j) % 2 ? 0.05 : -0.05)
      const pz = bed.z - bed.depth / 2 + (j + 0.5) * bed.depth / along
      const height = 0.16 + ((i * 7 + j * 3) % 5) * 0.025
      sphere(px, y + 0.17 + height / 2, pz, 0.24, height, 0.22, leaf)
      sphere(px + 0.03, y + 0.2 + height, pz - 0.02, 0.11, 0.09, 0.11, bed.flowers[(i + j * 2) % bed.flowers.length])
    }
  }
}

function cottageCharm({ box, sphere, cylinder }: MeshFactory) {
  const { x, z, h, d } = wrenCottage
  const y = groundHeight(wrenCottage)
  // The chimney stands on the back slope and clears the ridge.
  const roofAt = h + houseRoofRise * (1 - Math.abs(chimney.z - z) / (d / 2 + 0.3))
  const top = h + houseRoofRise + 0.55
  box(chimney.x, y + (roofAt + top) / 2 - 0.2, chimney.z, chimney.w, top - roofAt + 0.4, chimney.d, brick)
  box(chimney.x, y + top + 0.04, chimney.z, chimney.w + 0.1, 0.08, chimney.d + 0.1, '#7a4636')
  for (const spot of windowBoxes) {
    box(spot.x, y + 1.42, spot.z, 1.02, 0.17, 0.2, plank)
    for (const [i, color] of ['#b99bd8', '#f4ead0', '#e9c35a', '#b99bd8'].entries()) {
      sphere(spot.x - 0.36 + i * 0.24, y + 1.56, spot.z, 0.2, 0.14, 0.14, leaf)
      sphere(spot.x - 0.33 + i * 0.24, y + 1.64, spot.z - 0.03, 0.09, 0.08, 0.09, color)
    }
  }
  // A warm lantern beside the door and a worn step.
  box(x + 0.82, y + 2.05, z - d / 2 - 0.1, 0.16, 0.24, 0.14, '#2f3a36')
  box(x + 0.82, y + 2.05, z - d / 2 - 0.17, 0.1, 0.15, 0.02, '#ffd58a', undefined, false)
  box(x, y + 0.06, z - d / 2 - 0.3, 1.3, 0.12, 0.5, '#a9a294')
  cylinder(rainBarrel.x, groundHeight(rainBarrel) + 0.4, rainBarrel.z, 0.52, 0.48, 0.8, 10, '#6f5a43')
  for (const ring of [0.18, 0.62]) cylinder(rainBarrel.x, groundHeight(rainBarrel) + ring, rainBarrel.z, 0.55, 0.55, 0.05, 10, '#3f3c37')
}

function carpentry({ box, cylinder, scene }: MeshFactory) {
  const pile = new TransformNode('Woodpile', scene)
  pile.position.set(woodpile.x, groundHeight(woodpile), woodpile.z)
  pile.rotation.y = woodpile.heading
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 4 - row; i++) {
      const piece = cylinder(-0.36 + i * 0.24 + row * 0.12, 0.12 + row * 0.2, 0, 0.21, 0.21, 0.62, 7, log, pile)
      piece.rotation.x = Math.PI / 2
      const end = cylinder(-0.36 + i * 0.24 + row * 0.12, 0.12 + row * 0.2, -0.315, 0.17, 0.17, 0.02, 7, logEnd, pile)
      end.rotation.x = Math.PI / 2
    }
  }
  const horse = new TransformNode('Sawhorse', scene)
  horse.position.set(sawhorse.x, groundHeight(sawhorse), sawhorse.z)
  horse.rotation.y = sawhorse.heading
  box(0, 0.66, 0, 1.1, 0.1, 0.12, plank, horse)
  for (const sx of [-0.42, 0.42]) {
    for (const sz of [-1, 1]) {
      const leg = box(sx, 0.33, sz * 0.13, 0.07, 0.72, 0.07, plank, horse)
      leg.rotation.x = sz * 0.3
    }
  }
  const board = box(0.1, 0.74, 0, 1.5, 0.04, 0.26, '#c39a6b', horse)
  board.rotation.y = 0.2
}

// Wren's cottage dressing: planted beds, a flagstone front path, the carpenter's back yard and
// the worn stepping stones of the long way round.
export function createWrenGarden(meshes: MeshFactory) {
  for (const bed of flowerBeds) flowerBed(meshes, bed)
  for (const slab of frontPath) meshes.box(slab.x, groundHeight(slab) + 0.02, slab.z, slab.width, 0.05, slab.depth, stoneTones[1])
  for (const stone of steppingStones) {
    const piece = meshes.cylinder(stone.x, groundHeight(stone) + 0.012, stone.z, 1, 1, 0.045, 8, stoneTones[Math.floor(stone.tone * stoneTones.length)])
    piece.scaling.set(stone.rx * 2, 1, stone.rz * 2)
    piece.rotation.y = stone.heading
  }
  cottageCharm(meshes)
  carpentry(meshes)
}
