import { habitatNavigation } from './biome-navigation.ts'
import { seededRandom } from './seeded-random.ts'
import { daylight, isNight } from './weather.ts'
import { codex, type BiomeRecipe } from './biome-recipe.ts'

import type { Point } from './world.ts'
type Kind = typeof codex[number]['key']
interface Patch extends Point { kind: Exclude<Kind, 'hares' | 'foxes'>, angle: number, stock: number }
type Behavior = 'wandering' | 'seeking' | 'grazing' | 'fleeing' | 'sheltering' | 'patrolling' | 'chasing' | 'watching'
interface Animal extends Point { heading: number, behavior: Behavior, waypoint: Point, rest: number }
const dt = 0.1
const radius = 7.2

function randomPoint(random: () => number) {
  const angle = random() * Math.PI * 2, r = Math.sqrt(random()) * radius
  return { x: Math.cos(angle) * r, z: Math.sin(angle) * r }
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.z - b.z)
}
function nearest<T extends Point>(origin: Point, choices: T[], range = Infinity) {
  let best: T | undefined
  for (const choice of choices) {
    const d = distance(origin, choice)
    if (d < range) {
      range = d
      best = choice
    }
  }
  return best
}

function moveDirect(animal: Animal, target: Point, speed: number) {
  const dx = target.x - animal.x, dz = target.z - animal.z, d = Math.hypot(dx, dz)
  if (d < 0.02) return
  animal.heading = Math.atan2(dx, dz)
  const fraction = Math.min(1, speed * dt / d)
  animal.x += dx * fraction
  animal.z += dz * fraction
}

