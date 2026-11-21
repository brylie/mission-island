import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { garment } from './crew-shapes'

// The upper ear tips back into the hairline and the small lobe rests against the cheek.
export function createCrewEar(meshes: MeshFactory, head: TransformNode, side: number, color: string) {
  return garment(meshes, head, 'Ear', color, [
    [.133, side * .250, .021, .008, .011],
    [.142, side * .256, .020, .023, .025],
    [.158, side * .262, .016, .031, .033],
    [.186, side * .266, .008, .035, .039],
    [.212, side * .268, -.001, .035, .041],
    [.232, side * .267, -.007, .029, .036],
    [.245, side * .263, -.010, .019, .025],
    [.252, side * .260, -.011, .007, .010],
  ], 1, 16)
}
