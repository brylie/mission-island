import type { Player, Snapshot } from '../src/protocol.ts'
import { seededRandom } from '../src/seeded-random.ts'
import { daySeconds, dryHoursAt, hoursPerDay } from '../src/weather.ts'
import { windAt } from '../src/island-wind.ts'
import { distance } from '../src/world.ts'
import { starterFireSites } from '../src/worlds/starter/layout/fire-sites.ts'
import {
  burningHotspots,
  fireSightRangeM,
  fireSite,
  finderReading,
  sprayTarget,
  wildfireSizes,
  type IslandEvents,
  type Wildfire,
  type WildfireSize,
} from '../src/wildfire.ts'
import type { CrewNotice } from './crew.ts'

// Fires wait at least this long after the last one, then a random share of the window more.
const cooldownDays = 3
const randomWindowDays = 8
// The first fire after the starter shift comes sooner, so a new crew meets one in its first sessions.
const firstFireDays = 1
const firstWindowDays = 2
const retrySeconds = 30
// Fires start in daylight and dry weather, when a lookout could see the smoke.
const ignitionFirstHour = 8
const ignitionLastHour = 17
const ignitionMaxRain = 0.3
// Grass needs a couple of dry hours after a shower before it will catch.
const minimumDryHours = 2
// After a long dry spell the next fire comes early, by up to a day.
const drySpellStartsHours = 12
const earlyDaysPerDryDay = 0.75
const mostEarlyDays = 1
const spotChance = 0.55
const patchChance = 0.33
const minimumPeak = 0.55
const peakRange = 0.45
const firstHeatShare = 0.4
const caughtHeatShare = 0.25
// An unattended fire grows to its peak heat, then catches the next hotspot.
const heatRiseSeconds = 45
const spreadShare = 0.7
const spreadSeconds = 20
// The next hotspot is the one the wind carries embers toward: downwind of a burning one and close by.
const catchRangeM = 5
const distancePenaltyPerM = 0.12
const spreadJitter = 0.25
// Rain slowly douses a fire and stops it spreading.
const dousingRain = 0.35
const rainDouseSeconds = 80
// One crewmate's spray takes a hotspot from full heat to out in this time.
const sprayKnockdownSeconds = 6
const burnoutDays = 1.5
const seedRange = 2147483648
const half = 0.5

export function initialEvents(random: () => number = Math.random): IslandEvents {
  return { seed: Math.floor(random() * seedRange), nextFireAt: null, fire: null, firesOut: 0 }
}

// Each draw advances the saved seed, so a reload continues the same sequence.
function draw(events: IslandEvents) {
  const random = seededRandom(events.seed)
  const value = random()
  events.seed = Math.floor(random() * seedRange)
  return value
}

function chooseSize(roll: number): WildfireSize {
  if (roll < spotChance) return 'spot'
  return roll < spotChance + patchChance ? 'patch' : 'blaze'
}

function scheduleNextFire(events: IslandEvents, islandTime: number) {
  const first = events.firesOut === 0
  const days = first ? firstFireDays + draw(events) * firstWindowDays : cooldownDays + draw(events) * randomWindowDays
  events.nextFireAt = islandTime + days * daySeconds
}

// Pay drops by a coin for each hotspot that caught after the first, so a quick response earns the most.
export function wildfirePay(fire: Wildfire) {
  const spread = fire.hotspots.filter((spot) => spot.caught).length - 1
  return Math.max(1, wildfireSizes[fire.size].coins - spread)
}

export function igniteFire(events: IslandEvents, islandTime: number, choice?: { site?: Wildfire['site'], size?: WildfireSize }): Wildfire {
  const site = choice?.site ? fireSite(choice.site) : starterFireSites[Math.floor(draw(events) * starterFireSites.length)]
  const size = choice?.size ?? chooseSize(draw(events))
  const hotspots = site.hotspots.slice(0, wildfireSizes[size].hotspots).map(([dx, dz], index) => {
    const peak = minimumPeak + draw(events) * peakRange
    return { x: site.x + dx, z: site.z + dz, peak, heat: index ? 0 : peak * firstHeatShare, caught: !index }
  })
  const fire = { id: events.firesOut + 1, site: site.id, size, startedAt: islandTime, located: false, hotspots }
  events.fire = fire
  events.nextFireAt = null
  return fire
}

// How much sooner the scheduled fire comes after a long dry spell.
function dryLeadSeconds(islandTime: number) {
  const dryDays = Math.max(0, dryHoursAt(islandTime) - drySpellStartsHours) / hoursPerDay
  return Math.min(mostEarlyDays, dryDays * earlyDaysPerDryDay) * daySeconds
}

function crewAwake(state: Pick<Snapshot, 'players'>) {
  return state.players.some((player) => player.connected && !player.sleeping)
}

function canIgnite(state: Pick<Snapshot, 'mission' | 'weather' | 'players' | 'islandTime'>) {
  const { hour, rain } = state.weather
  return state.mission === 'complete' && hour >= ignitionFirstHour && hour < ignitionLastHour && rain <= ignitionMaxRain && crewAwake(state)
    && dryHoursAt(state.islandTime) >= minimumDryHours
}

// Picks the unburnt hotspot the wind is most likely to carry the fire to next.
export function downwindHotspot(events: IslandEvents, fire: Wildfire, islandTime: number) {
  const wind = windAt(islandTime)
  const burning = burningHotspots(fire)
  let best: { spot: Wildfire['hotspots'][number], score: number } | undefined
  for (const spot of fire.hotspots.filter((candidate) => !candidate.caught)) {
    for (const source of burning) {
      const gap = distance(spot, source)
      if (gap > catchRangeM) continue
      const along = ((spot.x - source.x) * wind.x + (spot.z - source.z) * wind.z) / gap
      const score = along - gap * distancePenaltyPerM + (draw(events) - half) * spreadJitter
      if (!best || score > best.score) best = { spot, score }
    }
  }
  return best?.spot
}

