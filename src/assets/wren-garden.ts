import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { front } from '../gate-layout'
import type { MeshFactory } from '../island-meshes'
import { seededRandom } from '../seeded-random'
import { groundHeight } from '../terrain'
import { distance, wrenCottage } from '../world'
import type { Point } from '../world'
import { backPath } from '../worlds/starter/residents/wren-route'
import { chimney, flowerBeds, frontPath, rainBarrel, sawhorse, windowBoxes, woodpile } from '../worlds/starter/wren-garden'
import { houseRoofRise, starterHouseModel } from './geometry/starter-house'
import { flowerBedFrame, wrenCottageTrim, wrenFlowerColors, wrenPathModel } from './geometry/wren-garden'

const half = 0.5
const diameterPerRadius = 2
const quarterTurn = Math.PI * half
const sides = [-1, 1] as const

// The worn stepping stones follow the route Wren takes around the cottage.
const steppingStones = (() => {
  const { scatter, radii } = wrenPathModel.back
  const random = seededRandom(scatter.seed)
  const stones: (Point & { rx: number, rz: number, heading: number, tone: number })[] = []
  for (let i = 1; i < backPath.length; i++) {
    const [from, to] = [backPath[i - 1], backPath[i]]
    const length = distance(from, to)
    for (let along = scatter.start; along < length - scatter.endClearance; along += scatter.spacing + random() * scatter.spacingJitter) {
      const f = along / length, sway = (random() - half) * scatter.sway
      stones.push({
        x: from.x + (to.x - from.x) * f + sway * (to.z - from.z) / length,
        z: from.z + (to.z - from.z) * f - sway * (to.x - from.x) / length,
        rx: radii.x + random() * radii.xJitter,
        rz: radii.z + random() * radii.zJitter,
        heading: random() * Math.PI,
        tone: random(),
      })
    }
  }
  return stones
})()

function flowerBed({ box, sphere }: MeshFactory, bed: typeof flowerBeds[number]) {
  const y = groundHeight(bed)
  const { plank, soil, plants } = flowerBedFrame
  box(bed.x, y + plank.centerY, bed.z, bed.geometry.width, plank.height, bed.geometry.depth, plank.color)
  box(bed.x, y + soil.centerY, bed.z, bed.width - soil.inset, soil.height, bed.depth - soil.inset, soil.color)
  const { spacing, stagger, patternPeriod, height: growth, leaves, bloom } = plants
  const across = Math.max(1, Math.round(bed.width / spacing)), along = Math.max(1, Math.round(bed.depth / spacing))
  for (let i = 0; i < across; i++) {
    for (let j = 0; j < along; j++) {
      const px = bed.x - bed.width * half + (i + half) * bed.width / across + ((i + j) % patternPeriod ? stagger : -stagger)
      const pz = bed.z - bed.depth * half + (j + half) * bed.depth / along
      const height = growth.first + ((i * growth.columnStep + j * growth.rowStep) % growth.levels) * growth.levelStep
      sphere(px, y + leaves.y + height * half, pz, leaves.width, height, leaves.depth, leaves.color)
      sphere(px + bloom.x, y + bloom.y + height, pz + bloom.z, ...bloom.size, bed.flowers[(i + j * bloom.rowColorOffset) % bed.flowers.length])
    }
  }
}

