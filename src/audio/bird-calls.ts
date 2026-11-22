import { birdLife } from '../assets/audio/birds.ts'
import { gullAt } from '../gull-flight.ts'
import { fullTurnRadians } from '../math/angles.ts'
import { starterGullPerches } from '../gull-sites.ts'
import { gullsPerLift, thermalGullAt } from '../gull-thermals.ts'
import type { Weather } from '../protocol.ts'
import { northernRegions } from '../scenery.ts'
import { seededRandom } from '../seeded-random.ts'
import { groundHeight } from '../terrain.ts'
import { forest, type Point } from '../world.ts'
import { liftSites } from '../worlds/starter/lift.ts'
import type { AudioEngine, Point3 } from './engine.ts'
import { birdCue, type BirdCall } from './bird-recipes.ts'
import { half } from './recipe-kit.ts'

// Emitter families keep their call decisions apart.
const harborFamily = 1
const thermalFamily = 2
const songFamily = 3
const hashPrime = 2_654_435_761
const mixPrime = 40_503

// The same chance for the same bird and moment in every browser, so both crewmates hear the same call.
function chance(family: number, bird: number, slot: number) {
  const hash = Math.imul(Math.imul(family, hashPrime) ^ Math.imul(bird + 1, mixPrime), hashPrime) ^ Math.imul(slot, mixPrime)
  return seededRandom((hash >>> 0) || 1)()
}

type WeatherAt = (time: number) => Weather

const within = (listener: Point, point: Point, reach: number) => Math.hypot(point.x - listener.x, point.z - listener.z) < reach

// Woodland singers: a couple of fixed perches in each wooded region and the starter forest.
const woodedSpots = [
  ...northernRegions.filter((region) => region.trees).map((region) => ({ at: region.at, spread: region.spread })),
  { at: forest, spread: birdLife.song.earshotMetres * half },
]
const singers = woodedSpots.flatMap(({ at, spread }, spot) => Array.from({ length: birdLife.song.singersPerRegion }, (_, k) => {
  const random = seededRandom(spot * birdLife.song.singersPerRegion + k + 1)
  const angle = random() * fullTurnRadians
  const radius = random() * spread * birdLife.song.spreadShare
  const point = { x: at.x + Math.cos(angle) * radius, z: at.z + Math.sin(angle) * radius }
  return { ...point, y: groundHeight(point) + birdLife.song.perchHeightMetres }
}))

const singing = ({ hour, rain }: Weather) => hour >= birdLife.song.firstHour && hour <= birdLife.song.lastHour && rain <= birdLife.song.maxRain

// Gulls call from where they fly; songbirds from their perches. Every emitter makes at most one call decision
// per time slot, so a long frame or a jump in the island clock never brings a burst of calls.
export function createBirdCalls(engine: AudioEngine) {
  const phases = new Map<number, string>()
  const slots = new Map<string, number>()
  let calls = 0

  function call(kind: BirdCall, at: Point3, level: number) {
    engine.play(birdCue({ call: kind }, ++calls % birdLife.variants), { bus: 'ambience', position: at, gain: level })
  }

  // True once when an emitter enters a new slot and the seeded chance favors a call.
  function slotCall(key: string, family: number, bird: number, time: number, slotSeconds: number, odds: number) {
    const slot = Math.floor(time / slotSeconds)
    if (slots.get(key) === slot) return false
    slots.set(key, slot)
    return chance(family, bird, slot) < odds
  }

  function harbor(listener: Point, time: number, weather: Weather, weatherAt?: WeatherAt) {
    const life = birdLife.harbor
    starterGullPerches.forEach((perch, index) => {
      if (!within(listener, perch, life.earshotMetres)) {
        phases.delete(index)
        return
      }
      const pose = gullAt(time, index, perch, weather, weatherAt)
      const previous = phases.get(index)
      phases.set(index, pose.phase)
      const cycle = Math.floor(time)
      if (previous && previous !== pose.phase && pose.phase === 'Push-off') {
        call('flap', pose, life.flapLevel)
        if (chance(harborFamily, index, cycle) < life.takeoffCallChance) call('kek', pose, life.level)
      }
      if (previous && previous !== pose.phase && pose.phase === 'Flare' && chance(harborFamily, index, cycle) < life.landingCallChance) call('kek', pose, life.level)
      if (pose.phase === 'Resting' && slotCall(`harbor-${index}`, harborFamily, index, time, life.restingCallSlotSeconds, life.restingCallChance)) call('kek', pose, life.level)
    })
  }

  function thermals(listener: Point, time: number, weather: Weather, weatherAt?: WeatherAt) {
    const life = birdLife.thermal
    liftSites.forEach((site, siteIndex) => {
      if (!within(listener, site, life.earshotMetres)) return
      for (let index = 0; index < gullsPerLift; index++) {
        const bird = siteIndex * gullsPerLift + index
        const pose = thermalGullAt(time, siteIndex, site, index, weather, weatherAt)
        if (pose && slotCall(`thermal-${bird}`, thermalFamily, bird, time, life.callSlotSeconds, life.callChance)) call('mew', pose, life.level)
      }
    })
  }

  function songbirds(listener: Point, time: number, weather: Weather) {
    const life = birdLife.song
    if (!singing(weather)) return
    singers.forEach((singer, index) => {
      if (within(listener, singer, life.earshotMetres) && slotCall(`song-${index}`, songFamily, index, time, life.slotSeconds, life.chance)) call('song', singer, life.level)
    })
  }

  return {
    // weatherAt is given only for live weather, so a fixed review weather is not overridden by the island clock.
    frame(listener: Point, time: number, weather: Weather, weatherAt?: WeatherAt) {
      if (engine.state() !== 'running') return
      harbor(listener, time, weather, weatherAt)
      thermals(listener, time, weather, weatherAt)
      songbirds(listener, time, weather)
    },
  }
}
