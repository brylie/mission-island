import type { Snapshot } from './protocol.ts'
import { dawnsBetween } from './weather.ts'

export type LookoutRecovery = 'undisturbed' | 'ash' | 'shoots' | 'established'
export const lookoutRecoverySubject = 'lookout-recovery'

export { lookoutRecoveryBeds as recoveryBeds } from './worlds/starter/layout/scenery.ts'

const establishedAfterDawns = 3

export function lookoutRecoveryAt({ mission, islandTime, lookoutFireClearedAt }: Pick<Snapshot, 'mission' | 'islandTime' | 'lookoutFireClearedAt'>): LookoutRecovery {
  if (mission !== 'complete') return 'undisturbed'
  if (lookoutFireClearedAt === undefined) return 'established'
  return recoveryStage(lookoutFireClearedAt, islandTime)
}

// Burnt ground stays ash until the first dawn, sprouts, then fills in after the third.
export function recoveryStage(clearedAt: number, islandTime: number): Exclude<LookoutRecovery, 'undisturbed'> {
  const dawns = dawnsBetween(clearedAt, islandTime)
  return dawns < 1 ? 'ash' : dawns < establishedAfterDawns ? 'shoots' : 'established'
}