function cottageCharm({ box, sphere, cylinder }: MeshFactory) {
  const { x, z, h, d } = wrenCottage
  const y = groundHeight(wrenCottage)
  const { chimney: trim, windowBox, lantern, step } = wrenCottageTrim
  // The chimney stands on the back slope and clears the ridge.
  const roofAt = h + houseRoofRise * (1 - Math.abs(chimney.z - z) / (d * half + starterHouseModel.roof.depthOverhang))
  const { body, cap } = trim
  const top = h + houseRoofRise + body.aboveRidge
  box(chimney.x, y + (roofAt + top) * half - body.roofOverlap * half, chimney.z, body.width, top - roofAt + body.roofOverlap, body.depth, body.color)
  box(chimney.x, y + top + cap.rise, chimney.z, body.width + cap.sizeAllowance, cap.height, body.depth + cap.sizeAllowance, cap.color)
  const { wood, leaves, blooms, spacing } = windowBox
  for (const spot of windowBoxes) {
    box(spot.x, y + wood.y, spot.z, ...wood.size, wood.color)
    for (const [i, color] of wrenFlowerColors.windowBox.entries()) {
      sphere(spot.x + leaves.firstX + i * spacing, y + leaves.y, spot.z, ...leaves.size, leaves.color)
      sphere(spot.x + blooms.firstX + i * spacing, y + blooms.y, spot.z + blooms.z, ...blooms.size, color)
    }
  }
  // A warm lantern beside the door and a worn step.
  box(x + lantern.x, y + lantern.y, front - lantern.case.outset, ...lantern.case.size, lantern.case.color)
  box(x + lantern.x, y + lantern.y, front - lantern.glass.outset, ...lantern.glass.size, lantern.glass.color, undefined, false)
  box(x, y + step.y, front - step.outset, ...step.size, step.color)
  const { height, rimDiameter, staves, hoops, sides: barrelSides } = rainBarrel.geometry
  const barrelFloor = groundHeight(rainBarrel)
  cylinder(rainBarrel.x, barrelFloor + height * half, rainBarrel.z, staves.topDiameter, staves.baseDiameter, height, barrelSides, staves.color)
  for (const ring of hoops.centers) cylinder(rainBarrel.x, barrelFloor + ring, rainBarrel.z, rimDiameter, rimDiameter, hoops.thickness, barrelSides, hoops.color)
}

function carpentry({ box, cylinder, scene }: MeshFactory) {
  const pile = new TransformNode('Woodpile', scene)
  pile.position.set(woodpile.x, groundHeight(woodpile), woodpile.z)
  pile.rotation.y = woodpile.heading
  const { courses, bottomLogCount, logDiameter, logLength, layout, bark, endGrain, sides: logSides } = woodpile.geometry
  for (let row = 0; row < courses; row++) {
    for (let i = 0; i < bottomLogCount - row; i++) {
      const x = layout.firstX + i * layout.logSpacing + row * layout.rowInset
      const y = layout.firstY + row * layout.rowRise
      const piece = cylinder(x, y, 0, logDiameter, logDiameter, logLength, logSides, bark, pile)
      piece.rotation.x = quarterTurn
      const end = cylinder(x, y, endGrain.z, endGrain.diameter, endGrain.diameter, endGrain.thickness, logSides, endGrain.color, pile)
      end.rotation.x = quarterTurn
    }
  }
  const horse = new TransformNode('Sawhorse', scene)
  horse.position.set(sawhorse.x, groundHeight(sawhorse), sawhorse.z)
  horse.rotation.y = sawhorse.heading
  const { beam, legs, board, color } = sawhorse.geometry
  box(0, beam.y, 0, beam.width, beam.height, beam.depth, color, horse)
  for (const x of legs.x) {
    for (const side of sides) box(x, legs.y, side * legs.z, ...legs.size, color, horse).rotation.x = side * legs.splay
  }
  box(board.x, board.y, 0, ...board.size, board.color, horse).rotation.y = board.heading
}

export function createWrenGarden(meshes: MeshFactory) {
  const { front: slabModel, back: stoneModel } = wrenPathModel
  for (const bed of flowerBeds) flowerBed(meshes, bed)
  for (const slab of frontPath) {
    meshes.box(slab.x, groundHeight(slab) + slabModel.lift, slab.z, slab.width, slabModel.height, slabModel.depth, slabModel.color)
  }
  for (const stone of steppingStones) {
    const color = stoneModel.colors[Math.floor(stone.tone * stoneModel.colors.length)]
    const piece = meshes.cylinder(stone.x, groundHeight(stone) + stoneModel.lift, stone.z, 1, 1, stoneModel.thickness, stoneModel.sides, color)
    piece.scaling.set(stone.rx * diameterPerRadius, 1, stone.rz * diameterPerRadius)
    piece.rotation.y = stone.heading
  }
  cottageCharm(meshes)
  carpentry(meshes)
}
