import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { northernRockGeometry, northernTreeGeometry } from './assets/geometry/starter-scenery'
import { northernRegions } from './scenery'
import { distance } from './world'
import type { Point } from './world'
import type { MeshFactory } from './island-meshes'

const detailDistance = 66
const closeSilhouetteDistance = 146

export function createNorthernScenery(meshes: MeshFactory) {
  const zones = northernRegions.map((zone) => {
    const near = new TransformNode(zone.name + ' detail', meshes.scene)
    const far = new TransformNode(zone.name + ' silhouette', meshes.scene)
    for (const { x, y, z, size, angle, index, tree } of zone.props) {
      if (tree) {
        const { trunkWidth, trunkDepth, trunkHeightRatio, trunkColor, crown, silhouette } = northernTreeGeometry
        meshes.box(x, y + size, z, trunkWidth, size * trunkHeightRatio, trunkDepth, trunkColor, near, false)
        for (let layer = 0; layer < crown.layers; layer++) {
          const width = (crown.baseWidth - layer * crown.widthStep) * size
          meshes.sphere(x, y + (crown.baseY + layer * crown.rise) * size, z, width, size * crown.height, width, zone.color, near, false, crown.segments)
        }
        if (index % silhouette.every === 0) meshes.sphere(x, y + size * silhouette.y, z, size * silhouette.width, size * silhouette.height, size * silhouette.width, zone.color, far, false, silhouette.segments)
      }
      else {
        const { centerHeightRatio, widthRatio, depthRatio, silhouette, segments } = northernRockGeometry
        const rock = meshes.sphere(x, y + size * centerHeightRatio, z, size * widthRatio, size, size * depthRatio, zone.color, near, false, segments)
        rock.rotation.y = angle
        if (index % silhouette.every === 0) meshes.sphere(x, y + size * silhouette.y, z, size * silhouette.width, size, size * silhouette.depth, zone.color, far, false, silhouette.segments)
      }
    }

    return { ...zone, near, far }
  })

  return {
    update(camera: Point, close: boolean) {
      for (const zone of zones) {
        const range = distance(camera, zone.at)
        const detailed = close && range < detailDistance
        zone.near.setEnabled(detailed)
        zone.far.setEnabled(!detailed && (!close || range < closeSilhouetteDistance))
      }
    },
  }
}
