import type { SupportBox } from '../../assets/geometry/site-props.ts'
import { starterHouseModel } from '../../assets/geometry/starter-house.ts'
import { flowerBedFrame, rainBarrelGeometry, sawhorseGeometry, woodpileGeometry, wrenCottageTrim, wrenFlowerColors, wrenPathModel } from '../../assets/geometry/wren-garden.ts'
import { fenceZ, front, gateway } from '../../gate-layout.ts'
import { wrenCottage } from '../../world.ts'

// These placements feed both the garden model and the Starter Island colliders.
const { x, z, d, w } = wrenCottage
const half = 0.5
const back = z + d * half
const westBedOffsetX = -2.05
const westBedOffsetZ = 1.15
const westBedWidth = 0.75
const westBedDepth = 1.75
const eastBedOffsetX = 1.6
const eastBedOffsetZ = 0.62
const eastBedWidth = 1.5
const eastBedDepth = 0.7
const woodpileOffsetX = 1.72
const behindCottage = 0.34
const sawhorseOffset = 1.55
const sawhorseHeading = 0.35
const barrelOffsetX = 1.02

// Low flower beds inside the fence, clear of the gate leaf's swing and the front path.
export const flowerBeds = [
  { x: x + westBedOffsetX, z: fenceZ + westBedOffsetZ, width: westBedWidth, depth: westBedDepth, flowers: wrenFlowerColors.westBed },
  { x: x + eastBedOffsetX, z: fenceZ + eastBedOffsetZ, width: eastBedWidth, depth: eastBedDepth, flowers: wrenFlowerColors.eastBed },
].map((bed) => {
  const width = bed.width + flowerBedFrame.overhang
  const depth = bed.depth + flowerBedFrame.overhang
  const supportBoxes: readonly SupportBox[] = [[width, depth, flowerBedFrame.supportHeight]]
  return { ...bed, geometry: { width, depth, supportBoxes } }
})

export const woodpile = { x: x + woodpileOffsetX, z: back + behindCottage, heading: 0, geometry: woodpileGeometry }
export const sawhorse = { x: x + sawhorseOffset, z: back + sawhorseOffset, heading: sawhorseHeading, geometry: sawhorseGeometry }
export const rainBarrel = { x: x + barrelOffsetX, z: back + behindCottage, geometry: rainBarrelGeometry }

// These stones connect the repaired gate to the front door.
const { slabs, gateInset, doorClearance } = wrenPathModel.front
export const frontPath = slabs.map(({ x: offset, width }, index) => ({
  x: gateway.x + offset,
  z: fenceZ + gateInset + index * (front - fenceZ - doorClearance) / (slabs.length - 1),
  width,
}))

const { offset: chimneyOffset } = wrenCottageTrim.chimney
export const chimney = { x: x + chimneyOffset.x, z: z + chimneyOffset.z }
const { sideFraction, mullion } = starterHouseModel.windows
export const windowBoxes = [-1, 1].map((side) => ({ x: x + side * w * sideFraction, z: front - mullion.outset }))
