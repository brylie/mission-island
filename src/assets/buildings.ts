import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { houseRoofRise } from '../world'
import type { buildings } from '../world'

const cream = '#fff3d0'

export function createHouse(meshes: MeshFactory, building: typeof buildings[number]) {
  const { scene, box, surface, shadows, paintSurface } = meshes
  const root = new TransformNode('House', scene)
  const { x, z, w, d, h, wall } = building
  root.position.set(x, 0, z)
  root.rotation.y = 'heading' in building ? building.heading ?? 0 : 0

  function roof() {
    const { w, d, h, roof: color } = building
    const left = -w / 2 - 0.35
    const right = w / 2 + 0.35
    const front = -d / 2 - 0.3
    const back = d / 2 + 0.3
    const top = h + houseRoofRise
    for (const [edge, tilt, sign] of [[front, -1, -1], [back, 1, 1]]) {
      const length = Math.hypot(edge, top - h)
      // The slopes overlap under the ridge cap. Recess one end face so they can share that joint.
      const slab = box(0, (h + top) / 2, edge / 2, right - left - (sign > 0 ? 0.025 : 0), 0.19, length, color, root)
      slab.rotation.x = tilt * Math.atan2(top - h, Math.abs(edge))
      const ridge = box(0, h + 0.06, edge, right - left + 0.1, 0.16, 0.16, color, root)
      ridge.position.z += sign * 0.03
    }
    const gable = surface('Gables', [
      left + 0.22, h, front, left + 0.22, h, back, left + 0.22, top, 0,
      right - 0.22, h, front, right - 0.22, top, 0, right - 0.22, h, back,
    ], [0, 2, 1, 3, 5, 4], building.wall, root)
    shadows.addShadowCaster(gable, false)
    box(0, top + 0.01, 0, right - left + 0.07, 0.14, 0.17, color, root)
  }

  box(0, 0.12, 0, w + 0.35, 0.25, d + 0.35, paintSurface('concrete'), root)
  box(0, h / 2, 0, w, h, d, wall, root)
  roof()
  box(0, 1.25, -d / 2 - 0.04, 1.26, 2.48, 0.13, '#395951', root)
  for (const sign of [-1, 1]) {
    box(sign * w * 0.31, h * 0.61, -d / 2 - 0.04, 1.24, 1.03, 0.15, cream, root)
    box(sign * w * 0.31, h * 0.61, -d / 2 - 0.13, 0.96, 0.77, 0.06, '#4c7a83', root)
    box(sign * w * 0.31, h * 0.61, -d / 2 - 0.17, 0.075, 0.8, 0.045, cream, root)
  }
  if (w > 5) box(w * 0.26, h + 1.08, 0.6, 0.55, 1.55, 0.52, '#925c4b', root)
  return root
}
