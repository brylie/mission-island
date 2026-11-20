import { heldItem, inSkiff } from '../src/actions.ts'
import type { ChargeKind } from '../src/charged-actions.ts'
import { cleanCrewName } from '../src/crew-appearance.ts'
import type { Input, Player, ServerMessage, Snapshot } from '../src/protocol.ts'
import { groundHeight } from '../src/terrain.ts'
import { spawns } from '../src/world.ts'
import type { createCargoPhysics } from '../src/simulation/cargo.ts'
import { recoverSceneryOverlap } from '../src/simulation/movement.ts'
import type { IslandSave } from './save.ts'

export const stopped: Input = { x: 0, z: 0, spray: false, careful: false, sprint: false }

export type CrewNotice = Exclude<ServerMessage, Snapshot | { type: 'welcome' } | { type: 'full' | 'duplicate' }>

export interface CrewMember {
  player: Player
  notify: ((message: CrewNotice) => void) | null
  input: Input
  lastInput: number
  reachUntil: number
  throwUntil: number
  primary: { kind: ChargeKind | 'reach' | 'spray' | 'reel'; since: number; itemId?: number } | null
  disconnectedAt: number
  verticalSpeed: number
}

export function stopPrimary(member: CrewMember) {
  member.primary = null
  member.player.charge = null
}

export function stowTool(member: CrewMember) {
  member.player.equipped = null
  member.player.casting = null
}

function restingPlayer(player: Player) {
  return {
    ...player, name: cleanCrewName(player.name), discoveries: player.discoveries ?? [],
    connected: false, casting: null, charge: null, reaching: false, rightHandRaised: false, throwing: false, sleeping: false,
    swimming: player.swimming ?? false, rowing: false,
  }
}

export function createCrewRoster(
  state: Pick<Snapshot, 'items' | 'players'>, savedCrew: IslandSave['crew'], clock: () => number,
  physics: Pick<ReturnType<typeof createCargoPhysics>, 'release'>, checkpoint?: () => void,
) {
  const crew = new Map<string, CrewMember>()
  const profiles = new Map<string, Player>()

  function crewMember(player: Player): CrewMember {
    return {
      player, notify: null, input: stopped, lastInput: 0, reachUntil: 0, throwUntil: 0, primary: null,
      disconnectedAt: clock(), verticalSpeed: 0,
    }
  }

  for (const { token, player, reserved } of savedCrew) {
    const restored = restingPlayer(structuredClone(player))
    recoverSceneryOverlap(restored)
    profiles.set(token, restored)
    if (reserved) {
      crew.set(token, crewMember(restored))
      state.players.push(restored)
    }
  }

  function join(token: string, notify: (message: CrewNotice) => void) {
    const existing = crew.get(token)
    if (existing?.player.connected) return 'duplicate'
    if (!existing && crew.size >= spawns.length) return 'full'
    const profile = profiles.get(token)
    const open = spawns.flatMap((_, index) => state.players.some((player) => player.id === index) ? [] : [index])
    const id = profile && open.includes(profile.id) ? profile.id : open[0]
    const member = existing ?? crewMember(profile ? { ...profile, id, appearanceBase: profile.appearanceBase ?? profile.id } : {
      ...spawns[id], id, heading: 0, y: groundHeight(spawns[id]), grounded: true,
        name: '', discoveries: [], onBed: false, reaching: false, rightHandRaised: false, connected: true, sleeping: false, swimming: false,
        seat: null, rowing: false, inventory: [], equipped: null,
        goods: { fish: 0, carrots: 0 }, seeds: 0, charge: null, casting: null, throwing: false, ownsAngler: false },
    )
    if (!existing) state.players.push(member.player)
    crew.set(token, member)
    profiles.set(token, member.player)
    member.notify = notify
    member.player.connected = true
    if (!existing) checkpoint?.()
    return member
  }

  function expireCrew(now: number) {
    for (const [token, member] of crew) {
      const reserveFor = inSkiff(member.player.seat) ? 120_000 : 12_000
      if (member.player.connected || now - member.disconnectedAt < reserveFor) continue
      const item = heldItem(state, member.player)
      if (item) {
        item.holder = null
        if (item.kind === 'crate') physics.release(item, item)
        else item.y = groundHeight(item) + 0.04
      }
      member.player.seat = null
      member.player.onBed = false
      member.player.truckSurface = undefined
      state.players = state.players.filter((player) => player !== member.player)
      crew.delete(token)
    }
  }

  function savedProfiles(): IslandSave['crew'] {
    return Array.from(profiles, ([token, player]) => ({
      token, player: structuredClone(restingPlayer(player)), reserved: crew.has(token),
    }))
  }

  function notifyAll(message: CrewNotice) {
    for (const member of crew.values()) member.notify?.(message)
  }

  return { join, expireCrew, savedProfiles, notifyAll, members: () => [...crew.values()] }
}

export function disconnect(member: CrewMember, now: number) {
  member.notify = null
  member.input = stopped
  stopPrimary(member)
  member.player.casting = null
  member.reachUntil = 0
  member.player.connected = false
  member.player.sleeping = false
  member.disconnectedAt = now
}
