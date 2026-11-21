import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import type { Waypoint } from '../wayfinding'

export function createWayfindingOrbs({ scene, sphere, paint }: MeshFactory, name: string,
  color: string, diameter: number) {
  const root = new TransformNode(name, scene)
  const material = paint(color, true)
  const orbs: ReturnType<typeof sphere>[] = []
  function setPath(points: readonly Waypoint[]) {
    while (orbs.length < points.length) {
      orbs.push(sphere(0, 0, 0, diameter, diameter, diameter, material, root, false))
    }
    for (const [i, orb] of orbs.entries()) {
      const point = points[i]
      orb.setEnabled(Boolean(point))
      if (point) orb.position.set(point.x, point.y, point.z)
    }
  }
  return { setPath, setEnabled: (visible: boolean) => root.setEnabled(visible) }
}