export function populate(recipe: BiomeRecipe) {
  const patches: Patch[] = [], hares: Animal[] = [], foxes: Animal[] = []
  for (const [index, { key }] of codex.entries()) {
    // Independent streams keep all other placements stable when changing a count.
    const random = seededRandom(recipe.seed + (index + 1) * 77417)
    for (let i = 0; i < recipe[key]; i++) {
      const p = randomPoint(random), angle = random() * Math.PI * 2
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

export function createBiome(recipe: BiomeRecipe, layout = populate(recipe), clover = { bite: 0.035, regrowth: 1 }) {
  const navigation = habitatNavigation(layout.patches)
  let state = structuredClone(layout), tick = 0, escapes = 0, grazed = 0, encounters = 0
  let random = seededRandom(recipe.seed + 91017)
  const detours = new WeakMap<Animal, { goal: Point, next?: Point }>()
  // A grazing or hiding spot can overlap a trunk in an edited recipe. Pick a clear
  // spot beside it once, so an animal can reach and settle at its destination.
  function beside(p: Patch) {
    const radius = p.kind === 'grass' ? 0.28 : p.kind === 'stones' ? (0.8 + 0.13 * p.angle) * 0.55 + 0.34 : 0.85
    for (let i = 0; i < 16; i++) {
      const angle = p.angle + i * Math.PI / 8
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
    if (cached && distance(target, cached.goal) < 0.015 && (!cached.next
      || (distance(animal, cached.next) > 0.025 && navigation.clear(animal, cached.next)))) return cached.next
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
      heading = Math.atan2(animal.x, animal.z) + side * 1.85
    }
    animal.behavior = 'fleeing'
    animal.rest = 0.8
    move(animal, { x: animal.x + Math.sin(heading), z: animal.z + Math.cos(heading) }, speed)
    return true
  }
  const wander = (a: Animal, speed: number) => {
    if (distance(a, a.waypoint) < 0.2) a.waypoint = randomPoint(random)
    move(a, a.waypoint, speed)
  }
  function updateHare(hare: Animal, food: { x: number, z: number, patch: Patch }[], rain: number) {
    const hid = hare.behavior === 'sheltering', fleeing = hare.behavior === 'fleeing'
    if (hid && hare.rest > 0) {
      hare.rest -= dt
      return
    }
    const threat = nearest(hare, state.foxes.filter((f) => f.rest <= 0), hid ? 4.8 : 3.6)
    if (threat || rain >= 65) {
      const target = nearest(hare, threat ? shelters : dryShelters)
      if (target) {
        hare.behavior = distance(hare, target) < 0.23 ? 'sheltering' : 'fleeing'
        if (hare.behavior === 'sheltering' && !hid) {
          hare.rest = 2
          if (fleeing && threat) escapes++
        }
        if (hare.behavior === 'fleeing') move(hare, target, threat ? 2.7 : 1.2)
        return
      }
      if (threat) {
        hare.behavior = 'fleeing'
        const angle = Math.atan2(hare.z - threat.z, hare.x - threat.x)
        const target = { x: hare.x + 2 * Math.cos(angle), z: hare.z + 2 * Math.sin(angle) }
        if (Math.hypot(target.x, target.z) > radius) {
          target.x = hare.x * 0.8 - Math.sin(angle) * 2
          target.z = hare.z * 0.8 + Math.cos(angle) * 2
        }
        move(hare, target, 2.7)
        return
      }
    }
    if (hid) hare.rest = 0.5
    const forage = nearest(hare, food.filter((p) => p.patch.stock > 0.15))
    if (hare.rest > 0 || !forage) {
      hare.rest -= dt
      hare.behavior = 'wandering'
      wander(hare, 0.65)
    }
    else if (distance(hare, forage) > 0.46) {
      hare.behavior = 'seeking'
      move(hare, forage, 1.25)
    }
    else {
      hare.behavior = 'grazing'
      forage.patch.stock -= clover.bite
      grazed++
      if (forage.patch.stock <= 0.15) hare.rest = 2
    }
  }
  function clearFoxRoute(from: Point, to: Point, visitors: Point[] = []) {
    if (Math.hypot(to.x, to.z) > radius + 0.65) return false
    const dx = to.x - from.x, dz = to.z - from.z, lengthSquared = dx * dx + dz * dz
    for (const p of visitors) {
      const t = Math.max(0, Math.min(1, ((p.x - from.x) * dx + (p.z - from.z) * dz) / (lengthSquared || 1)))
      if (distance(p, { x: from.x + dx * t, z: from.z + dz * t }) < Math.min(4.85, distance(p, from)) - 0.001) return false
    }
    return navigation.clear(from, to)
  }

  function retreat(fox: Animal, visitors: Point[], visitor: Point) {
    const clearance = (p: Point) => Math.min(...visitors.map((v) => distance(p, v)))
    const current = clearance(fox)
    if (fox.behavior !== 'fleeing' || clearance(fox.waypoint) < current + 0.12
      || !clearFoxRoute(fox, fox.waypoint, visitors)) {
      const away = Math.atan2(fox.x - visitor.x, fox.z - visitor.z)
      let best = current + 0.12
      let escape: Point | undefined
      for (const length of [2.8, 1.35, 0.6]) {
        for (let i = 0; i < 16; i++) {
          const angle = away + i * Math.PI / 8
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
    fox.rest = 0.8
    moveDirect(fox, fox.waypoint, 3.5)
  }

  function patrol(fox: Animal, visitors: Point[]) {
    let next = route(fox, fox.waypoint)
    if (distance(fox, fox.waypoint) < 0.2 || !next || !clearFoxRoute(fox, next, visitors)) {
      let waypoint: Point | undefined
      for (let i = 0; i < 16; i++) {
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
    moveDirect(fox, next, 0.9)
  }

  function updateFox(fox: Animal, hour: number, visitors: Point[]) {
    // A wider release distance keeps patrol from immediately undoing a retreat.
    const visitor = nearest(fox, visitors, fox.behavior === 'fleeing' ? 5.7 : 4.6)
    if (visitor) {
      retreat(fox, visitors, visitor)
      return
    }
    fox.rest -= dt
    const range = isNight(hour) ? 6.2 : 4.5
    const prey = fox.rest > 0
      ? undefined
      : nearest(fox, state.hares.filter((h) =>
          h.behavior !== 'sheltering' && distance(fox, h) < range && clearFoxRoute(fox, h, visitors)), range)
    if (!prey) {
      // After losing sight around cover, finish a stretch of patrol before hunting again.
      if (fox.behavior === 'chasing') fox.rest = Math.max(2, fox.rest)
      patrol(fox, visitors)
      return
    }
    fox.behavior = 'chasing'
    moveDirect(fox, prey, 2.9)
    if (distance(fox, prey) < 0.55) {
      encounters++
      fox.rest = 5
    }
  }
  function seek(seconds: number, visitors: Point[] = [], conditions: Conditions = recipe) {
    const target = Math.max(0, Math.floor(seconds / dt + 1e-8))
    if (target < tick) {
      state = structuredClone(layout)
      tick = escapes = grazed = encounters = 0
      random = seededRandom(recipe.seed + 91017)
    }
    const food = state.patches.flatMap((patch, i) => patch.kind === 'clover' && goals[i] ? [{ ...goals[i], patch }] : [])
    const growth = 0.001 * clover.regrowth * (0.2 + daylight(conditions.hour)) * (1 + conditions.rain / 100)
    while (tick < target) {
      for (const { patch } of food) patch.stock = Math.min(1, patch.stock + growth)
      for (const hare of state.hares) {
        if (!avoidVisitor(hare, visitors, 3.8, 3.2)) updateHare(hare, food, conditions.rain)
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
