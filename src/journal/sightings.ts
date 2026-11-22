import { gullAt } from '../gull-flight.ts'
import { starterGullPerches } from '../gull-sites.ts'
import type { InteractionOption, InteractionPolicies } from '../interactions/definition.ts'
import { juniperCenter, juniperLayout } from '../juniper-habitat.ts'
import type { Player, Snapshot } from '../protocol.ts'
import { walkingHeight, waterLevel } from '../terrain.ts'
import { weatherAt } from '../weather.ts'
import { distance, ferryTerminal, lookout, type Point } from '../world.ts'
import { mirrorPoolWillow } from '../worlds/starter/sites.ts'
import { behaviorId, journalSubjects, type SubjectId } from './catalog.ts'

const schoolAimRadiusM = 1.3
const hollowAnimalAimHeightM = 0.3
const hollowAnimalAimRadiusM = 0.7
const gullAimHeightM = 0.15
const gullAimRadiusM = 0.7
const willowAimHeightM = 0.5
const willowAimRadiusM = 1.6
const cloverAimHeightM = 0.1
const cloverAimRadiusM = 0.55
const lookoutAimHeightM = 2.4
const lookoutAimRadiusM = 2.6
const ferryAimHeightM = 1.2
const ferryAimRadiusM = 3

export const sightingActions = {
  record: 'explicit',
} as const satisfies InteractionPolicies
export type SightingAction = keyof typeof sightingActions

type World = Pick<Snapshot, 'driftwood' | 'juniper' | 'islandTime' | 'weather' | 'journal'>
// Where one animal, plant or landmark is right now, and what it is visibly doing.
interface Instance { at: Point & { y: number }, radius: number, behavior?: string }

// How far a walker can be from something and still record it. Closer than `besideRange`, no aim is needed.
export const sightingRange = 14
export const besideRange = 3
const instanceSlots = 16

const raised = (point: Point, height: number) => ({ x: point.x, y: walkingHeight(point) + height, z: point.z })
const inHollow = (point: Point) => ({ x: juniperCenter.x + point.x, z: juniperCenter.z + point.z })
const cloverPatches = juniperLayout.patches.filter(({ kind }) => kind === 'clover').map(inHollow)
const gullBehavior: Partial<Record<ReturnType<typeof gullAt>['phase'], string>> = { Resting: 'resting', Settling: 'resting', Glide: 'gliding' }

function instances(state: World, subject: SubjectId): Instance[] {
  switch (subject) {
    case 'sight:school': {
      // Aim at the leader, or at the middle of the school while nobody leads.
      const { fish, leader } = state.driftwood
      if (!fish.length) return []
      const middle = { x: fish.reduce((sum, one) => sum + one.x, 0) / fish.length, z: fish.reduce((sum, one) => sum + one.z, 0) / fish.length }
      const { x, z } = fish[leader] ?? middle
      return [{ at: { x, y: waterLevel, z }, radius: schoolAimRadiusM, behavior: fish.some((one) => one.startled) ? 'regrouping' : undefined }]
    }
    case 'sight:hare':
    case 'sight:fox':
      return state.juniper[subject === 'sight:hare' ? 'hares' : 'foxes']
        .map((animal) => ({ at: raised(inHollow(animal), hollowAnimalAimHeightM), radius: hollowAnimalAimRadiusM, behavior: animal.behavior }))
    case 'sight:gull':
      return starterGullPerches.map((perch, index) => {
        const { x, y, z, phase } = gullAt(state.islandTime, index, perch, state.weather, weatherAt)
        return { at: { x, y: y + gullAimHeightM, z }, radius: gullAimRadiusM, behavior: gullBehavior[phase] }
      })
    case 'sight:willow': return [{ at: raised(mirrorPoolWillow, willowAimHeightM), radius: willowAimRadiusM }]
    case 'sight:clover': return cloverPatches.map((patch) => ({ at: raised(patch, cloverAimHeightM), radius: cloverAimRadiusM }))
    case 'sight:lookout': return [{ at: raised(lookout, lookoutAimHeightM), radius: lookoutAimRadiusM }]
    case 'sight:ferry': return [{ at: raised(ferryTerminal, ferryAimHeightM), radius: ferryAimRadiusM }]
  }
}

// The entries one instance would add: the subject on its first record, and whatever listed behavior it shows.
function newEntries(state: World, kind: number, instance: Instance) {
  const subject = journalSubjects[kind]
  const ids: string[] = state.journal.entries[subject.id] ? [] : [subject.id]
  const behaviors: Record<string, string> = subject.behaviors
  const behavior = instance.behavior && behaviors[instance.behavior] ? behaviorId(subject.id, instance.behavior) : undefined
  if (behavior && !state.journal.entries[behavior]) ids.push(behavior)
  return ids
}

// What the host writes when a player records the subject an interaction names. Empty once it is out of range or already noted.
export function sightingEntries(state: World, player: Point, choice: number) {
  const kind = Math.floor(choice / instanceSlots)
  const subject = journalSubjects[kind]
  const instance = subject && instances(state, subject.id)[choice % instanceSlots]
  if (!instance || distance(player, instance.at) > sightingRange) return { ids: [], at: undefined }
  return { ids: newEntries(state, kind, instance), at: instance.at }
}

// "Record in journal" for everything in range that would add a line. The reticle picks one by aiming at it.
export function journalInteractions(state: World, player: Player): InteractionOption<SightingAction>[] {
  const options: InteractionOption<SightingAction>[] = []
  for (const [kind, subject] of journalSubjects.entries()) {
    for (const [slot, instance] of instances(state, subject.id).entries()) {
      if (slot >= instanceSlots || distance(player, instance.at) > sightingRange) continue
      const ids = newEntries(state, kind, instance)
      if (!ids.length) continue
      const behaviors: Record<string, string> = subject.behaviors
      const doing = instance.behavior ? behaviors[instance.behavior] : undefined
      options.push({
        action: 'record',
        subject: kind * instanceSlots + slot,
        key: 'E',
        at: instance.at,
        radius: instance.radius,
        name: doing ? `${subject.name} · ${doing.toLowerCase()}` : subject.name,
        label: ids[0] === subject.id ? 'Record in journal' : 'Add this behavior to the journal',
      })
    }
  }
  return options
}
