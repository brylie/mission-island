import { createSchoolFish } from './assets/fish'
import { schoolSize } from './simulation/fish-school'
import type { MeshFactory } from './island-meshes'
import type { CoastalSchoolFrame } from './simulation/coastal-school'
import type { WildlifeFrame } from './wildlife'
import type { Point } from './world'

export function createCoastalFish(meshes: MeshFactory, origin: Point, waterLevel: number) {
  // Opaque fish write depth alongside the sand and hull before the translucent ocean draws.
  const paint = meshes.paint('#99c6aa')
  paint.backFaceCulling = false
  const bodies = Array.from({ length: schoolSize }, (_, id) => {
    const body = createSchoolFish(meshes, paint)
    body.setEnabled(false)
    body.scaling.setAll(0.87 + id % 4 * 0.08)
    body.position.y = waterLevel - 0.21 - 0.014 * (id % 3)
    return body
  })
  let visible = false
  return (frame: WildlifeFrame, school?: CoastalSchoolFrame) => {
    const near = Boolean(school) && frame.camera.y - waterLevel < 47
      && Math.hypot(frame.camera.x - origin.x, frame.camera.z - origin.z) < 75
    if (near && school) {
      const blend = visible && !frame.seek ? 1 - Math.exp(-24 * frame.delta) : 1
      for (const [id, fish] of school.fish.entries()) {
        const body = bodies[id]
        if (!visible) body.setEnabled(true)
        const heading = Math.PI / 2 - fish.heading
        body.rotation.y += Math.atan2(Math.sin(heading - body.rotation.y), Math.cos(heading - body.rotation.y)) * blend
        body.position.x += (fish.x - body.position.x) * blend
        body.position.z += (fish.z - body.position.z) * blend
      }
    }
    else if (visible) {
      for (const body of bodies) body.setEnabled(false)
    }
    visible = near
  }
}
