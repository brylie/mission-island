import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { fenceZ, front, gateway } from '../gate-layout'
import type { MeshFactory } from '../island-meshes'
import { seededRandom } from '../seeded-random'
import { groundHeight } from '../terrain'
import { distance, houseRoofRise, wrenCottage } from '../world'
import type { Point } from '../world'
import { backPath } from '../worlds/starter/residents/wren-route'
import { flowerBeds, rainBarrel, sawhorse, woodpile } from '../worlds/starter/wren-garden'

const stoneTones = ['#8d877a', '#9a9384', '#7f7b70', '#a39b89']
const soil = '#6a513a', plank = '#a17a55', log = '#8a6646', logEnd = '#c9a678', brick = '#9c5a45', leaf = '#5f8a4e'

const { x, z, w } = wrenCottage

// Flagstones from the gate to the front door: the shortcut Wren takes once the gate is mended.
const frontPath = Array.from({ length: 4 }, (_, i) => ({
  x: gateway.x + [-0.05, 0.07, -0.03, 0.05][i],
  z: fenceZ + 0.38 + i * (front - fenceZ - 0.85) / 3,
  width: [0.7, 0.62, 0.74, 0.66][i],
  depth: 0.42,
}))

const chimney = { x: x + 1.15, z: z + 0.55, w: 0.5, d: 0.5 }
const windowBoxes = [-1, 1].map((side) => ({ x: x + side * w * 0.31, z: front - 0.17 }))

// The worn back path: muted stones of uneven size and spacing, slightly sunk into the grass.
const steppingStones = (() => {
  const random = seededRandom(7721)
  const stones: (Point & { rx: number, rz: number, heading: number, tone: number })[] = []
  for (let i = 1; i < backPath.length; i++) {
    const [from, to] = [backPath[i - 1], backPath[i]]
    const length = distance(from, to)
    for (let along = 0.55; along < length - 0.2; along += 0.78 + random() * 0.3) {
      const f = along / length, sway = (random() - 0.5) * 0.26
      stones.push({ x: from.x + (to.x - from.x) * f + sway * (to.z - from.z) / length, z: from.z + (to.z - from.z) * f - sway * (to.x - from.x) / length, rx: 0.19 + random() * 0.08, rz: 0.15 + random() * 0.07, heading: random() * Math.PI, tone: random() })
    }
  }
  return stones
})()

function flowerBed({ box, sphere }: MeshFactory, bed: typeof flowerBeds[number]) {
  const y = groundHeight(bed)
  box(bed.x, y + 0.07, bed.z, bed.geometry.width, 0.14, bed.geometry.depth, plank)
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
  const { height, rimDiameter } = rainBarrel.geometry
  cylinder(rainBarrel.x, groundHeight(rainBarrel) + height / 2, rainBarrel.z, 0.52, 0.48, height, 10, '#6f5a43')
  for (const ring of [0.18, 0.62]) cylinder(rainBarrel.x, groundHeight(rainBarrel) + ring, rainBarrel.z, rimDiameter, rimDiameter, 0.05, 10, '#3f3c37')
}

function carpentry({ box, cylinder, scene }: MeshFactory) {
  const pile = new TransformNode('Woodpile', scene)
  pile.position.set(woodpile.x, groundHeight(woodpile), woodpile.z)
  pile.rotation.y = woodpile.heading
  const { courses, bottomLogCount, logDiameter, logLength } = woodpile.geometry
  for (let row = 0; row < courses; row++) {
    for (let i = 0; i < bottomLogCount - row; i++) {
      const piece = cylinder(-0.36 + i * 0.24 + row * 0.12, 0.12 + row * 0.2, 0, logDiameter, logDiameter, logLength, 7, log, pile)
      piece.rotation.x = Math.PI / 2
      const end = cylinder(-0.36 + i * 0.24 + row * 0.12, 0.12 + row * 0.2, -0.315, 0.17, 0.17, 0.02, 7, logEnd, pile)
      end.rotation.x = Math.PI / 2
    }
  }
  const horse = new TransformNode('Sawhorse', scene)
  horse.position.set(sawhorse.x, groundHeight(sawhorse), sawhorse.z)
  horse.rotation.y = sawhorse.heading
  box(0, 0.66, 0, sawhorse.geometry.beamWidth, 0.1, 0.12, plank, horse)
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
