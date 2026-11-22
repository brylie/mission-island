import type { MeshFactory } from '../island-meshes'

export const fishingFloatRestHeight = 0.025

export function createFishingFloat({ sphere }: MeshFactory) {
  const diameter = 0.135
  return sphere(0, 0, 0, diameter, diameter, diameter, '#ff845e', undefined, false)
}
