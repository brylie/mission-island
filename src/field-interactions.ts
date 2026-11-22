import { habitatNavigation } from './biome-navigation.ts'
import { outingSubjects, type OutingId } from './journal/outing.ts'
import type { InteractionOption, InteractionPolicies } from './interactions/definition.ts'
import { juniperCenter, juniperLayout } from './juniper-habitat.ts'
import type { Player, Snapshot } from './protocol.ts'
import { juniperTrail } from './routes.ts'
import { propTop } from './scenery.ts'
import { groundHeight } from './terrain.ts'
import { distance, type Point } from './world.ts'
import { driftwoodFoxgloves, driftwoodWrack, shellglassLimpets, shellglassStaff, starterFeatures } from './worlds/starter/sites.ts'

const wrackAimHeight = 0.08
const foxgloveAimHeight = 0.71
const tideStaffAimHeight = 0.65
const limpetAimHeight = 0.10
const cairnAimHeight = 0.38
const cloverAimHeight = 0.13
const inspectionEyeHeight = 1.56
const sightSampleStep = 0.22
const sightEndpointClearance = 0.27
const sceneryProbeRadius = 0.035
const fixedSubjectReach = 2.35
const fixedSubjectAimRadius = 0.42
const juniperOutingReach = 19
const hareShelterRain = 0.65
const hareObservationReach = 11
const hareRecordSlots = 2
const hareAimHeight = 0.31
const hareAimRadius = 0.48

export const fieldActions = {
  'inspect-field': 'feature-recheck',
} as const satisfies InteractionPolicies
export type FieldAction = keyof typeof fieldActions

type FieldInteraction = InteractionOption<FieldAction> & { subject: number, record: OutingId, at: Anchor }
type Anchor = Point & { y: number }

const navigation = habitatNavigation(juniperLayout.patches)
const trailEnd = juniperTrail.points.at(-1)!
const clover = juniperLayout.patches.filter((p) => p.kind === 'clover')
  .map((p) => ({ x: juniperCenter.x + p.x, z: juniperCenter.z + p.z }))
  .sort((a, b) => distance(a, trailEnd) - distance(b, trailEnd))[0]
const cairn = starterFeatures.find((p) => p.site === 'juniper')!

const fixed = [
  { record: 'biome:driftwood-edge', point: driftwoodWrack, height: wrackAimHeight, label: 'Inspect the wrack line' },
  { record: 'sight:foxglove', point: driftwoodFoxgloves[0], height: foxgloveAimHeight, label: 'Record the foxglove' },
  { record: 'place:shellglass', point: shellglassStaff, height: tideStaffAimHeight, label: 'Read the mended tide staff' },
  { record: 'sight:limpet', point: shellglassLimpets[0], height: limpetAimHeight, label: 'Record a limpet' },
  { record: 'place:juniper', point: cairn, height: cairnAimHeight, label: 'Read the trail cairn' },
  { record: 'sight:clover', point: clover, height: cloverAimHeight, label: 'Examine the grazed clover' },
] as const

function visibleFrom(player: Player, target: Anchor, metres: number) {
  const eye = player.y + inspectionEyeHeight
  for (let step = sightSampleStep; step < metres - sightEndpointClearance; step += sightSampleStep) {
    const fraction = step / metres
    const point = { x: player.x + (target.x - player.x) * fraction, z: player.z + (target.z - player.z) * fraction }
    const height = eye + (target.y - eye) * fraction
    if (Math.max(groundHeight(point), propTop(point, sceneryProbeRadius)) > height) return false
  }
  return true
}

type World = Pick<Snapshot, 'farmWork' | 'journal' | 'juniper' | 'weather'>

// An inspection can go out of reach before it is handled. Its choice still names the same subject.
export function fieldSubject(state: Pick<World, 'juniper'>, subject: number): OutingId | undefined {
  if (subject < 0) return undefined
  if (subject < fixed.length) return fixed[subject]?.record
  const slot = subject - fixed.length
  if (Math.floor(slot / hareRecordSlots) >= state.juniper.hares.length) return undefined
  return slot % hareRecordSlots ? 'sight:hare/sheltering' : 'sight:hare/grazing'
}

export function fieldInteractions(state: World, player: Player): FieldInteraction[] {
  if (!player.grounded || player.onBed || player.truckSurface || player.seat || player.sleeping || player.swimming
    || state.farmWork.barrow?.handler === player.id) return []
  const options: { interaction: FieldInteraction, metres: number, recorded: boolean }[] = []
  function offer(subject: number, record: OutingId, at: Anchor, metres: number, label: string, radius: number) {
    if (!visibleFrom(player, at, metres)) return
    options.push({
      interaction: { action: 'inspect-field', subject, record, at, label, radius, key: 'E', name: outingSubjects[record].name },
      metres,
      recorded: Boolean(state.journal.entries[record]?.outing),
    })
  }
  for (const [subject, { record, point, height, label }] of fixed.entries()) {
    const metres = distance(player, point)
    if (metres <= fixedSubjectReach) offer(subject, record, { ...point, y: groundHeight(point) + height }, metres, label, fixedSubjectAimRadius)
  }
  if (distance(player, juniperCenter) < juniperOutingReach) {
    for (const [index, hare] of state.juniper.hares.entries()) {
      const grazing = hare.behavior === 'grazing'
      const sheltering = hare.behavior === 'sheltering' && state.weather.rain >= hareShelterRain
      if (!grazing && !sheltering) continue
      const point = { x: juniperCenter.x + hare.x, z: juniperCenter.z + hare.z }
      const metres = distance(player, point)
      if (metres > hareObservationReach) continue
      // A stale grazing selection cannot turn into a sheltering record for the same hare.
      offer(fixed.length + index * hareRecordSlots + Number(sheltering), grazing ? 'sight:hare/grazing' : 'sight:hare/sheltering', { ...point, y: groundHeight(point) + navigation.lift(hare) + hareAimHeight }, metres, grazing ? 'Record a grazing hare' : 'Record a sheltering hare', hareAimRadius)
    }
  }
  return options.sort((a, b) => Number(a.recorded) - Number(b.recorded) || a.metres - b.metres).map(({ interaction }) => interaction)
}
