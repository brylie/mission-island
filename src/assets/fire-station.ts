import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import type { Pose } from '../world'
import { fireStationGeometry } from './geometry/fire-station'

const half = 0.5

// The stand an extinguisher rests on. The extinguisher itself is a host item drawn with the other supplies.
export function createFireStation(meshes: MeshFactory, station: Pose, ground: number) {
  const { box } = meshes
  const root = new TransformNode('Fire station', meshes.scene)
  root.position.set(station.x, ground, station.z)
  root.rotation.y = station.heading
  const { plinth, plinthTrim, post, sign, signBand, signHead, hood } = fireStationGeometry
  box(0, plinth.height * half, 0, plinth.width, plinth.height, plinth.depth, plinth.color, root)
  box(0, plinth.height, 0, plinthTrim.width, plinthTrim.height, plinthTrim.depth, plinthTrim.color, root)
  box(0, post.height * half, post.z, post.width, post.height, post.depth, post.color, root)
  box(0, sign.y, sign.z, sign.width, sign.height, sign.depth, sign.color, root)
  const face = sign.z + (sign.depth + signBand.depth) * half
  box(0, signBand.y, face, signBand.width, signBand.height, signBand.depth, signBand.color, root)
  box(0, signHead.y, face, signHead.width, signHead.height, signBand.depth, signBand.color, root)
  box(signHead.width * half, signHead.y - signHead.height, face, signHead.nozzle, signHead.height * half, signBand.depth, signBand.color, root)
  const cover = box(0, hood.y, hood.z, hood.width, hood.height, hood.depth, hood.color, root)
  cover.rotation.x = hood.tilt
  meshes.batchModel(root)
  return root
}
