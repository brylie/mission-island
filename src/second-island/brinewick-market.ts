import type { Weather } from '../protocol.ts'

export const brinewickMarketSubject = 'brinewick-market-routine'
export const brinewickMarketStops = {
  worktable: { id: 'fish-market-worktable', x: -243.38, z: -124.75, width: 3.4, depth: 1.02 },
  outdoorRack: { id: 'fish-market-outdoor-net-rack', x: -252.2, z: -122.2, width: 3.46, depth: .76 },
  shelteredRack: { id: 'fish-market-sheltered-net-rack', x: -250.58, z: -125.32, width: 3.46, depth: .76 },
} as const

export const tradingHour = 11.5
export const closingHour = 17

export function brinewickMarketAt({ hour, rain }: Weather) {
  if (hour >= 5.5 && hour < tradingHour) {
    return { phase: 'setup', net: rain >= .32 ? 'shelteredRack' : 'outdoorRack', cover: 0 } as const
  }
  if (hour >= tradingHour && hour < closingHour) return { phase: 'trading', net: null, cover: 0 } as const
  const settling = hour < closingHour ? 1 : Math.min(1, (hour - closingHour) / .22)
  return { phase: 'closing', net: null, cover: 1 - (1 - settling) ** 2 } as const
}
