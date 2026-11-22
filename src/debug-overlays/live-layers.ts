import { animalOverlay, sightlineOverlay, wildfireOverlay } from '../assets/recipes/debug-overlays.ts'
import { fireFinder, fireWatch } from '../fire-watch.ts'
import { windAt } from '../island-wind.ts'
import { juniperCenter } from '../juniper-habitat.ts'
import { mixHex } from './registry.ts'
import { fireWatchBaseHeight, groundHeight } from '../terrain.ts'
import { fireCentre, spreadCandidates } from '../wildfire.ts'
import type { Point } from '../world.ts'
import { starterFireSites } from '../worlds/starter/layout/fire-sites.ts'
import type { OverlayContext, OverlayLayer, OverlayPrimitive } from './registry.ts'
import { ring } from './world-layers.ts'

const arrowHeadShare = 0.25
const arrowHeadSpread = 0.5

function arrow(from: Point, heading: number, length: number, color: string): OverlayPrimitive[] {
  const tip = { x: from.x + Math.sin(heading) * length, z: from.z + Math.cos(heading) * length }
  const head = (side: number) => ({ x: tip.x - Math.sin(heading + side * arrowHeadSpread) * length * arrowHeadShare, z: tip.z - Math.cos(heading + side * arrowHeadSpread) * length * arrowHeadShare })
  return [{ kind: 'line', points: [from, tip], color }, { kind: 'line', points: [head(-1), tip, head(1)], color }]
}

// Hotspot heat, the wind from windAt, and the hotspot the wind favours next.
// Without a fire, each site gets a ring and the current wind so a Workbench view can preview spread direction.
export const wildfireLayer: OverlayLayer = {
  id: 'wildfire',
  label: 'Wildfire state',
  description: 'Hotspot heat from pale to red, the wind vector, and the unburnt hotspot the wind favours next (violet).',
  live: true,
  create: () => ({ islandTime, state }: OverlayContext) => {
    const wind = windAt(islandTime)
    const fire = state?.events.fire
    if (!fire) {
      return starterFireSites.flatMap((site) => [
        { kind: 'line', points: ring(site, wildfireOverlay.siteRingM), color: wildfireOverlay.cold, closed: true } satisfies OverlayPrimitive,
        ...arrow(site, wind.heading, wildfireOverlay.windArrowM * wind.strength, wildfireOverlay.wind),
      ])
    }
    const candidates = spreadCandidates(fire, wind)
    const next = candidates.reduce<typeof candidates[number] | undefined>((best, candidate) => !best || candidate.score > best.score ? candidate : best, undefined)
    return [
      ...fire.hotspots.map((spot): OverlayPrimitive => ({ kind: 'ring', x: spot.x, z: spot.z, radius: wildfireOverlay.hotspotRadiusM, color: spot.caught ? mixHex(wildfireOverlay.cold, wildfireOverlay.hot, spot.heat) : wildfireOverlay.cold })),
      ...(next ? [{ kind: 'ring', x: next.spot.x, z: next.spot.z, radius: wildfireOverlay.nextRingM, color: wildfireOverlay.next } satisfies OverlayPrimitive] : []),
      ...arrow(fireCentre(fire), wind.heading, wildfireOverlay.windArrowM * wind.strength, wildfireOverlay.wind),
    ]
  },
}

// A site is seen when no ground rises above the straight line from a lookout's eye on the deck to the fire.
export function fireWatchSees(target: Point) {
  const eye = { ...fireFinder, y: fireWatchBaseHeight() + fireWatch.geometry.deck.top + sightlineOverlay.eyeHeightM }
  const goal = groundHeight(target) + sightlineOverlay.clearanceM
  const length = Math.hypot(target.x - eye.x, target.z - eye.z)
  const steps = Math.max(1, Math.ceil(length / sightlineOverlay.sampleStepM))
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    if (groundHeight({ x: eye.x + (target.x - eye.x) * t, z: eye.z + (target.z - eye.z) * t }) > eye.y + (goal - eye.y) * t) return false
  }
  return true
}

export const sightlineLayer: OverlayLayer = {
  id: 'sightlines',
  label: 'Fire Watch sightlines',
  description: 'Lines from the Fire Watch deck to each fire site: green where terrain leaves it in view, red where a rise hides it.',
  live: false,
  create: () => () => starterFireSites.map((site): OverlayPrimitive => ({
    kind: 'line',
    points: [fireFinder, site],
    color: fireWatchSees(site) ? sightlineOverlay.seen : sightlineOverlay.hidden,
  })),
}

// Hares and foxes in Juniper Hollow, coloured by intent, with a fading trail of recent positions.
export const animalLayer: OverlayLayer = {
  id: 'animals',
  label: 'Animal intents and paths',
  description: 'Juniper hares and foxes coloured by behaviour, with their heading and recent path.',
  live: true,
  create() {
    const trails = new Map<string, Point[]>()
    return ({ state }: OverlayContext) => {
      if (!state?.juniper) return []
      const animals = [...state.juniper.hares.map((a, i) => ({ ...a, id: `hare-${i}` })), ...state.juniper.foxes.map((a, i) => ({ ...a, id: `fox-${i}` }))]
      return animals.flatMap((animal): OverlayPrimitive[] => {
        const at = { x: juniperCenter.x + animal.x, z: juniperCenter.z + animal.z }
        const trail = trails.get(animal.id) ?? []
        const last = trail.at(-1)
        if (!last || Math.hypot(last.x - at.x, last.z - at.z) > animalOverlay.trailStepM) trail.push(at)
        if (trail.length > animalOverlay.trailLength) trail.shift()
        trails.set(animal.id, trail)
        const color = (animalOverlay.colors as Record<string, string>)[animal.behavior] ?? animalOverlay.fallback
        return [
          { kind: 'ring', x: at.x, z: at.z, radius: animalOverlay.markerM, color },
          ...arrow(at, animal.heading, animalOverlay.headingM, color),
          ...(trail.length > 1 ? [{ kind: 'line', points: [...trail], color } satisfies OverlayPrimitive] : []),
        ]
      })
    }
  },
}
