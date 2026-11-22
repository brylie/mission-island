import type { MeshFactory } from '../island-meshes'
import { createShorebird } from './shorebird'
import { oystercatcherGeometry } from './geometry/oystercatcher'

export function createOystercatcher(meshes: MeshFactory) {
  return createShorebird(meshes, 'Oystercatcher', oystercatcherGeometry)
}
