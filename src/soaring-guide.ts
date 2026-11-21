import { aerialProgress, aerialSurveys } from './aviation.ts'
import type { Player, Snapshot } from './protocol.ts'
import { groundHeight } from './terrain.ts'
import { distance, type Point } from './world.ts'
import { liftSites, liftStrength } from './worlds/starter/lift.ts'

// What a pilot on a free flight needs to read at a glance: how high they are, where rising air
// is, and which place still needs surveying. Shared by the HUD and its tests.
export function bearingWord(player: Player, point: Point) {
  const turn = Math.atan2(point.x - player.x, point.z - player.z) - player.heading
  const bearing = Math.atan2(Math.sin(turn), Math.cos(turn))
  return Math.abs(bearing) < 0.2 ? 'ahead' : Math.abs(bearing) > 2.6 ? 'behind' : bearing > 0 ? 'right' : 'left'
}

const near = (player: Player, points: readonly (Point & { name: string })[]) =>
  points.map((point) => ({ point, range: distance(player, point) })).sort((a, b) => a.range - b.range)[0]

// Lift sites working right now, with thermals that are too weak to climb in left out.
export function activeLift(state: Pick<Snapshot, 'weather'>) {
  return liftSites.filter((site) => liftStrength(site, state.weather.hour, state.weather.rain) > 0.25)
}

export function soaringDetail(state: Snapshot, player: Player) {
  const flight = state.aviation.flight
  const height = Math.max(0, Math.round(player.y - groundHeight(player)))
  const lift = flight?.climbing
    ? 'Rising air. Circle to climb.'
    : (() => {
        const closest = near(player, activeLift(state))
        return closest ? `${closest.point.name} ${bearingWord(player, closest.point)} · ${Math.round(closest.range)} m.` : 'No rising air until the sun is back.'
      })()
  const { recorded, total, next } = aerialProgress(state)
  const target = near(player, next.map(({ name, site }) => ({ ...site, name })))
  const survey = target
    ? `Survey ${target.point.name} ${bearingWord(player, target.point)} · ${Math.round(target.range)} m.`
    : 'Every place is surveyed from the air.'
  return `Height ${height} m. ${lift} ${survey} ${recorded.size}/${total} aerial surveys.`
}

export function sightingText(id: string) {
  const name = aerialSurveys.find((survey) => survey.id === id)?.name ?? id
  return `${name} spotted from the air. Land safely to record it for the crew.`
}

export function aerialReceipt(ids: readonly string[], recorded: number) {
  const names = ids.map((id) => aerialSurveys.find((survey) => survey.id === id)?.name ?? id)
  return `Aerial survey recorded: ${names.join(', ')} · ${recorded}/${aerialSurveys.length} for the crew.`
}
