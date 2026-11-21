import type { SupportBox } from '../../assets/geometry/site-props.ts'
import { flowerBedFrame, rainBarrelGeometry, sawhorseGeometry, woodpileGeometry } from '../../assets/geometry/wren-garden.ts'
import { fenceZ } from '../../gate-layout.ts'
import { wrenCottage } from '../../world.ts'

// These placements feed both the garden model and the Starter Island colliders.
const { x, z, d } = wrenCottage
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
  { x: x + westBedOffsetX, z: fenceZ + westBedOffsetZ, width: westBedWidth, depth: westBedDepth, flowers: ['#b99bd8', '#f4ead0', '#e9c35a'] },
  { x: x + eastBedOffsetX, z: fenceZ + eastBedOffsetZ, width: eastBedWidth, depth: eastBedDepth, flowers: ['#f4ead0', '#b99bd8', '#e98a6b'] },
].map((bed) => {
  const width = bed.width + flowerBedFrame.overhang
  const depth = bed.depth + flowerBedFrame.overhang
  const supportBoxes: readonly SupportBox[] = [[width, depth, flowerBedFrame.supportHeight]]
  return { ...bed, geometry: { width, depth, supportBoxes } }
})

export const woodpile = { x: x + woodpileOffsetX, z: back + behindCottage, heading: 0, geometry: woodpileGeometry }
export const sawhorse = { x: x + sawhorseOffset, z: back + sawhorseOffset, heading: sawhorseHeading, geometry: sawhorseGeometry }
export const rainBarrel = { x: x + barrelOffsetX, z: back + behindCottage, geometry: rainBarrelGeometry }
