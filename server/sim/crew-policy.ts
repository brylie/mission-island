import type { CrewCommand } from '../commands.ts'
import type { Snapshot } from '../../src/protocol.ts'
import { burningHotspots } from '../../src/wildfire.ts'

export const crewPolicies = ['idle', 'scripted'] as const
export type CrewPolicy = typeof crewPolicies[number]

// The host drops input older than 400 ms, so a scripted walker resends every few ticks.
const inputEveryTicks = 8
const arrivedM = 1.5

// Scripted crews walk straight at the nearest burning hotspot and hold spray there.
// It ignores terrain and paths: a first stand-in for a crew that responds, not a pathfinder.
export function scriptedCrewCommands(policy: CrewPolicy, state: Readonly<Snapshot>, seat: number, tick: number): CrewCommand[] {
  if (policy === 'idle' || tick % inputEveryTicks !== 0) return []
  const player = state.players.find((candidate) => candidate.id === seat)
  const spots = burningHotspots(state.events.fire)
  if (!player || !spots.length) return []
  const target = spots.reduce((best, spot) => Math.hypot(spot.x - player.x, spot.z - player.z) < Math.hypot(best.x - player.x, best.z - player.z) ? spot : best)
  const dx = target.x - player.x, dz = target.z - player.z
  const gap = Math.hypot(dx, dz)
  const moving = gap > arrivedM
  const input = { x: moving ? dx / gap : 0, z: moving ? dz / gap : 0, spray: !moving, careful: false, sprint: moving }
  return [{ type: 'input', input }]
}
