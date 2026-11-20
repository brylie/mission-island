import { createGull } from './assets/gull'
import { gullAt, type GullPerch } from './gull-flight'
import type { MeshFactory } from './island-meshes'
import type { WildlifeFrame } from './wildlife'

export function createGullFlock(meshes: MeshFactory, perches: readonly GullPerch[]) {
  const birds = perches.map((perch, index) => ({ perch, model: createGull(meshes, index) }))
  return ({ time, weather, weatherAt, camera }: WildlifeFrame) => {
    for (const [index, { perch, model }] of birds.entries()) {
      const visible = camera.y - perch.y < 118 && Math.hypot(camera.x - perch.x, camera.z - perch.z) < 126
      model.root.setEnabled(visible)
      if (visible) model.pose(gullAt(time, index, perch, weather, weatherAt))
    }
  }
}
