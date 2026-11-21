import { biteSeconds, castTravelSeconds } from './charged-actions.ts'
import type { Item, Player, Snapshot } from './protocol.ts'
import { groundHeight, waterDepth, waterLevel } from './terrain.ts'
import { crateSize, distance, lookout, truckBed } from './world.ts'
import { truckSurface } from './truck-pose.ts'
import type { ParticleSource } from './particle-motion.ts'

type Event = { id: 'bobber-bite-dip' | 'hooked-fish-thrash' | 'crate-landing-grit' | 'wet-ash-steam', source: ParticleSource, strength: number, length?: number }

export function lookoutSteamCue() {
  return { id: 'wet-ash-steam', source: { ...lookout, y: groundHeight(lookout) + 0.28 }, strength: 1.05, length: 0.92 } as const
}

export function snapshotEffectCues(before: Snapshot, state: Snapshot) {
  const cues: Event[] = []
  for (const player of state.players) {
    const previous = before.players.find((p) => p.id === player.id)?.casting
    const cast = player.casting
    if (cast && cast.elapsed >= castTravelSeconds && cast.fight && player.connected) {
      const source = { ...cast.bobber, y: waterLevel + 0.024 }
      if (!previous?.fight) cues.push({ id: 'bobber-bite-dip', source, strength: 1.25 })
      else if (!previous.fight.pulling && cast.fight.pulling) {
        const amount = cast.fight.progress * 0.88
        cues.push({ id: 'hooked-fish-thrash', source: { x: source.x + (player.x - source.x) * amount, y: source.y, z: source.z + (player.z - source.z) * amount }, strength: 1.3, length: 0.19 })
      }
    }
  }
  for (const item of state.items) {
    const cue = crateImpact(before.items[item.id], item, state.truck)
    if (cue) cues.push(cue)
  }
  if (before.mission === 'fire' && state.mission === 'complete') {
    cues.push(lookoutSteamCue())
  }
  return { cues, cultivation: state.cultivation?.filter((cue) => cue.sequence > (before.cultivation?.at(-1)?.sequence ?? 0)) ?? [] }
}

function crateImpact(previous: Item | undefined, item: Item, truck: Snapshot['truck']): Event | undefined {
  if (!previous || item.kind !== 'crate' || item.holder !== null || item.delivered || distance(item, previous) > 5) return
  const floor = item.onBed ? truckSurface(truck, item, truckBed.top).y : groundHeight(item)
  const contact = floor + crateSize / 2 + 0.13
  const fall = previous.y - item.y
  const landed = item.onBed ? !previous.onBed : previous.y > contact && item.y <= contact && fall > 0.035
  if (!landed || (!item.onBed && waterDepth(item) >= 0.05)) return
  return { id: 'crate-landing-grit', source: { x: item.x, y: floor + 0.045, z: item.z, floor: floor + 0.018 }, strength: item.onBed ? 0.26 : Math.min(1.4, 0.35 + fall * 4) }
}

export function fishingFloatDip(cast: NonNullable<Player['casting']>) {
  if (!cast.fight) return 0
  const age = cast.elapsed - castTravelSeconds - biteSeconds
  return age > 0 && age < 0.32 ? Math.sin(age / 0.32 * Math.PI) * 0.15 : 0
}
