import type { MeshFactory } from '../island-meshes'
import { createHouse } from './buildings'

// The net dries on the sunny gable. Both families of diagonal strands end at the timber frame.
export function createNetShed(meshes: MeshFactory) {
  const root = createHouse(meshes, { x: 0, z: 0, w: 3.9, d: 3.0, h: 2.65, wall: '#ae634d', roof: '#496661' })
  root.name = 'Harbor net shed'
  const { box, cylinder, sphere } = meshes
  const timber = '#ba946a'
  for (const z of [-1.42, 1.42]) {
    box(2.36, 1.03, z, 0.105, 2.06, 0.105, timber, root)
    box(2.13, 1.88, z, 0.52, 0.10, 0.13, '#775d49', root)
  }
  const x = 2.36, bottom = 0.49, height = 1.16, width = 2.8
  for (const y of [bottom, bottom + height]) box(x, y, 0, 0.081, 0.083, width + 0.13, timber, root)
  for (const slope of [-1, 1]) {
    for (let start = -height; start < width; start += 0.32) {
      const z0 = Math.max(0, start), z1 = Math.min(width, start + height)
      if (z1 <= z0) continue
      const z = (z0 + z1) / 2
      const twine = cylinder(x + slope * 0.008, bottom + z - start, slope * (z - width / 2), 0.017, 0.017, (z1 - z0) * Math.SQRT2, 5, '#697b68', root, false)
      twine.rotation.x = slope * Math.PI / 4
    }
  }
  for (let i = 0; i < 7; i++) {
    const z = -0.99 + i * 0.33
    const cork = sphere(x + 0.033, bottom + height - 0.045, z, 0.115, 0.15, 0.12, '#dba269', root, true, 4)
    cork.rotation.x = 0.17 * Math.sin(i)
  }
  // The overhanging verge shelters the gable. Boards break up the wall where the net hangs.
  for (let i = -3; i <= 3; i++) box(1.968, 1.40, i * 0.39, 0.044, 2.37, 0.045, '#bb7359', root)
  // A high slatted vent marks the dry loft from the water.
  box(2.092, 2.90, 0, 0.052, 0.45, 0.64, '#425553', root)
  for (const y of [2.78, 2.89, 3.00]) box(2.129, y, 0, 0.071, 0.048, 0.57, timber, root)
}
