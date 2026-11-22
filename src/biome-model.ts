import { biomeRockSize, habitatNavigation } from './biome-navigation.ts'
import { seededRandom } from './seeded-random.ts'
import { daylight, isNight } from './weather.ts'
import { codex, type BiomeRecipe } from './biome-recipe.ts'

import type { Point } from './world.ts'
type Kind = typeof codex[number]['key']
interface Patch extends Point { kind: Exclude<Kind, 'hares' | 'foxes'>, angle: number, stock: number }
type Behavior = 'wandering' | 'seeking' | 'grazing' | 'fleeing' | 'sheltering' | 'patrolling' | 'chasing' | 'watching'
interface Animal extends Point { heading: number, behavior: Behavior, waypoint: Point, rest: number }
const stepSeconds = 0.1
const radius = 7.2
const fullTurn = Math.PI + Math.PI
const midpoint = 0.5
const minimumTravelM = 0.02
const patchStreamStride = 77417

const defaultCloverBite = 0.035
const decisionSeedOffset = 91017
const grassShelterOffsetM = 0.28
const rockShelterRadiusRatio = 0.55
const rockShelterClearanceM = 0.34
const solidShelterOffsetM = 0.85
const escapeDirections = 16
const escapeDirectionsPerHalfTurn = escapeDirections * midpoint
const sameGoalEpsilonM = 0.015
const reachedDetourEpsilonM = 0.025
const edgeTurnRad = 1.85
const visitorRecoveryS = 0.8
const reachedWaypointM = 0.2

const shelteredThreatRadiusM = 4.8
const exposedThreatRadiusM = 3.6
const heavyRainPercent = 65
const shelterArrivalM = 0.23
const shelterHoldS = 2
const hareSprintMps = 2.7
const rainShelterSpeedMps = 1.2
const hareEscapeLookAheadM = 2
const edgeInwardRatio = 0.8
const hareEmergenceRestS = 0.5
const minimumForageStock = 0.15
const hareWanderMps = 0.65
const feedingReachM = 0.46
const hareForageWalkMps = 1.25
const depletedForageRestS = 2

const foxEdgeMarginM = 0.65
const foxRetreatCorridorM = 4.85
const routeClearanceEpsilonM = 0.001
const minimumRetreatGainM = 0.12
const longRetreatM = 2.8
const mediumRetreatM = 1.35
const shortRetreatM = 0.6
const retreatAttempts = [longRetreatM, mediumRetreatM, shortRetreatM] as const
const foxRetreatMps = 3.5
const patrolAttemptLimit = 16
const foxPatrolMps = 0.9
const foxVisitorReleaseM = 5.7
const foxVisitorAlertM = 4.6
const foxNightSightM = 6.2
const foxDaySightM = 4.5
const huntRecoveryS = 2
const foxChaseMps = 2.9
const encounterReachM = 0.55
const postEncounterRestS = 5

const tickRoundingEpsilon = 1e-8
const forageRegrowthPerTick = 0.001
const minimumForageLight = 0.2
const percentFull = 100
const hareVisitorAlertM = 3.8
const hareRetreatMps = 3.2

function randomPoint(random: () => number) {
  const angle = random() * fullTurn, r = Math.sqrt(random()) * radius
  return { x: Math.cos(angle) * r, z: Math.sin(angle) * r }
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.z - b.z)
}
function nearest<T extends Point>(origin: Point, choices: T[], range = Infinity) {
  let best: T | undefined
  let nearestDistance = range
  for (const choice of choices) {
    const d = distance(origin, choice)
    if (d < nearestDistance) {
      nearestDistance = d
      best = choice
    }
  }
  return best
}

function moveDirect(animal: Animal, target: Point, speed: number) {
  const dx = target.x - animal.x, dz = target.z - animal.z, d = Math.hypot(dx, dz)
  if (d < minimumTravelM) return
  animal.heading = Math.atan2(dx, dz)
  const fraction = Math.min(1, speed * stepSeconds / d)
  animal.x += dx * fraction
  animal.z += dz * fraction
}

