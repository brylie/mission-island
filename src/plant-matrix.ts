import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js'
import type { TreeTemplateOptions } from './assets/trees/tree-catalog.ts'
import { treeCollision } from './assets/trees/tree-collision.ts'
import { plantSeat } from './plant-seat.ts'
import { onRoadsChange } from './roads.ts'
import { logRise, plantTemplateOptions, type Planting } from './worlds/starter/highwood-planting.ts'

// Where each Highwood plant's template is drawn: scaled and turned, a shrub sheared to lie on its
// slope, then moved to its seat (plant-seat.ts). Seating a plant asks the ground in many places,
// so each plant's matrix is worked out once and kept until the roads change.

// A transform matrix's rows for the x and z axes.
const xRow = 0, zRow = 2

// A fallen log tilts to follow the ground from its root to its far end, as the walking solids do.
function logTilt(plant: Planting) {
  const collision = treeCollision(plantTemplateOptions(plant, 'near') as TreeTemplateOptions)
  return collision.shape === 'lying' ? Math.atan(logRise(plant, collision.length * plant.scale)) : 0
}

let matrices = new WeakMap<Planting, Matrix>()
onRoadsChange(() => {
  matrices = new WeakMap()
})

export function plantMatrix(plant: Planting) {
  const kept = matrices.get(plant)
  if (kept) return kept
  const { y, slope } = plantSeat(plant)
  const placed = Matrix.Compose(new Vector3(plant.scale, plant.scale, plant.scale), Quaternion.RotationYawPitchRoll(plant.heading, 0, logTilt(plant)), Vector3.Zero())
  // Rows transform row vectors: a point's height rises by x·slope.x + z·slope.z.
  const shear = Matrix.Identity()
  shear.setRowFromFloats(xRow, 1, slope.x, 0, 0)
  shear.setRowFromFloats(zRow, 0, slope.z, 1, 0)
  const matrix = placed.multiply(shear).multiply(Matrix.Translation(plant.x, y, plant.z))
  matrices.set(plant, matrix)
  return matrix
}

// The matrix that carries a plant's normals: the inverse transpose, so a sheared shrub's faces
// are lit as they now lean, not as the shear drags them.
export function plantNormalMatrix(plant: Planting) {
  return plantMatrix(plant).clone().invert().transpose()
}
