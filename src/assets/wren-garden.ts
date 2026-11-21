import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { groundHeight } from '../terrain'
import { houseRoofRise, wrenCottage } from '../world'
import { chimney, flowerBeds, frontPath, rainBarrel, sawhorse, steppingStones, windowBoxes, woodpile } from '../worlds/starter/wren-garden'

const stoneTones = ['#8d877a', '#9a9384', '#7f7b70', '#a39b89']
const soil = '#6a513a', plank = '#a17a55', log = '#8a6646', logEnd = '#c9a678', brick = '#9c5a45', leaf = '#5f8a4e'

function flowerBed({ box, sphere }: MeshFactory, bed: typeof flowerBeds[number]) {
  const y = groundHeight(bed)
  box(bed.x, y + .07, bed.z, bed.width + .1, .14, bed.depth + .1, plank)
  box(bed.x, y + .15, bed.z, bed.width - .04, .04, bed.depth - .04, soil)
  // Staggered clumps of leaves and blooms so the bed reads as planted, not tiled.
  const across = Math.max(1, Math.round(bed.width / .32)), along = Math.max(1, Math.round(bed.depth / .32))
  for (let i = 0; i < across; i++) {
    for (let j = 0; j < along; j++) {
      const px = bed.x - bed.width / 2 + (i + .5) * bed.width / across + ((i + j) % 2 ? .05 : -.05)
      const pz = bed.z - bed.depth / 2 + (j + .5) * bed.depth / along
      const height = .16 + ((i * 7 + j * 3) % 5) * .025
      sphere(px, y + .17 + height / 2, pz, .24, height, .22, leaf)
      sphere(px + .03, y + .2 + height, pz - .02, .11, .09, .11, bed.flowers[(i + j * 2) % bed.flowers.length])
    }
  }
}

function cottageCharm({ box, sphere, cylinder }: MeshFactory) {
  const { x, z, h, d } = wrenCottage
  const y = groundHeight(wrenCottage)
  // The chimney stands on the back slope and clears the ridge.
  const roofAt = h + houseRoofRise * (1 - Math.abs(chimney.z - z) / (d / 2 + .3))
  const top = h + houseRoofRise + .55
  box(chimney.x, y + (roofAt + top) / 2 - .2, chimney.z, chimney.w, top - roofAt + .4, chimney.d, brick)
  box(chimney.x, y + top + .04, chimney.z, chimney.w + .1, .08, chimney.d + .1, '#7a4636')
  for (const spot of windowBoxes) {
    box(spot.x, y + 1.42, spot.z, 1.02, .17, .2, plank)
    for (const [i, color] of ['#b99bd8', '#f4ead0', '#e9c35a', '#b99bd8'].entries()) {
      sphere(spot.x - .36 + i * .24, y + 1.56, spot.z, .2, .14, .14, leaf)
      sphere(spot.x - .33 + i * .24, y + 1.64, spot.z - .03, .09, .08, .09, color)
    }
  }
  // A warm lantern beside the door and a worn step.
  box(x + .82, y + 2.05, z - d / 2 - .1, .16, .24, .14, '#2f3a36')
  box(x + .82, y + 2.05, z - d / 2 - .17, .1, .15, .02, '#ffd58a', undefined, false)
  box(x, y + .06, z - d / 2 - .3, 1.3, .12, .5, '#a9a294')
  cylinder(rainBarrel.x, groundHeight(rainBarrel) + .4, rainBarrel.z, .52, .48, .8, 10, '#6f5a43')
  for (const ring of [.18, .62]) cylinder(rainBarrel.x, groundHeight(rainBarrel) + ring, rainBarrel.z, .55, .55, .05, 10, '#3f3c37')
}

function carpentry({ box, cylinder, scene }: MeshFactory) {
  const pile = new TransformNode('Woodpile', scene)
  pile.position.set(woodpile.x, groundHeight(woodpile), woodpile.z)
  pile.rotation.y = woodpile.heading
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 4 - row; i++) {
      const piece = cylinder(-.36 + i * .24 + row * .12, .12 + row * .2, 0, .21, .21, .62, 7, log, pile)
      piece.rotation.x = Math.PI / 2
      const end = cylinder(-.36 + i * .24 + row * .12, .12 + row * .2, -.315, .17, .17, .02, 7, logEnd, pile)
      end.rotation.x = Math.PI / 2
    }
  }
  const horse = new TransformNode('Sawhorse', scene)
  horse.position.set(sawhorse.x, groundHeight(sawhorse), sawhorse.z)
  horse.rotation.y = sawhorse.heading
  box(0, .66, 0, 1.1, .1, .12, plank, horse)
  for (const sx of [-.42, .42]) {
    for (const sz of [-1, 1]) {
      const leg = box(sx, .33, sz * .13, .07, .72, .07, plank, horse)
      leg.rotation.x = sz * .3
    }
  }
  const board = box(.1, .74, 0, 1.5, .04, .26, '#c39a6b', horse)
  board.rotation.y = .2
}

// Wren's cottage dressing: planted beds, a flagstone front path, the carpenter's back yard and
// the worn stepping stones of the long way round.
export function createWrenGarden(meshes: MeshFactory) {
  for (const bed of flowerBeds) flowerBed(meshes, bed)
  for (const slab of frontPath) meshes.box(slab.x, groundHeight(slab) + .02, slab.z, slab.width, .05, slab.depth, stoneTones[1])
  for (const stone of steppingStones) {
    const piece = meshes.cylinder(stone.x, groundHeight(stone) + .012, stone.z, 1, 1, .045, 8,
      stoneTones[Math.floor(stone.tone * stoneTones.length)])
    piece.scaling.set(stone.rx * 2, 1, stone.rz * 2)
    piece.rotation.y = stone.heading
  }
  cottageCharm(meshes)
  carpentry(meshes)
}
