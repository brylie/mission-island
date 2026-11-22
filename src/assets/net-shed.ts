import type { MeshFactory } from '../island-meshes'
import { createHouse } from './buildings'
import { netDryingFrame, netShedGable, netShedHouse } from './geometry/net-shed'

const half = 0.5
const quarter = 0.25
const twineAngle = Math.PI * quarter

// The net dries on the sunny gable. Both families of diagonal strands end at the timber frame.
export function createNetShed(meshes: MeshFactory) {
  const { root } = createHouse(meshes, netShedHouse)
  root.name = 'Harbor net shed'
  const { box, cylinder, sphere } = meshes
  const { x, bottom, height, width, timber, posts, braces, rails, twine, corks } = netDryingFrame
  for (const z of posts.z) {
    box(x, posts.y, z, ...posts.size, timber, root)
    box(braces.x, braces.y, z, ...braces.size, braces.finish, root)
  }
  for (const y of [bottom, bottom + height]) box(x, y, 0, rails.thickness, rails.height, width + rails.lengthOverhang, timber, root)
  for (const slope of [-1, 1]) {
    for (let start = -height; start < width; start += twine.spacing) {
      const z0 = Math.max(0, start), z1 = Math.min(width, start + height)
      if (z1 <= z0) continue
      const z = (z0 + z1) * half
      const strand = cylinder(x + slope * twine.faceOffset, bottom + z - start, slope * (z - width * half), twine.diameter, twine.diameter, (z1 - z0) * Math.SQRT2, twine.segments, twine.finish, root, false)
      strand.rotation.x = slope * twineAngle
    }
  }
  for (let i = 0; i < corks.count; i++) {
    const z = corks.firstZ + i * corks.spacing
    const cork = sphere(x + corks.faceOffset, bottom + height - corks.drop, z, ...corks.size, corks.finish, root, true, corks.segments)
    cork.rotation.x = corks.tilt * Math.sin(i)
  }
  const { boards, vent } = netShedGable
  // The overhanging verge shelters the gable. Boards break up the wall where the net hangs.
  for (let i = boards.first; i <= boards.last; i++) box(boards.x, boards.y, i * boards.spacing, ...boards.size, boards.finish, root)
  // A high slatted vent marks the dry loft from the water.
  box(...vent.backing, vent.finish, root)
  for (const y of vent.slats.y) box(vent.slats.x, y, 0, ...vent.slats.size, timber, root)
}
