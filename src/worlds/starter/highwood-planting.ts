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
const byteMax = 255

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

let groundBytes: Uint8Array | undefined

// How much needle litter, heath, moss and bracken cover the ground at a point, 0 to 1 each.
export function highwoodGroundCover({ x, z }: Point) {
  groundBytes ??= Uint8Array.from(atob(highwoodPlants.ground), (char) => char.charCodeAt(0))
  const { groundCellM, groundChannels } = encoding
  const gx = (x - highwoodPlants.west) / groundCellM, gz = (z - highwoodPlants.south) / groundCellM
  const cover = [0, 0, 0, 0]
  if (gx < 0 || gz < 0 || gx >= highwoodPlants.groundColumns - 1 || gz >= highwoodPlants.groundRows - 1) return { litter: 0, heath: 0, moss: 0, bracken: 0 }
  const i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j
  const corners = [[i, j, (1 - fx) * (1 - fz)], [i + 1, j, fx * (1 - fz)], [i, j + 1, (1 - fx) * fz], [i + 1, j + 1, fx * fz]] as const
  for (const [ci, cj, weight] of corners) {
    const at = (cj * highwoodPlants.groundColumns + ci) * groundChannels
    for (let channel = 0; channel < groundChannels; channel++) cover[channel] += groundBytes[at + channel] * weight / byteMax
  }
  return { litter: cover[0], heath: cover[1], moss: cover[2], bracken: cover[3] }
}
