import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import type { buildings } from '../world'
import { houseRoofRise, starterHouseModel } from './geometry/starter-house'

const half = 0.5
const sides = [-1, 1] as const

export function createHouse(meshes: MeshFactory, building: typeof buildings[number], household?: { rearEntrance?: boolean }) {
  const { scene, box, surface, shadows, paintSurface } = meshes
  const root = new TransformNode('House', scene)
  const { x, z, w, d, h, wall } = building
  root.position.set(x, 0, z)
  root.rotation.y = building.heading ?? 0
  // Occupied panes switch material independently of the batched exterior.
  const lightable = household ? new TransformNode('Household windows', scene) : undefined
  lightable?.position.copyFrom(root.position)
  lightable?.rotation.copyFrom(root.rotation)

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
  if (household?.rearEntrance) box(0, door.centerY, -frontWall + door.outset, ...door.size, door.color, root)
  const windowY = h * windows.heightRatio
  const windowWalls = household?.rearEntrance ? sides : [-1] as const
  const panes = windowWalls.flatMap((facing) => sides.map((side) => {
    const windowX = side * w * windows.sideFraction
    const wallZ = facing * d * half
    box(windowX, windowY, wallZ + facing * frame.outset, ...frame.size, frame.color, root)
    box(windowX, windowY, wallZ + facing * mullion.outset, ...mullion.size, mullion.color, root)
    return box(windowX, windowY, wallZ + facing * glazing.outset, ...glazing.size, glazing.color, lightable ?? root, !lightable)
  }))
  if (lightable) {
    const sideWall = w * half
    const [frameWidth, frameHeight, frameDepth] = frame.size
    const [paneWidth, paneHeight, paneDepth] = glazing.size
    const [mullionWidth, mullionHeight, mullionDepth] = mullion.size
    for (const side of sides) {
      box(side * (sideWall + frame.outset), windowY, 0, frameDepth, frameHeight, frameWidth, frame.color, root)
      box(side * (sideWall + mullion.outset), windowY, 0, mullionDepth, mullionHeight, mullionWidth, mullion.color, root)
      panes.push(box(side * (sideWall + glazing.outset), windowY, 0, paneDepth, paneHeight, paneWidth, glazing.color, lightable, false))
    }
  }
  if (w > chimney.houseMinimumWidth) box(w * chimney.xRatio, h + chimney.rise, chimney.z, ...chimney.size, chimney.color, root)
  let lit = false
  return {
    root,
    showWindows: (next: boolean) => {
      if (!lightable || lit === next) return
      lit = next
      const material = lit ? meshes.paint(glazing.litColor, true) : meshes.paint(glazing.color)
      for (const pane of panes) pane.material = material
    },
  }
}
