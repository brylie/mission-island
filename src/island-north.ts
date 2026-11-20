import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { northernRegions } from './scenery'
import { distance } from './world'
import type { Point } from './world'
import type { MeshFactory } from './island-meshes'

export function createNorthernScenery(meshes: MeshFactory) {
  const zones = northernRegions.map((zone) => {
    const near = new TransformNode(zone.name + ' detail', meshes.scene)
    const far = new TransformNode(zone.name + ' silhouette', meshes.scene)
    for (const { x, y, z, size, angle, index, tree } of zone.props) {
      if (tree) {
        meshes.box(x, y + size, z, 0.2, size * 2, 0.23, '#675341', near, false)
        for (let layer = 0; layer < 3; layer++) {
          const width = (2.25 - layer * 0.43) * size
          meshes.sphere(x, y + (1.45 + layer * 0.68) * size, z, width, size * 1.38, width,
            zone.color, near, false, 4)
        }
        if (index % 2 === 0) meshes.sphere(x, y + size * 1.8, z, size * 1.7, size * 3.4, size * 1.7,
          zone.color, far, false, 3)
      } else {
        const rock = meshes.sphere(x, y + size * 0.27, z, size * 2.3, size, size * 1.6,
          zone.color, near, false, 4)
        rock.rotation.y = angle
        if (index % 3 === 0) meshes.sphere(x, y + size * 0.24, z, size * 2, size, size * 1.5,
          zone.color, far, false, 3)
      }
    }

    return { ...zone, near, far }
  })

  return {
    update(camera: Point, close: boolean) {
      for (const zone of zones) {
        const range = distance(camera, zone.at)
        const detailed = close && range < 66
        zone.near.setEnabled(detailed)
        zone.far.setEnabled(!detailed && (!close || range < 146))
      }
    },
  }
}
