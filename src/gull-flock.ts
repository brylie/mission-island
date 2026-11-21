import { createGull } from './assets/gull'
import { gullAt, type GullPerch } from './gull-flight'
import { gullsPerLift, thermalGullAt } from './gull-thermals'
import type { MeshFactory } from './island-meshes'
import type { WildlifeFrame } from './wildlife'
import { createMovingEffects } from './world-particles'
import type { LiftSite } from './worlds/starter/lift'

export function createGullFlock(meshes: MeshFactory, perches: readonly GullPerch[]) {
  const birds = perches.map((perch, index) => ({ perch, model: createGull(meshes, index), grounded: false }))
  const effects = createMovingEffects(meshes.scene)
  let previousTime = -Infinity
  return ({ time, weather, weatherAt, camera, seek }: WildlifeFrame) => {
    const continuous = !seek && time > previousTime && time - previousTime < .35
    previousTime = time
    effects.begin(time, camera, !seek)
    for (const [index, bird] of birds.entries()) {
      const { perch, model } = bird
      const visible = camera.y - perch.y < 118 && Math.hypot(camera.x - perch.x, camera.z - perch.z) < 126
      model.root.setEnabled(visible)
      if (!visible) {
        bird.grounded = false
        continue
      }
      const pose = gullAt(time, index, perch, weather, weatherAt)
      if (continuous && bird.grounded && pose.phase === 'Push-off') {
        effects.burst('takeoff-feathers', { x: pose.x, y: pose.y + .18, z: pose.z }, .91, .86, .27)
      }
      bird.grounded = pose.grounded
      model.pose(pose)
    }
    effects.finish()
  }
}

// Gulls circling in each working lift site. They fly high, so a pilot sees them from farther away
// than a walker sees the dock gulls.
export function createThermalGulls(meshes: MeshFactory, sites: readonly LiftSite[], firstIndex: number) {
  const birds = sites.flatMap((site, siteIndex) => Array.from({ length: gullsPerLift }, (_, index) =>
    ({ site, siteIndex, index, model: createGull(meshes, firstIndex + siteIndex * gullsPerLift + index) })))
  return ({ time, weather, weatherAt, camera }: WildlifeFrame) => {
    for (const { site, siteIndex, index, model } of birds) {
      const near = Math.hypot(camera.x - site.x, camera.z - site.z) < 150
      const pose = near ? thermalGullAt(time, siteIndex, site, index, weather, weatherAt) : null
      model.root.setEnabled(Boolean(pose))
      if (pose) model.pose(pose)
    }
  }
}
