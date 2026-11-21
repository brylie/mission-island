import { distance, type Point } from './world.ts'

export const crateDriverXp = 10
export const haulerUnlockXp = 20
export const oreNames = { 'magnetite-seam': 'Magnetite', 'malachite-bloom': 'Malachite', 'honey-calcite': 'Honey calcite' } as const
export type Ore = keyof typeof oreNames

const quay = { name: 'Brinewick freight quay', x: -268, z: -208 }
export const schoolBay = { name: 'Barleycross School', x: 253, z: -32 }
export const marketBay = { name: 'Barleycross Farmers Market', x: 184, z: -35 }
export const oreContracts = [
  { id: 'ballast', ore: 'magnetite-seam', buyer: quay, purpose: 'Dense ballast for the harbor workboats', coins: 18 },
  { id: 'compasses', ore: 'magnetite-seam', buyer: schoolBay, purpose: 'Magnetic specimens for the navigation class', coins: 12 },
  { id: 'lapidary', ore: 'malachite-bloom', buyer: marketBay, purpose: 'Banded stone for the lapidary stall', coins: 14 },
  { id: 'copper-ore', ore: 'malachite-bloom', buyer: quay, purpose: 'Copper ore for the outbound mineral freighter', coins: 18 },
  { id: 'cleavage', ore: 'honey-calcite', buyer: schoolBay, purpose: 'Cleavage samples for the geology class', coins: 12 },
  { id: 'carving', ore: 'honey-calcite', buyer: marketBay, purpose: 'Amber carving blocks for the stoneworkers', coins: 14 },
] as const
type OreContract = typeof oreContracts[number]
export const dispatchBay = { x: 288, z: 156 }
// On the turnaround, clear of the low chute and its timber supports.
export const hopperBay = { x: 282, z: 171.5 }
export const atFreightBay = (point: Point, bay: Point) => distance(point, bay) <= 4

export interface FreightTicket {
  revision: number
  contract: OreContract['id'] | null
  loaded: boolean
  loadedAt: number
}
export interface DriverStatus {
  xp: number
  ticket: FreightTicket
}
export const emptyTicket = (): FreightTicket => ({ revision: 0, contract: null, loaded: false, loadedAt: 0 })
export interface FreightAction extends Point {
  action: 'accept' | 'load' | 'deliver'
  choice: string
  revision: number
}

export function isFreightTicket(ticket: unknown): ticket is FreightTicket {
  if (!ticket || typeof ticket !== 'object') return false
  const v = ticket as Partial<FreightTicket>
  if (typeof v.revision !== 'number' || !Number.isSafeInteger(v.revision) || v.revision < 0 || typeof v.loaded !== 'boolean' ||
    typeof v.loadedAt !== 'number' || !Number.isFinite(v.loadedAt) || v.loadedAt < 0) return false
  const hasContract = oreContracts.some(order => order.id === v.contract)
  return (hasContract || v.contract === null) && (v.loaded ? hasContract : v.loadedAt === 0)
}
