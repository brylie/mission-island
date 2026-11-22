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
  const { arm, bulb, hood, pole } = streetLampGeometry
  const iron = '#4c584b'
  cylinder(x, y + pole.centreY, z, pole.topDiameter, pole.baseDiameter, pole.height, pole.segments, iron)
  box(x, y + arm.y, z + arm.z, ...arm.size, iron)
  cylinder(x, y + hood.y, z + bulb.z, hood.topDiameter, hood.baseDiameter, hood.height, hood.segments, iron)
  return sphere(x, y + bulb.y, z + bulb.z, ...bulb.size, globe, bulbs, false)
}
