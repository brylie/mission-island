const chargeOscillationPeriod = 2

export type ChargeKind = 'throw' | 'cast'

export const throwSeconds = 1.05
export const castPeakSeconds = 0.88
export const castTravelSeconds = 0.42
export const biteSeconds = 3.1

export function chargePower(kind: ChargeKind, elapsed: number) {
  if (kind === 'throw') return Math.min(1, Math.max(0, elapsed / throwSeconds))
  const phase = (Math.max(0, elapsed) / castPeakSeconds) % chargeOscillationPeriod
  return 1 - Math.abs(1 - phase)
}
