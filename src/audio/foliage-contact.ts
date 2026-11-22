import { foliageContact as contact } from '../assets/audio/foliage.ts'
import type { UnderstoryPlant } from '../island-wildlife.ts'
import { islandTrees, northernProps } from '../scenery.ts'
import type { Point } from '../world.ts'
import type { FoliageKind } from './foliage-recipes.ts'
import { clamp01, half } from './recipe-kit.ts'

type Brush = Point & { kind: FoliageKind, strength: number }

type Walker = { plants: Set<number>, trunks: Set<number>, lastBrush: number }

const starterTrunks: Point[] = [...islandTrees, ...northernProps.filter((prop) => prop.tree)]

// Which plants and trunks each walker is touching. A rustle plays when a walker moving at a fair pace
// first reaches a plant; leaving needs a clear step past its reach, so standing still or skimming an
// edge stays quiet. Bark has a per-tree cooldown, and each walker gets at most one brush in a short window.
export function createFoliageContacts(plants: readonly UnderstoryPlant[], trunks: readonly Point[] = starterTrunks) {
  const walkers = new Map<number, Walker>()
  const trunkTouched = new Map<number, number>()

  function track<T extends Point>(inside: Set<number>, items: readonly T[], point: Point, reachOf: (item: T) => number, onEnter: (item: T, index: number) => void) {
    items.forEach((item, index) => {
      const distance = Math.hypot(item.x - point.x, item.z - point.z)
      const reach = reachOf(item)
      if (inside.has(index)) {
        if (distance > reach * contact.exitScale) inside.delete(index)
      }
      else if (distance < reach) {
        inside.add(index)
        onEnter(item, index)
      }
    })
  }

  return {
    step(id: number, point: Point, speed: number, time: number): Brush | null {
      const walker = walkers.get(id) ?? { plants: new Set<number>(), trunks: new Set<number>(), lastBrush: -Infinity }
      walkers.set(id, walker)
      let brush: Brush | null = null
      const pace = clamp01(speed / contact.fullSpeed)
      track(walker.plants, plants, point, (plant) => contact.plants[plant.kind].reachMetres, (plant) => {
        const { stiffness } = contact.plants[plant.kind]
        brush ??= { x: plant.x, z: plant.z, kind: plant.kind, strength: pace * (half + half * stiffness) }
      })
      track(walker.trunks, trunks, point, () => contact.trunk.reachMetres, (trunk, index) => {
        if (time - (trunkTouched.get(index) ?? -Infinity) < contact.trunk.cooldownSeconds) return
        trunkTouched.set(index, time)
        brush ??= { x: trunk.x, z: trunk.z, kind: 'trunk', strength: pace }
      })
      if (!brush || speed < contact.minimumSpeed || time - walker.lastBrush < contact.walkerCooldownSeconds) return null
      walker.lastBrush = time
      return brush
    },
    forget(id: number) {
      walkers.delete(id)
    },
  }
}
