import { biteSeconds, castTravelSeconds } from './charged-actions.ts'
import type { Item, Player, Snapshot } from './protocol.ts'
import { groundHeight, waterDepth, waterLevel } from './terrain.ts'
import { crateSize, distance, lookout, truckBed } from './world.ts'
import { truckSurface } from './truck-pose.ts'
import type { ParticleSource } from './particle-motion.ts'

const steamRise = 0.28
const steamStrength = 1.05
const steamSeconds = 0.92
const floatCueLift = 0.024
const biteStrength = 1.25
const hookedProgressTravel = 0.88
const hookedStrength = 1.3
const hookedSeconds = 0.19
const crateResetDistance = 5
const half = 0.5
const crateContactMargin = 0.13
const minimumVisibleFall = 0.035
const gritMaxWaterDepth = 0.05
const gritLift = 0.045
const gritFloorGap = 0.018
const cargoBedGrit = 0.26
const groundGritMax = 1.4
const groundGritBase = 0.35
const groundGritGain = 4
const floatDipSeconds = 0.32
const floatDipDepth = 0.15

type Event = { id: 'bobber-bite-dip' | 'hooked-fish-thrash' | 'crate-landing-grit' | 'wet-ash-steam', source: ParticleSource, strength: number, length?: number }

export function lookoutSteamCue() {
  return { id: 'wet-ash-steam', source: { ...lookout, y: groundHeight(lookout) + steamRise }, strength: steamStrength, length: steamSeconds } as const
}

export function snapshotEffectCues(before: Snapshot, state: Snapshot) {
  const cues: Event[] = []
  for (const player of state.players) {
    const previous = before.players.find((p) => p.id === player.id)?.casting
    const cast = player.casting
    if (cast && cast.elapsed >= castTravelSeconds && cast.fight && player.connected) {
      const source = { ...cast.bobber, y: waterLevel + floatCueLift }
      if (!previous?.fight) cues.push({ id: 'bobber-bite-dip', source, strength: biteStrength })
      else if (!previous.fight.pulling && cast.fight.pulling) {
        const amount = cast.fight.progress * hookedProgressTravel
        cues.push({ id: 'hooked-fish-thrash', source: { x: source.x + (player.x - source.x) * amount, y: source.y, z: source.z + (player.z - source.z) * amount }, strength: hookedStrength, length: hookedSeconds })
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
  if (!previous || item.kind !== 'crate' || item.holder !== null || item.delivered || distance(item, previous) > crateResetDistance) return
  const floor = item.onBed ? truckSurface(truck, item, truckBed.top).y : groundHeight(item)
  const contact = floor + crateSize * half + crateContactMargin
  const fall = previous.y - item.y
  const landed = item.onBed ? !previous.onBed : previous.y > contact && item.y <= contact && fall > minimumVisibleFall
  if (!landed || (!item.onBed && waterDepth(item) >= gritMaxWaterDepth)) return
  return { id: 'crate-landing-grit', source: { x: item.x, y: floor + gritLift, z: item.z, floor: floor + gritFloorGap }, strength: item.onBed ? cargoBedGrit : Math.min(groundGritMax, groundGritBase + fall * groundGritGain) }
}

export function fishingFloatDip(cast: NonNullable<Player['casting']>) {
  if (!cast.fight) return 0
  const age = cast.elapsed - castTravelSeconds - biteSeconds
  return age > 0 && age < floatDipSeconds ? Math.sin(age / floatDipSeconds * Math.PI) * floatDipDepth : 0
}
