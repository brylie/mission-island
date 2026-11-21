import { createOreBayDividers, createOreHopper, createStockpileMeshes } from '../assets/quarry'
import { createRockLedges } from '../assets/rock-ledges'
import type { MeshFactory } from '../island-meshes'
import { seededRandom } from '../seeded-random'
import { quarryYard } from '../worlds/saltwind/layout/quarry'
import { fallsWidth, fallsX, fallsY, groundHeight, surfaceHeight } from './terrain'
import { stockpiles, placeStockpile } from './stockpiles'
import type { ScenerySolids } from './walking'

export function buildStockpiles(meshes: MeshFactory, solids: ScenerySolids) {
  const firstFixture = meshes.scene.meshes.length
  const { hopper, dividerX, dividerZ } = quarryYard
  createOreHopper(meshes, { x: hopper.x, y: surfaceHeight(hopper.x, hopper.z), z: hopper.z })
  createOreBayDividers(meshes, dividerX.map((x) => ({ x, y: surfaceHeight(x, dividerZ), z: dividerZ })))
  solids.capture(meshes.scene.meshes.slice(firstFixture))

  for (const load of stockpiles) {
    const random = seededRandom(load.seed)
    const point = placeStockpile(load, solids, random)
    createStockpileMeshes(meshes, load.id, point, random)
  }
}

const upperWestZ = 193.2
const upperEastZ = 190.8
const middleWestZ = 184
const middleEastZ = 180
const lowerWestZ = 174.8
const lowerEastZ = 170.7
const tarnstepLedges = [
  { z: upperWestZ, bank: -1, upper: true },
  { z: upperEastZ, bank: 1, upper: true },
  { z: middleWestZ, bank: -1, upper: false },
  { z: middleEastZ, bank: 1, upper: false },
  { z: lowerWestZ, bank: -1, upper: false },
  { z: lowerEastZ, bank: 1, upper: false },
] as const

export function buildTarnstepLedges(meshes: MeshFactory) {
  createRockLedges(meshes, tarnstepLedges, { fallsX, fallsWidth, fallsY, groundHeight })
}
