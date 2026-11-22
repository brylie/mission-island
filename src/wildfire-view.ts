import type { Scene } from '@babylonjs/core/scene'
import { particleRecipes } from './assets/recipes/particle-recipes'
import { createLookoutFire } from './fire-effect'
import type { MeshFactory } from './island-meshes'
import { createObjectiveMarker } from './objective-marker'
import { objectiveMarkerLook } from './assets/geometry/starter-cues'
import { createParticleEffect } from './particle-effect'
import type { Snapshot } from './protocol'
import { groundHeight } from './terrain'
import { fireCentre, fireSite, fireStrength, wildfireSizes, type FireRecord } from './wildfire'
import { windAt } from './island-wind'
import { createRecoveryGround, type RecoveryBed } from './lookout-recovery-art'
import { recoveryStage } from './lookout-recovery'

const smokeSeed = 7310
const markerDiameterPerHotspot = 3.2
const markerBaseDiameter = 5
const markerColor = '#ff7a4d'
const smokeLiftM = 1.6
// The plume stays tall while any hotspot burns, then thins with the fire.
const minimumPlume = 0.45
const largestFire = wildfireSizes.blaze.hotspots
// Each burnt hotspot leaves an oval of ash a little wider than its flames, and a joining bed under
// them all makes one ragged burnt patch rather than separate spots.
const scarRadiusM = 2.1
const scarDepthRatio = 0.85
// Fresh wildfire ash is darker than the lookout's damp verge, so it reads from the Fire Watch deck.
const scarAshTint = '#4a4440'

function scarBeds(record: FireRecord): RecoveryBed[] {
  const site = fireSite(record.site)
  // Records saved before burnt hotspots were kept fall back to the first hotspot.
  const spots = (record.burned ?? [0]).map((index) => {
    const [dx, dz] = site.hotspots[index] ?? site.hotspots[0]
    return { x: site.x + dx, z: site.z + dz }
  })
  const centre = { x: spots.reduce((sum, { x }) => sum + x, 0) / spots.length, z: spots.reduce((sum, { z }) => sum + z, 0) / spots.length }
  const reach = Math.max(...spots.map((spot) => Math.hypot(spot.x - centre.x, spot.z - centre.z)))
  const beds = spots.map((spot) => ({ ...spot, rx: scarRadiusM, rz: scarRadiusM * scarDepthRatio }))
  return spots.length > 1 ? [{ ...centre, rx: reach + scarRadiusM, rz: (reach + scarRadiusM) * scarDepthRatio }, ...beds] : beds
}

// The last fire's burnt ground, rebuilt only when a new fire ends.
function createBurnScar(meshes: MeshFactory) {
  let scar: { id: number, ground: ReturnType<typeof createRecoveryGround> } | undefined
  return (record: FireRecord | undefined, islandTime: number) => {
    if (scar?.id !== record?.id) {
      scar?.ground.dispose()
      scar = record && { id: record.id, ground: createRecoveryGround(meshes, scarBeds(record), { ashTint: scarAshTint, seed: record.id, name: 'Wildfire ash' }) }
    }
    if (record) scar?.ground.show(recoveryStage(record.endedAt, islandTime))
  }
}

export function createWildfireView(meshes: MeshFactory, scene: Scene) {
  const flames = Array.from({ length: largestFire }, () => createLookoutFire(scene, 0, 0))
  const placed: (string | undefined)[] = []
  const column = createParticleEffect(scene, 'Wildfire smoke column', particleRecipes['wildfire-smoke-column'], smokeSeed)
  const marker = createObjectiveMarker(meshes, { x: 0, z: 0 }, markerBaseDiameter, markerColor)
  marker.setEnabled(false)
  const showScar = createBurnScar(meshes)

  return (state: Pick<Snapshot, 'events' | 'islandTime'>, time: number) => {
    showScar(state.events.lastFire, state.islandTime)
    const fire = state.events.fire
    for (const [index, flame] of flames.entries()) {
      const spot = fire?.hotspots[index]
      const key = spot && `${fire.id}:${index}`
      if (spot && key !== placed[index]) {
        flame.move(spot.x, spot.z)
        placed[index] = key
      }
      flame.pose(time, spot?.heat ?? 0)
    }
    if (!fire) {
      column.stream(time, undefined, { strength: 0, footprint: 1 })
      marker.setEnabled(false)
      return
    }
    const centre = fireCentre(fire)
    const ground = groundHeight(centre)
    const strength = fireStrength(fire)
    const yaw = windAt(state.islandTime).heading
    column.stream(time, strength > 0 ? { ...centre, y: ground + smokeLiftM, yaw } : undefined, { strength: minimumPlume + (1 - minimumPlume) * strength, footprint: 1 })
    marker.setEnabled(fire.located)
    if (fire.located) {
      marker.position.set(centre.x, ground + objectiveMarkerLook.groundOffset, centre.z)
      const scale = (markerBaseDiameter + markerDiameterPerHotspot * (wildfireSizes[fire.size].hotspots - 1)) / markerBaseDiameter
      marker.scaling.set(scale, 1, scale)
    }
  }
}
