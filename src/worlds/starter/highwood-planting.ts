import { highwoodPlants } from '../../assets/geometry/highwood-plants.ts'
import { plantingEncoding as encoding } from '../../assets/geometry/island-preview.ts'
import type { Point } from '../../world.ts'
import { highwoodPlantingLayers, plantingAges, plantingExposures } from './layout/highwood-planting.ts'

// Highwood's planting, decoded from the bake (scripts/plant-highwood.mjs). The
// host's walking solids and every screen's forest read the same list.

export type PlantingLayer = keyof typeof highwoodPlantingLayers
export const plantingLayers = Object.keys(highwoodPlantingLayers) as PlantingLayer[]

export interface Planting extends Point {
  layer: PlantingLayer
  // A tree catalog species id, such as scots-pine.
  species: string
  age: typeof plantingAges[number]
  exposure: typeof plantingExposures[number]
  // Which of the seeded templates for this species, age and exposure.
  variant: number
  // Turn about the vertical, so an exposed form's lean (+x) points downwind.
  heading: number
  scale: number
}

const fullTurn = Math.PI + Math.PI
const speciesByte = 4, packedByte = 5, headingByte = 6, scaleByte = 7
const zOffset = 2

function bits(value: number, shift: number, count: number) {
  return (value >> shift) & ((1 << count) - 1)
}

let decoded: readonly Planting[] | undefined

export function highwoodPlanting(): readonly Planting[] {
  if (decoded) return decoded
  const bytes = Uint8Array.from(atob(highwoodPlants.plants), (char) => char.charCodeAt(0))
  const view = new DataView(bytes.buffer)
  const { layerBits, ageBits, exposureBits } = encoding
  const out: Planting[] = []
  for (let at = 0; at < bytes.length; at += encoding.bytesPerPlant) {
    const packed = bytes[at + packedByte]
    out.push({
      x: highwoodPlants.west + view.getUint16(at, true) * encoding.positionStepM,
      z: highwoodPlants.south + view.getUint16(at + zOffset, true) * encoding.positionStepM,
      species: highwoodPlants.species[bytes[at + speciesByte]],
      layer: plantingLayers[bits(packed, 0, layerBits)],
      age: plantingAges[bits(packed, layerBits, ageBits)],
      exposure: plantingExposures[bits(packed, layerBits + ageBits, exposureBits)],
      variant: bits(packed, layerBits + ageBits + exposureBits, layerBits),
      heading: bytes[at + headingByte] / encoding.turnSteps * fullTurn,
      scale: 1 + (bytes[at + scaleByte] - encoding.scaleCentre) * encoding.scaleStep,
    })
  }
  decoded = out
  return decoded
}