export function populate(recipe: BiomeRecipe) {
  const patches: Patch[] = [], hares: Animal[] = [], foxes: Animal[] = []
  for (const [index, { key }] of codex.entries()) {
    // Independent streams keep all other placements stable when changing a count.
    const random = seededRandom(recipe.seed + (index + 1) * patchStreamStride)
    for (let i = 0; i < recipe[key]; i++) {
      const p = randomPoint(random), angle = random() * fullTurn
      if (key === 'hares' || key === 'foxes') {
        const herd = key === 'hares' ? hares : foxes
        herd.push({ ...p, heading: angle, behavior: key === 'hares' ? 'wandering' : 'patrolling', waypoint: randomPoint(random), rest: 0 })
      }
      else patches.push({ ...p, kind: key, angle, stock: 1 })
    }
  }
  return { patches, hares, foxes }
}

interface Conditions { hour: number, rain: number }

export function createBiome(recipe: BiomeRecipe, layout = populate(recipe), clover = { bite: defaultCloverBite, regrowth: 1 }) {
  const navigation = habitatNavigation(layout.patches)
  let state = structuredClone(layout), tick = 0, escapes = 0, grazed = 0, encounters = 0
  let random = seededRandom(recipe.seed + decisionSeedOffset)
  const detours = new WeakMap<Animal, { goal: Point, next?: Point }>()
  // A grazing or hiding spot can overlap a trunk in an edited recipe. Pick a clear
  // spot beside it once, so an animal can reach and settle at its destination.
  function beside(p: Patch) {
    const radius = p.kind === 'grass' ? grassShelterOffsetM : p.kind === 'stones' ? biomeRockSize(p.angle) * rockShelterRadiusRatio + rockShelterClearanceM : solidShelterOffsetM
    for (let i = 0; i < escapeDirections; i++) {
      const angle = p.angle + i * Math.PI / escapeDirectionsPerHalfTurn
      const spot = { x: p.x + radius * Math.sin(angle), z: p.z + radius * Math.cos(angle) }
      if (navigation.open(spot) && navigation.lift(spot) === 0) return spot
    }
  }
  const goals = layout.patches.map((p) => p.kind === 'clover' && navigation.open(p) && navigation.lift(p) === 0 ? p : beside(p))
  const shelters = layout.patches.flatMap((p, i) => p.kind !== 'clover' && goals[i] ? [{ ...goals[i], kind: p.kind }] : [])
  const dryShelters = shelters.filter((p) => p.kind === 'trees' || p.kind === 'logs')
  function route(animal: Animal, target: Point) {
    if (navigation.clear(animal, target)) return target
    const cached = detours.get(animal)
    if (cached && distance(target, cached.goal) < sameGoalEpsilonM && (!cached.next
      || (distance(animal, cached.next) > reachedDetourEpsilonM && navigation.clear(animal, cached.next)))) return cached.next
    const next = navigation.waypoint(animal, target)
    detours.set(animal, { goal: { x: target.x, z: target.z }, next })
    return next
  }
  function move(animal: Animal, target: Point, speed: number) {
    const next = route(animal, target)
    if (next) moveDirect(animal, next, speed)
  }
  function avoidVisitor(animal: Animal, visitors: Point[], range: number, speed: number) {
    const visitor = nearest(animal, visitors, range)
    if (!visitor) return false
    let heading = Math.atan2(animal.x - visitor.x, animal.z - visitor.z)
    // At the edge, turn along the clearing until there is room to retreat.
    const ahead = { x: animal.x + Math.sin(heading), z: animal.z + Math.cos(heading) }
    if (Math.hypot(ahead.x, ahead.z) > radius) {
      const side = Math.sin(heading) * animal.z - Math.cos(heading) * animal.x >= 0 ? 1 : -1
      heading = Math.atan2(animal.x, animal.z) + side * edgeTurnRad
    }
    animal.behavior = 'fleeing'
    animal.rest = visitorRecoveryS
    move(animal, { x: animal.x + Math.sin(heading), z: animal.z + Math.cos(heading) }, speed)
    return true
  }
  const wander = (a: Animal, speed: number) => {
    if (distance(a, a.waypoint) < reachedWaypointM) a.waypoint = randomPoint(random)
    move(a, a.waypoint, speed)
  }
  function updateHare(hare: Animal, food: { x: number, z: number, patch: Patch }[], rain: number) {
    const hid = hare.behavior === 'sheltering', fleeing = hare.behavior === 'fleeing'
    if (hid && hare.rest > 0) {
      hare.rest -= stepSeconds
      return
    }
    const threat = nearest(hare, state.foxes.filter((f) => f.rest <= 0), hid ? shelteredThreatRadiusM : exposedThreatRadiusM)
    if (threat || rain >= heavyRainPercent) {
      const target = nearest(hare, threat ? shelters : dryShelters)
      if (target) {
        hare.behavior = distance(hare, target) < shelterArrivalM ? 'sheltering' : 'fleeing'
        if (hare.behavior === 'sheltering' && !hid) {
          hare.rest = shelterHoldS
          if (fleeing && threat) escapes++
        }
        if (hare.behavior === 'fleeing') move(hare, target, threat ? hareSprintMps : rainShelterSpeedMps)
        return
      }
      if (threat) {
        hare.behavior = 'fleeing'
        const angle = Math.atan2(hare.z - threat.z, hare.x - threat.x)
        const target = { x: hare.x + hareEscapeLookAheadM * Math.cos(angle), z: hare.z + hareEscapeLookAheadM * Math.sin(angle) }
        if (Math.hypot(target.x, target.z) > radius) {
          target.x = hare.x * edgeInwardRatio - Math.sin(angle) * hareEscapeLookAheadM
          target.z = hare.z * edgeInwardRatio + Math.cos(angle) * hareEscapeLookAheadM
        }
        move(hare, target, hareSprintMps)
        return
      }
    }
    if (hid) hare.rest = hareEmergenceRestS
    const forage = nearest(hare, food.filter((p) => p.patch.stock > minimumForageStock))
    if (hare.rest > 0 || !forage) {
      hare.rest -= stepSeconds
      hare.behavior = 'wandering'
      wander(hare, hareWanderMps)
    }
    else if (distance(hare, forage) > feedingReachM) {
      hare.behavior = 'seeking'
      move(hare, forage, hareForageWalkMps)
    }
    else {
      hare.behavior = 'grazing'
      forage.patch.stock -= clover.bite
      grazed++
      if (forage.patch.stock <= minimumForageStock) hare.rest = depletedForageRestS
    }
  }
  function clearFoxRoute(from: Point, to: Point, visitors: Point[] = []) {
    if (Math.hypot(to.x, to.z) > radius + foxEdgeMarginM) return false
    const dx = to.x - from.x, dz = to.z - from.z, lengthSquared = dx * dx + dz * dz
    for (const p of visitors) {
      const t = Math.max(0, Math.min(1, ((p.x - from.x) * dx + (p.z - from.z) * dz) / (lengthSquared || 1)))
      if (distance(p, { x: from.x + dx * t, z: from.z + dz * t }) < Math.min(foxRetreatCorridorM, distance(p, from)) - routeClearanceEpsilonM) return false
    }
    return navigation.clear(from, to)
  }

  function retreat(fox: Animal, visitors: Point[], visitor: Point) {
    const clearance = (p: Point) => Math.min(...visitors.map((v) => distance(p, v)))
    const current = clearance(fox)
    if (fox.behavior !== 'fleeing' || clearance(fox.waypoint) < current + minimumRetreatGainM
      || !clearFoxRoute(fox, fox.waypoint, visitors)) {
      const away = Math.atan2(fox.x - visitor.x, fox.z - visitor.z)
      let best = current + minimumRetreatGainM
      let escape: Point | undefined
      for (const length of retreatAttempts) {
        for (let i = 0; i < escapeDirections; i++) {
          const angle = away + i * Math.PI / escapeDirectionsPerHalfTurn
          const point = { x: fox.x + length * Math.sin(angle), z: fox.z + length * Math.cos(angle) }
          const score = clearance(point)
          if (score > best && clearFoxRoute(fox, point, visitors)) {
            best = score
            escape = point
          }
        }
        if (escape) break
      }
      if (!escape) {
        fox.behavior = 'watching'
        return
      }
      fox.waypoint = escape
    }
    fox.behavior = 'fleeing'
    fox.rest = visitorRecoveryS
    moveDirect(fox, fox.waypoint, foxRetreatMps)
  }

  function patrol(fox: Animal, visitors: Point[]) {
    let next = route(fox, fox.waypoint)
    if (distance(fox, fox.waypoint) < reachedWaypointM || !next || !clearFoxRoute(fox, next, visitors)) {
      let waypoint: Point | undefined
      for (let i = 0; i < patrolAttemptLimit; i++) {
        const p = randomPoint(random)
        if (distance(fox, p) > 1 && clearFoxRoute(fox, p, visitors)) {
          waypoint = p
          break
        }
      }
      if (!waypoint) {
        fox.behavior = 'watching'
        return
      }
      next = fox.waypoint = waypoint
    }
    fox.behavior = 'patrolling'
    moveDirect(fox, next, foxPatrolMps)
  }

  function updateFox(fox: Animal, hour: number, visitors: Point[]) {
    // A wider release distance keeps patrol from immediately undoing a retreat.
    const visitor = nearest(fox, visitors, fox.behavior === 'fleeing' ? foxVisitorReleaseM : foxVisitorAlertM)
    if (visitor) {
      retreat(fox, visitors, visitor)
      return
    }
    fox.rest -= stepSeconds
    const range = isNight(hour) ? foxNightSightM : foxDaySightM
    const prey = fox.rest > 0
      ? undefined
      : nearest(fox, state.hares.filter((h) =>
          h.behavior !== 'sheltering' && distance(fox, h) < range && clearFoxRoute(fox, h, visitors)), range)
    if (!prey) {
      // After losing sight around cover, finish a stretch of patrol before hunting again.
      if (fox.behavior === 'chasing') fox.rest = Math.max(huntRecoveryS, fox.rest)
      patrol(fox, visitors)
      return
    }
    fox.behavior = 'chasing'
    moveDirect(fox, prey, foxChaseMps)
    if (distance(fox, prey) < encounterReachM) {
      encounters++
      fox.rest = postEncounterRestS
    }
  }
  function seek(seconds: number, visitors: Point[] = [], conditions: Conditions = recipe) {
    const target = Math.max(0, Math.floor(seconds / stepSeconds + tickRoundingEpsilon))
    if (target < tick) {
      state = structuredClone(layout)
      tick = escapes = grazed = encounters = 0
      random = seededRandom(recipe.seed + decisionSeedOffset)
    }
    const food = state.patches.flatMap((patch, i) => patch.kind === 'clover' && goals[i] ? [{ ...goals[i], patch }] : [])
    const growth = forageRegrowthPerTick * clover.regrowth * (minimumForageLight + daylight(conditions.hour)) * (1 + conditions.rain / percentFull)
    while (tick < target) {
      for (const { patch } of food) patch.stock = Math.min(1, patch.stock + growth)
      for (const hare of state.hares) {
        if (!avoidVisitor(hare, visitors, hareVisitorAlertM, hareRetreatMps)) updateHare(hare, food, conditions.rain)
      }
      for (const fox of state.foxes) updateFox(fox, conditions.hour, visitors)
      tick++
    }
    return { ...state, escapes, grazed, encounters }
  }
  return { seek }
}

// Only visible poses and forage travel over the network. Waypoints and AI timers stay on the host.
export function biomeFrame(state: ReturnType<typeof populate>) {
  const pose = ({ x, z, heading, behavior }: Animal) => ({ x, z, heading, behavior })
  return { hares: state.hares.map(pose), foxes: state.foxes.map(pose), clover: state.patches.filter((p) => p.kind === 'clover').map((p) => p.stock) }
}
export type BiomeFrame = ReturnType<typeof biomeFrame>
