import { brinewickMarketRack, brinewickMarketTable } from '../assets/geometry/brinewick-market.ts'
import type { Weather } from '../protocol.ts'
import { brinewickMarketPlacements } from '../worlds/saltwind/layout/sites.ts'

export const brinewickMarketSubject = 'brinewick-market-routine'
export const brinewickMarketStops = {
  worktable: { ...brinewickMarketPlacements.worktable, ...brinewickMarketTable.footprint },
  outdoorRack: { ...brinewickMarketPlacements.outdoorRack, ...brinewickMarketRack.footprint },
  shelteredRack: { ...brinewickMarketPlacements.shelteredRack, ...brinewickMarketRack.footprint },
} as const

const setupHour = 5.5
export const tradingHour = 11.5
export const closingHour = 17
const shelterRainThreshold = 0.32
const coverSettlingHours = 0.22
const coverEasingPower = 2

export function brinewickMarketAt({ hour, rain }: Weather) {
  if (hour >= setupHour && hour < tradingHour) {
    return { phase: 'setup', net: rain >= shelterRainThreshold ? 'shelteredRack' : 'outdoorRack', cover: 0 } as const
  }
  if (hour >= tradingHour && hour < closingHour) return { phase: 'trading', net: null, cover: 0 } as const
  const settling = hour < closingHour ? 1 : Math.min(1, (hour - closingHour) / coverSettlingHours)
  return { phase: 'closing', net: null, cover: 1 - (1 - settling) ** coverEasingPower } as const
}
