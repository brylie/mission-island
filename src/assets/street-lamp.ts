import type { Material } from '@babylonjs/core/Materials/material'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { streetLampGeometry } from './geometry/site-props'

export function createStreetLamp(
  { box, cylinder, sphere }: MeshFactory,
  { x, y, z }: { x: number, y: number, z: number },
  globe: Material,
  bulbs?: TransformNode,
) {
  const { bulb, pole } = streetLampGeometry
  const iron = '#4c584b'
  cylinder(x, y + pole.centreY, z, pole.topDiameter, pole.baseDiameter, pole.height, 8, iron)
  box(x, y + 2.71, z - 0.17, 0.1, 0.09, 0.42, iron)
  cylinder(x, y + 2.65, z + bulb.z, 0.21, 0.39, 0.15, 10, iron)
  return sphere(x, y + bulb.y, z + bulb.z, 0.24, 0.20, 0.24, globe, bulbs, false)
}
