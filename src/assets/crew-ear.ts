import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { garment } from './crew-shapes'
import { crewEar } from './geometry/crew-face'

// The upper ear tips back into the hairline and the small lobe rests against the cheek.
export function createCrewEar(meshes: MeshFactory, head: TransformNode, side: number, color: string) {
  const contour: Parameters<typeof garment>[4] = crewEar.contour.map(([y, x, z, width, depth]) => [y, side * x, z, width, depth])
  return garment(meshes, head, 'Ear', color, contour, crewEar.softness, crewEar.sides)
}
