import type { Snapshot } from './protocol.ts'
import { daySeconds } from './weather.ts'

export type LookoutRecovery = 'undisturbed' | 'ash' | 'shoots' | 'established'
export const lookoutRecoverySubject = 'lookout-recovery'

export const recoveryBeds = [
  { x: 3.85, z: 28.75, rx: 1.55, rz: 1.66 },
  { x: 7.23, z: 31.4, rx: 1.26, rz: .65 },
] as const

export function lookoutRecoveryAt({ mission, islandTime, lookoutFireClearedAt }: Pick<Snapshot, 'mission' | 'islandTime' | 'lookoutFireClearedAt'>): LookoutRecovery {
  if (mission !== 'complete') return 'undisturbed'
  if (lookoutFireClearedAt === undefined) return 'established'
  const dawns = Math.floor(islandTime / daySeconds) - Math.floor(lookoutFireClearedAt / daySeconds)
  return dawns < 1 ? 'ash' : dawns < 3 ? 'shoots' : 'established'
}
