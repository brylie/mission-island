import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector'
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { garment } from './crew-shapes'

import { swimShoulder } from './geometry/crew-swim-arm'

type Profile = Parameters<typeof garment>[4]

const coordinatesPerVertex = 3
const depthCoordinate = 2

// Cubic Hermite basis and its derivative for the shoulder centerline.
const endpointCubicWeight = 2
const endpointSquareWeight = 3
const tangentSquareWeight = 2
const endpointDerivativeWeight = 6
const tangentDerivativeWeight = 3
const entryTangentDerivativeWeight = 4
const exitTangentDerivativeWeight = 2

export function createSwimArm(meshes: MeshFactory, root: TransformNode, arm: TransformNode, side: number, color: string, forearm: Profile) {
  // The inner rings stay inside the trunk. Successive rings turn with the arm,
  // keeping the shoulder and upper arm a continuous surface through the stroke.
  const { sides, rings, entry: neck } = swimShoulder
  const shoulder: Profile = rings.map(([y, x, z, halfWidth, halfDepth]) => [y, side * x, z, halfWidth, halfDepth])
  const profile: Profile = [...forearm, ...shoulder]
  const mesh = garment(meshes, root, 'Continuous swim shoulder and arm', color, profile, swimShoulder.softness, sides)
  mesh.position.copyFrom(arm.position)
  const rest = mesh.getVerticesData(VertexBuffer.PositionKind)!
  const positions = Array.from(rest), normals = Array.from(mesh.getVerticesData(VertexBuffer.NormalKind)!)
  const indices = mesh.getIndices()!
  mesh.setVerticesData(VertexBuffer.PositionKind, positions, true)
  mesh.setVerticesData(VertexBuffer.NormalKind, normals, true)
  const matrix = Matrix.Identity(), point = Vector3.Zero()
  const center = Vector3.Zero(), across = Vector3.Zero(), depth = Vector3.Zero(), tangent = Vector3.Zero()
  const exit = Vector3.Zero(), exitTangent = Vector3.Zero()
  const [endY, endX, endZ] = profile[forearm.length]
  const [startY, startX, startZ] = profile[profile.length - 1]
  const entry = new Vector3(startX - side * neck.sideShift, startY - neck.drop, startZ)
  const entryTangent = new Vector3(side * neck.tangent[0], neck.tangent[1], neck.tangent[2])
  const travel = profile.map(([y]) => Math.min(1, (startY - y) / (startY - endY)))
  let lastX = NaN, lastZ = NaN

  function fitBridge(first: number, ring: number, t: number, pitch: number, roll: number) {
    // A single curve sets the shoulder line. Orient its sections to the curve
    // so raising the arm cannot fold the skin back into a wavy silhouette.
    const t2 = t * t, t3 = t2 * t
    entry.scaleToRef(endpointCubicWeight * t3 - endpointSquareWeight * t2 + 1, center)
    entryTangent.scaleAndAddToRef(t3 - tangentSquareWeight * t2 + t, center)
    exit.scaleAndAddToRef(-endpointCubicWeight * t3 + endpointSquareWeight * t2, center)
    exitTangent.scaleAndAddToRef(t3 - t2, center)
    entry.scaleToRef(endpointDerivativeWeight * t2 - endpointDerivativeWeight * t, tangent)
    entryTangent.scaleAndAddToRef(tangentDerivativeWeight * t2 - entryTangentDerivativeWeight * t + 1, tangent)
    exit.scaleAndAddToRef(-endpointDerivativeWeight * t2 + endpointDerivativeWeight * t, tangent)
    exitTangent.scaleAndAddToRef(tangentDerivativeWeight * t2 - exitTangentDerivativeWeight * t, tangent)
    tangent.normalize()
    Matrix.RotationYawPitchRollToRef(0, pitch * t, roll * t, matrix)
    Vector3.TransformNormalFromFloatsToRef(0, 0, 1, matrix, depth)
    Vector3.CrossToRef(depth, tangent, across).normalize()
    Vector3.CrossToRef(tangent, across, depth)
    const [, x, z] = profile[ring]
    for (let i = first; i < first + sides * coordinatesPerVertex; i += coordinatesPerVertex) {
      point.copyFrom(center)
      across.scaleAndAddToRef(rest[i] - x, point)
      depth.scaleAndAddToRef(rest[i + depthCoordinate] - z, point)
      point.toArray(positions, i)
    }
  }

  function fitPose() {
    const { x, z } = arm.rotation
    if (!mesh.isEnabled() || (x === lastX && z === lastZ)) return
    lastX = x
    lastZ = z
    Matrix.RotationYawPitchRollToRef(0, x, z, matrix)
    Vector3.TransformCoordinatesFromFloatsToRef(endX, endY, endZ, matrix, exit)
    Vector3.TransformNormalFromFloatsToRef(0, swimShoulder.exitTangentY, 0, matrix, exitTangent)
    const rigidEnd = (forearm.length + 1) * sides * coordinatesPerVertex
    for (let i = 0; i < rigidEnd; i += coordinatesPerVertex) {
      Vector3.TransformCoordinatesFromFloatsToRef(rest[i], rest[i + 1], rest[i + depthCoordinate], matrix, point)
      point.toArray(positions, i)
    }
    for (let ring = forearm.length + 1; ring < profile.length; ring++) {
      fitBridge(ring * sides * coordinatesPerVertex, ring, travel[ring], x, z)
    }
    VertexData.ComputeNormals(positions, indices, normals)
    mesh.updateVerticesData(VertexBuffer.PositionKind, positions, true)
    mesh.updateVerticesData(VertexBuffer.NormalKind, normals)
  }
  return { mesh, fitPose }
}
