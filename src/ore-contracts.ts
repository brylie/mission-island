import type { HaulStep } from './simulation/ore-truck.ts'
import { distance, type Point, type Pose } from './world.ts'
import { oreFreightBays } from './worlds/saltwind/layout/sites.ts'

export const crateDriverXp = 10
export const haulerUnlockXp = 100
export const oreNames = { 'magnetite-seam': 'Magnetite', 'malachite-bloom': 'Malachite', 'honey-calcite': 'Honey calcite' } as const
export type Ore = keyof typeof oreNames

const quayFreightCoins = 18
const schoolFreightCoins = 12
const marketFreightCoins = 14
const freightBayReach = 4
const half = 0.5
const parkedHeading = Math.PI * half

const { quay, school: schoolBay, market: marketBay, dispatch: dispatchBay, hopper: hopperBay } = oreFreightBays
export { schoolBay, marketBay, dispatchBay, hopperBay }
export const oreContracts = [
  { id: 'ballast', ore: 'magnetite-seam', buyer: quay, purpose: 'Dense ballast for the harbor workboats', coins: quayFreightCoins },
  { id: 'compasses', ore: 'magnetite-seam', buyer: schoolBay, purpose: 'Magnetic specimens for the navigation class', coins: schoolFreightCoins },
  { id: 'lapidary', ore: 'malachite-bloom', buyer: marketBay, purpose: 'Banded stone for the lapidary stall', coins: marketFreightCoins },
  { id: 'copper-ore', ore: 'malachite-bloom', buyer: quay, purpose: 'Copper ore for the outbound mineral freighter', coins: quayFreightCoins },
  { id: 'cleavage', ore: 'honey-calcite', buyer: schoolBay, purpose: 'Cleavage samples for the geology class', coins: schoolFreightCoins },
  { id: 'carving', ore: 'honey-calcite', buyer: marketBay, purpose: 'Amber carving blocks for the stoneworkers', coins: marketFreightCoins },
] as const
type OreContract = typeof oreContracts[number]
export const atFreightBay = (point: Point, bay: Point) => distance(point, bay) <= freightBayReach

export interface FreightTicket {
  revision: number
  contract: OreContract['id'] | null
  loaded: boolean
  loadedAt: number
  truck?: Pose
}
export interface DriverStatus {
  boarded: boolean
  xp: number
  ticket: FreightTicket
}
export const emptyTicket = (): FreightTicket => ({ revision: 0, contract: null, loaded: false, loadedAt: 0 })
export type FreightOrder = { action: 'accept' | 'load', choice: string } | { action: 'deliver' }
export type FreightCommand = FreightOrder
  | { action: 'board' } | { action: 'leave' }
  | { action: 'drive', steps: HaulStep[] }
export type FreightAction = FreightCommand & { revision: number }

export function parkedHauler(ticket: FreightTicket) {
  return ticket.truck ?? { ...(ticket.loaded ? hopperBay : dispatchBay), heading: parkedHeading }
}

export function isFreightTicket(ticket: unknown): ticket is FreightTicket {
  if (!ticket || typeof ticket !== 'object') return false
  const v = ticket as Partial<FreightTicket>
  if (typeof v.revision !== 'number' || !Number.isSafeInteger(v.revision) || v.revision < 0 || typeof v.loaded !== 'boolean'
    || typeof v.loadedAt !== 'number' || !Number.isFinite(v.loadedAt) || v.loadedAt < 0) return false
  if (v.truck !== undefined && (!v.truck || ![v.truck.x, v.truck.z, v.truck.heading].every(Number.isFinite))) return false
  const hasContract = oreContracts.some((order) => order.id === v.contract)
  return (hasContract || v.contract === null) && (v.loaded ? hasContract : v.loadedAt === 0)
}
