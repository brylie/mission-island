import { createWayfindingSign } from '../assets/wayfinding-sign'
import type { MeshFactory } from '../island-meshes'
import { wayfindingSigns } from '../worlds/saltwind/layout/signs'
import { groundHeight } from './terrain'

export function buildSigns(meshes: MeshFactory) {
  for (const { x, z, name, heading } of wayfindingSigns) {
    createWayfindingSign(meshes, name, { x, y: groundHeight(x, z), z, heading })
  }
}