export function createWildfire(
  state: Snapshot,
  notifyAll: (notice: CrewNotice) => void,
  checkpoint?: () => void,
) {
  function finish(outcome: 'extinguished' | 'burned-out' | 'rained-out') {
    const { events } = state
    const fire = events.fire
    if (!fire) return
    events.fire = null
    events.firesOut = fire.id
    const burned = fire.hotspots.flatMap((spot, index) => spot.caught ? [index] : [])
    events.lastFire = { id: fire.id, site: fire.site, size: fire.size, endedAt: state.islandTime, outcome, burned }
    scheduleNextFire(events, state.islandTime)
    const place = fireSite(fire.site).name
    if (outcome === 'extinguished') {
      const coins = wildfirePay(fire)
      state.crewCoins += coins
      notifyAll({ type: 'wildfire', event: 'out', place, size: fire.size, coins })
    }
    else notifyAll({ type: 'wildfire', event: outcome, place, size: fire.size })
    checkpoint?.()
  }

  function locate(fire: Wildfire, by?: Player) {
    if (fire.located) return
    fire.located = true
    const reading = finderReading(fire)
    notifyAll({ type: 'wildfire', event: 'located', place: reading.place, size: fire.size, degrees: reading.degrees, direction: reading.direction, metres: reading.metres, ...(by && { playerId: by.id }) })
    checkpoint?.()
  }

  function grow(fire: Wildfire, tickSeconds: number) {
    const rain = state.weather.rain
    if (rain > dousingRain) {
      for (const spot of fire.hotspots) spot.heat = Math.max(0, spot.heat - tickSeconds * rain / rainDouseSeconds)
      return
    }
    for (const spot of burningHotspots(fire)) spot.heat = Math.min(spot.peak, spot.heat + tickSeconds / heatRiseSeconds)
    const hot = fire.hotspots.some((spot) => spot.heat >= spot.peak * spreadShare)
    const next = fire.hotspots.some((spot) => !spot.caught)
    // The countdown is saved with the fire, so a reloaded fire spreads on the same schedule.
    fire.spreadElapsed = hot && next ? (fire.spreadElapsed ?? 0) + tickSeconds : 0
    const caught = next && fire.spreadElapsed >= spreadSeconds ? downwindHotspot(state.events, fire, state.islandTime) : undefined
    if (caught) {
      fire.spreadElapsed = 0
      Object.assign(caught, { caught: true, heat: caught.peak * caughtHeatShare })
      notifyAll({ type: 'wildfire', event: 'spread', place: fireSite(fire.site).name, size: fire.size, burning: burningHotspots(fire).length })
    }
  }

  function tick(tickSeconds: number) {
    const { events } = state
    if (state.mission !== 'complete') return
    if (events.nextFireAt === null && !events.fire) scheduleNextFire(events, state.islandTime)
    const fire = events.fire
    if (!fire) {
      // Only a fire within a day of its scheduled time can be pulled forward, so dryness is checked rarely.
      if (events.nextFireAt === null || state.islandTime < events.nextFireAt - mostEarlyDays * daySeconds
        || state.islandTime < events.nextFireAt - dryLeadSeconds(state.islandTime)) return
      if (!canIgnite(state)) {
        events.nextFireAt = state.islandTime + retrySeconds
        return
      }
      const lit = igniteFire(events, state.islandTime)
      notifyAll({ type: 'wildfire', event: 'smoke', place: fireSite(lit.site).name, size: lit.size })
      checkpoint?.()
      return
    }
    // A fire waits while nobody is awake to see it, so a crew that logs off or sleeps does not lose it unseen.
    if (!crewAwake(state)) {
      fire.startedAt += tickSeconds
      return
    }
    grow(fire, tickSeconds)
    if (!burningHotspots(fire).length) {
      finish(state.weather.rain > dousingRain ? 'rained-out' : 'burned-out')
      return
    }
    if (state.islandTime - fire.startedAt > burnoutDays * daySeconds) {
      finish('burned-out')
      return
    }
    const spotter = state.players.find((player) => player.connected && !player.sleeping
      && burningHotspots(fire).some((spot) => distance(spot, player) < fireSightRangeM))
    if (spotter) locate(fire, spotter)
  }

  // A crewmate's spray knocks down the nearest burning hotspot. Returns whether it hit one.
  function spray(player: Player, tickSeconds: number) {
    const fire = state.events.fire
    const target = sprayTarget(fire, player)
    if (!fire || !target) return false
    player.heading = Math.atan2(target.x - player.x, target.z - player.z)
    target.heat = Math.max(0, target.heat - tickSeconds / sprayKnockdownSeconds)
    locate(fire, player)
    if (!burningHotspots(fire).length) finish('extinguished')
    return true
  }

  function sightFireFinder(player: Player) {
    const fire = state.events.fire
    if (!fire) {
      notifyAll({ type: 'wildfire', event: 'clear', playerId: player.id })
      return
    }
    const reading = finderReading(fire)
    if (fire.located) notifyAll({ type: 'wildfire', event: 'bearing', place: reading.place, size: fire.size, degrees: reading.degrees, direction: reading.direction, metres: reading.metres, playerId: player.id })
    else locate(fire, player)
  }

  return { tick, spray, sightFireFinder }
}
