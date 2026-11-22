import type { Snapshot } from './protocol.ts'
import { dawnsBetween } from './weather.ts'

export type LookoutRecovery = 'undisturbed' | 'ash' | 'shoots' | 'established'
export const lookoutRecoverySubject = 'lookout-recovery'

export { lookoutRecoveryBeds as recoveryBeds } from './worlds/starter/layout/scenery.ts'

const establishedAfterDawns = 3

export function lookoutRecoveryAt({ mission, islandTime, lookoutFireClearedAt }: Pick<Snapshot, 'mission' | 'islandTime' | 'lookoutFireClearedAt'>): LookoutRecovery {
  if (mission !== 'complete') return 'undisturbed'
  if (lookoutFireClearedAt === undefined) return 'established'
  const dawns = dawnsBetween(lookoutFireClearedAt, islandTime)
  return dawns < 1 ? 'ash' : dawns < establishedAfterDawns ? 'shoots' : 'established'
}
