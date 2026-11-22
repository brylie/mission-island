import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import type { buildings } from '../world'
import { houseRoofRise, starterHouseModel } from './geometry/starter-house'

const half = 0.5
const sides = [-1, 1] as const

export function createHouse(meshes: MeshFactory, building: typeof buildings[number]) {
  const { scene, box, surface, shadows, paintSurface } = meshes
  const root = new TransformNode('House', scene)
  const { x, z, w, d, h, wall } = building
  root.position.set(x, 0, z)
  root.rotation.y = building.heading ?? 0

  const { roof, foundation, door, windows, chimney } = starterHouseModel
  const { frame, glazing, mullion } = windows
  const frontWall = -d * half

  function buildRoof() {
    const { slope, fascia, gable, ridge } = roof
    const left = -w * half - roof.sideOverhang
    const right = w * half + roof.sideOverhang
    const front = frontWall - roof.depthOverhang
    const back = d * half + roof.depthOverhang
    const top = h + houseRoofRise
    const width = right - left
    const rise = top - h
    for (const [edge, side] of [[front, -1], [back, 1]]) {
      const length = Math.hypot(edge, rise)
      // Recess one slope where the two slabs meet under the ridge cap.
      const slab = box(0, (h + top) * half, edge * half, width - (side > 0 ? slope.endRecess : 0), slope.thickness, length, building.roof, root)
      slab.rotation.x = side * Math.atan2(rise, Math.abs(edge))
      const trim = box(0, h + fascia.rise, edge, width + fascia.widthAllowance, fascia.height, fascia.depth, building.roof, root)
      trim.position.z += side * fascia.setback
    }
    const insetLeft = left + gable.inset, insetRight = right - gable.inset
    const ends = surface('Gables', [
      [insetLeft, h, front],
      [insetLeft, h, back],
      [insetLeft, top, 0],
      [insetRight, h, front],
      [insetRight, top, 0],
      [insetRight, h, back],
    ].flat(), [...gable.triangles], wall, root)
    shadows.addShadowCaster(ends, false)
    box(0, top + ridge.rise, 0, width + ridge.widthAllowance, ridge.height, ridge.depth, building.roof, root)
  }

  box(0, foundation.centerY, 0, w + foundation.edgeAllowance, foundation.height, d + foundation.edgeAllowance, paintSurface('concrete'), root)
  box(0, h * half, 0, w, h, d, wall, root)
  buildRoof()
  box(0, door.centerY, frontWall - door.outset, ...door.size, door.color, root)
  for (const side of sides) {
    const windowX = side * w * windows.sideFraction, windowY = h * windows.heightRatio
    box(windowX, windowY, frontWall - frame.outset, ...frame.size, frame.color, root)
    box(windowX, windowY, frontWall - glazing.outset, ...glazing.size, glazing.color, root)
    box(windowX, windowY, frontWall - mullion.outset, ...mullion.size, mullion.color, root)
  }
  if (w > chimney.houseMinimumWidth) box(w * chimney.xRatio, h + chimney.rise, chimney.z, ...chimney.size, chimney.color, root)
  return root
}
