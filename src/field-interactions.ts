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

export const fieldActions = {
  'inspect-field': 'feature-recheck',
} as const satisfies InteractionPolicies
export type FieldAction = keyof typeof fieldActions

type FieldInteraction = InteractionOption<FieldAction> & { subject: number; record: OutingId; at: Anchor }
type Anchor = Point & { y: number }

const navigation = habitatNavigation(juniperLayout.patches)
const trailEnd = juniperTrail.points.at(-1)!
const clover = juniperLayout.patches.filter(p => p.kind === 'clover')
  .map(p => ({ x: juniperCenter.x + p.x, z: juniperCenter.z + p.z }))
  .sort((a, b) => distance(a, trailEnd) - distance(b, trailEnd))[0]
const cairn = starterFeatures.find(p => p.site === 'juniper')!

const fixed = [
  { record: 'biome:driftwood-edge', point: driftwoodWrack, height: .08, label: 'Inspect the wrack line' },
  { record: 'sight:foxglove', point: driftwoodFoxgloves[0], height: .71, label: 'Record the foxglove' },
  { record: 'place:shellglass', point: shellglassStaff, height: .65, label: 'Read the mended tide staff' },
  { record: 'sight:limpet', point: shellglassLimpets[0], height: .10, label: 'Record a limpet' },
  { record: 'place:juniper', point: cairn, height: .38, label: 'Read the trail cairn' },
  { record: 'sight:clover', point: clover, height: .13, label: 'Examine the grazed clover' },
] as const

function visibleFrom(player: Player, target: Anchor, metres: number) {
  const eye = player.y + 1.56
  for (let step = .22; step < metres - .27; step += .22) {
    const fraction = step / metres
    const point = { x: player.x + (target.x - player.x) * fraction, z: player.z + (target.z - player.z) * fraction }
    const height = eye + (target.y - eye) * fraction
    if (Math.max(groundHeight(point), propTop(point, .035)) > height) return false
  }
  return true
}

type World = Pick<Snapshot, 'farmWork' | 'journal' | 'juniper' | 'weather'>

export function fieldInteractions(state: World, player: Player): FieldInteraction[] {
  if (!player.grounded || player.onBed || player.truckSurface || player.seat || player.sleeping || player.swimming ||
    state.farmWork.barrow?.handler === player.id) return []
  const options: { interaction: FieldInteraction; metres: number; recorded: boolean }[] = []
  function offer(subject: number, record: OutingId, at: Anchor, metres: number, label: string, radius: number) {
    if (!visibleFrom(player, at, metres)) return
    options.push({
      interaction: { action: 'inspect-field', subject, record, at, label, radius, key: 'E', name: outingSubjects[record].name },
      metres, recorded: Boolean(state.journal.entries[record]?.outing),
    })
  }
  for (const [subject, { record, point, height, label }] of fixed.entries()) {
    const metres = distance(player, point)
    if (metres <= 2.35) offer(subject, record, { ...point, y: groundHeight(point) + height }, metres, label, .42)
  }
  if (distance(player, juniperCenter) < 19) {
    for (const [index, hare] of state.juniper.hares.entries()) {
      const grazing = hare.behavior === 'grazing'
      const sheltering = hare.behavior === 'sheltering' && state.weather.rain >= .65
      if (!grazing && !sheltering) continue
      const point = { x: juniperCenter.x + hare.x, z: juniperCenter.z + hare.z }
      const metres = distance(player, point)
      if (metres > 11) continue
      // A stale grazing selection cannot turn into a sheltering record for the same hare.
      offer(fixed.length + index * 2 + Number(sheltering), grazing ? 'sight:hare/grazing' : 'sight:hare/sheltering',
        { ...point, y: groundHeight(point) + navigation.lift(hare) + .31 }, metres,
        grazing ? 'Record a grazing hare' : 'Record a sheltering hare', .48)
    }
  }
  return options.sort((a, b) => Number(a.recorded) - Number(b.recorded) || a.metres - b.metres).map(({ interaction }) => interaction)
}
