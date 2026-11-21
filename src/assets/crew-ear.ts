import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { garment } from './crew-shapes'

// The upper ear tips back into the hairline and the small lobe rests against the cheek.
export function createCrewEar(meshes: MeshFactory, head: TransformNode, side: number, color: string) {
  return garment(meshes, head, 'Ear', color, [
    [0.133, side * 0.250, 0.021, 0.008, 0.011],
    [0.142, side * 0.256, 0.020, 0.023, 0.025],
    [0.158, side * 0.262, 0.016, 0.031, 0.033],
    [0.186, side * 0.266, 0.008, 0.035, 0.039],
    [0.212, side * 0.268, -0.001, 0.035, 0.041],
    [0.232, side * 0.267, -0.007, 0.029, 0.036],
    [0.245, side * 0.263, -0.010, 0.019, 0.025],
    [0.252, side * 0.260, -0.011, 0.007, 0.010],
  ], 1, 16)
}
