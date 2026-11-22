import { placeName, placeNear } from '../src/journal/journal.ts'
import type { Item, Snapshot } from '../src/protocol.ts'
import { firstAidPatient, floats, isRescueGear, rescueGear, signalCooldownMs, throwDistance } from '../src/rescue-gear.ts'
import { canOccupyGround } from '../src/simulation/movement.ts'
import { offset, type Point } from '../src/world.ts'
import { withinSkiffBoundary } from '../src/terrain.ts'
import type { CrewMember, CrewNotice } from './crew.ts'
import { restingHeight } from './items.ts'

const gestureMs = 260
const throwGestureMs = 270
const landingClearanceM = 0.25
const landingStepM = 0.5

// Left click with a piece of rescue gear. Signals and first aid checks tell the
// whole crew; throwing lines and buoys charge like a crate and land ahead.
export function createRescueGearUse(state: Snapshot, notifyAll: (notice: CrewNotice) => void) {
  const lastSignal = new Map<number, number>()

  function gesture(member: CrewMember, now: number) {
    member.primary = { kind: 'reach', since: now }
    member.reachUntil = now + gestureMs
  }

  // Returns true when the gear handled the click.
  function start(member: CrewMember, item: Item, now: number) {
    const { player } = member
    if (!isRescueGear(item.kind) || player.seat) return false
    const { use } = rescueGear[item.kind]
    if (use === 'throw') {
      member.primary = { kind: 'throw', since: now, itemId: item.id }
      player.charge = { kind: 'throw', power: 0 }
    }
    else if (use === 'signal' || use === 'check') {
      // One shared cooldown keeps signals and checks from flooding the crew.
      if (now - (lastSignal.get(player.id) ?? -Infinity) < signalCooldownMs) return true
      lastSignal.set(player.id, now)
      if (use === 'signal') {
        const place = placeName(placeNear(player))
        notifyAll({ type: 'crew-signal', signal: item.kind === 'radio' ? 'radio' : 'whistle', playerId: player.id, x: player.x, z: player.z, ...(place && { place }) })
      }
      else {
        const patient = firstAidPatient(state, player)
        // With nobody close, only the helper hears about it.
        if (!patient) member.notify?.({ type: 'first-aid-check', helperId: player.id, patientId: null })
        else {
          player.heading = Math.atan2(patient.x - player.x, patient.z - player.z)
          notifyAll({ type: 'first-aid-check', helperId: player.id, patientId: patient.id })
        }
      }
      gesture(member, now)
    }
    // The flashlight shines whenever it is held, so a click does nothing more.
    return true
  }

  // Lands a thrown line or buoy ahead. The flight is sampled outward from the
  // thrower and stops before the first wall or prop, so gear never lands behind
  // a wall. Floating gear may land in deep water, inside the swim boundary,
  // where a swimmer can pick it up.
  function release(member: CrewMember, item: Item, heading: number, power: number, now: number) {
    const { player } = member
    if (!isRescueGear(item.kind) || rescueGear[item.kind].use !== 'throw') return false
    const floating = floats(item.kind)
    const aim = { ...player, heading }
    let landing: Point = player
    for (let reach = landingStepM; reach <= throwDistance(power); reach += landingStepM) {
      const sample = offset(aim, 0, reach)
      const clear = floating
        ? withinSkiffBoundary(sample) && canOccupyGround(sample, landingClearanceM, -Infinity)
        : canOccupyGround(sample, landingClearanceM, 0)
      if (!clear) break
      landing = sample
    }
    player.heading = heading
    item.holder = null
    Object.assign(item, landing, { heading, rotation: null })
    item.y = restingHeight(item)
    member.throwUntil = now + throwGestureMs
    player.throwing = true
    return true
  }

  return { start, release }
}
