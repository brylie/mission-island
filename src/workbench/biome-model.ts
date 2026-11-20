import { seededRandom } from '../scenery.ts'
import { daylight, isNight } from '../weather.ts'
import { codex, type BiomeRecipe } from './biome-recipe.ts'

interface Point { x: number; z: number }
type Kind = typeof codex[number]['key']
interface Patch extends Point { kind: Kind; angle: number; stock: number }
type Behavior = 'wandering' | 'seeking' | 'grazing' | 'fleeing' | 'sheltering' | 'patrolling' | 'chasing'
interface Animal extends Point { heading: number; behavior: Behavior; waypoint: Point; rest: number }
const dt = .1
const radius = 7.2

function randomPoint(random: () => number) {
  const angle = random() * Math.PI * 2, r = Math.sqrt(random()) * radius
  return { x: Math.cos(angle) * r, z: Math.sin(angle) * r }
}

function distance(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.z - b.z) }
function nearest<T extends Point>(origin: Point, choices: T[], range = Infinity) {
  let best: T | undefined
  for (const choice of choices) {
    const d = distance(origin, choice)
    if (d < range) { range = d; best = choice }
  }
  return best
}

function move(animal: Animal, target: Point, speed: number) {
  const dx = target.x - animal.x, dz = target.z - animal.z, d = Math.hypot(dx, dz)
  if (d < .02) return
  animal.heading = Math.atan2(dx, dz)
  const fraction = Math.min(1, speed * dt / d)
  animal.x += dx * fraction
  animal.z += dz * fraction
}

function populate(recipe: BiomeRecipe) {
  const patches: Patch[] = [], hares: Animal[] = [], foxes: Animal[] = []
  for (const [index, { key }] of codex.entries()) {
    // Independent streams keep all other placements stable when changing a count.
    const random = seededRandom(recipe.seed + (index + 1) * 77417)
    for (let i = 0; i < recipe[key]; i++) {
      const p = randomPoint(random), angle = random() * Math.PI * 2
      if (key === 'hares' || key === 'foxes') {
        const herd = key === 'hares' ? hares : foxes
        herd.push({ ...p, heading: angle, behavior: key === 'hares' ? 'wandering' : 'patrolling', waypoint: randomPoint(random), rest: 0 })
      } else patches.push({ ...p, kind: key, angle, stock: 1 })
    }
  }
  return { patches, hares, foxes }
}

export function createBiome(recipe: BiomeRecipe) {
  let state = populate(recipe), tick = 0, escapes = 0, grazed = 0, encounters = 0
  let random = seededRandom(recipe.seed + 91017)
  const wander = (a: Animal, speed: number) => {
    if (distance(a, a.waypoint) < .2) a.waypoint = randomPoint(random)
    move(a, a.waypoint, speed)
  }
  function updateHare(hare: Animal, food: Patch[], refuges: Patch[], dry: Patch[]) {
    const hid = hare.behavior === 'sheltering', fleeing = hare.behavior === 'fleeing'
    if (hid && hare.rest > 0) { hare.rest -= dt; return }
    const threat = nearest(hare, state.foxes.filter(f => f.rest <= 0), hid ? 4.8 : 3.6)
    if (threat || recipe.rain >= 65) {
      const refuge = nearest(hare, threat ? refuges : dry)
      if (refuge) {
        // Stop beside the shelter rather than at a tree trunk's centre.
        const clearance = refuge.kind === 'stones' ? .82 : .38
        const target = { x: refuge.x + clearance * Math.sin(refuge.angle), z: refuge.z + clearance * Math.cos(refuge.angle) }
        hare.behavior = distance(hare, target) < .23 ? 'sheltering' : 'fleeing'
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
          target.x = hare.x * .8 - Math.sin(angle) * 2
          target.z = hare.z * .8 + Math.cos(angle) * 2
        }
        move(hare, target, 2.7)
        return
      }
    }
    if (hid) hare.rest = .5
    const patch = nearest(hare, food.filter(p => p.stock > .15))
    if (hare.rest > 0 || !patch) {
      hare.rest -= dt
      hare.behavior = 'wandering'
      wander(hare, .65)
    } else if (distance(hare, patch) > .46) {
      hare.behavior = 'seeking'
      move(hare, patch, 1.25)
    } else {
      hare.behavior = 'grazing'
      patch.stock -= .035
      grazed++
      if (patch.stock <= .15) hare.rest = 2
    }
  }
  function updateFox(fox: Animal) {
    const prey = nearest(fox, state.hares.filter(h => h.behavior !== 'sheltering'), isNight(recipe.hour) ? 6.2 : 4.5)
    fox.rest -= dt
    if (!prey || fox.rest > 0) {
      fox.behavior = 'patrolling'
      wander(fox, .9)
      return
    }
    fox.behavior = 'chasing'
    move(fox, prey, 2.9)
    if (distance(fox, prey) < .55) { encounters++; fox.rest = 5 }
  }
  function seek(seconds: number) {
    const target = Math.max(0, Math.floor(seconds / dt + 1e-8))
    if (target < tick) {
      state = populate(recipe)
      tick = escapes = grazed = encounters = 0
      random = seededRandom(recipe.seed + 91017)
    }
    const food = state.patches.filter(p => p.kind === 'clover')
    const refuges = state.patches.filter(p => p.kind !== 'clover')
    const dry = refuges.filter(p => p.kind === 'trees' || p.kind === 'logs')
    const growth = .001 * (.2 + daylight(recipe.hour)) * (1 + recipe.rain / 100)
    while (tick < target) {
      for (const patch of food) patch.stock = Math.min(1, patch.stock + growth)
      for (const hare of state.hares) updateHare(hare, food, refuges, dry)
      for (const fox of state.foxes) updateFox(fox)
      tick++
    }
    return { ...state, escapes, grazed, encounters }
  }
  return { seek }
}
