import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector'
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { garment } from './crew-shapes'

type Profile = Parameters<typeof garment>[4]

export function createSwimArm(meshes: MeshFactory, root: TransformNode, arm: TransformNode,
  side: number, color: string, forearm: Profile) {
  // The inner rings stay inside the trunk. Successive rings turn with the arm,
  // keeping the shoulder and upper arm a continuous surface through the stroke.
  const sides = 20
  const profile: Profile = [
    ...forearm, [-.222, side * .037, -.018, .080, .090], [-.175, side * .018, -.024, .086, .095],
    [-.131, -side * .004, -.030, .091, .102], [-.089, -side * .026, -.034, .094, .111],
    [-.049, -side * .057, -.035, .094, .114], [-.012, -side * .085, -.032, .086, .101],
    [.023, -side * .114, -.031, .081, .093], [.042, -side * .148, -.033, .042, .054],
  ]
  const mesh = garment(meshes, root, 'Continuous swim shoulder and arm', color, profile, .93, sides)
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
  const entry = new Vector3(startX - side * .058, startY - .031, startZ)
  const entryTangent = new Vector3(side * .32, .074, .007)
  const travel = profile.map(([y]) => Math.min(1, (startY - y) / (startY - endY)))
  let lastX = NaN, lastZ = NaN

  function fitBridge(first: number, ring: number, t: number, pitch: number, roll: number) {
    // A single curve sets the shoulder line. Orient its sections to the curve
    // so raising the arm cannot fold the skin back into a wavy silhouette.
    const t2 = t * t, t3 = t2 * t
    entry.scaleToRef(2 * t3 - 3 * t2 + 1, center)
    entryTangent.scaleAndAddToRef(t3 - 2 * t2 + t, center)
    exit.scaleAndAddToRef(-2 * t3 + 3 * t2, center)
    exitTangent.scaleAndAddToRef(t3 - t2, center)
    entry.scaleToRef(6 * t2 - 6 * t, tangent)
    entryTangent.scaleAndAddToRef(3 * t2 - 4 * t + 1, tangent)
    exit.scaleAndAddToRef(-6 * t2 + 6 * t, tangent)
    exitTangent.scaleAndAddToRef(3 * t2 - 2 * t, tangent)
    tangent.normalize()
    Matrix.RotationYawPitchRollToRef(0, pitch * t, roll * t, matrix)
    Vector3.TransformNormalFromFloatsToRef(0, 0, 1, matrix, depth)
    Vector3.CrossToRef(depth, tangent, across).normalize()
    Vector3.CrossToRef(tangent, across, depth)
    const [, x, z] = profile[ring]
    for (let i = first; i < first + sides * 3; i += 3) {
      point.copyFrom(center)
      across.scaleAndAddToRef(rest[i] - x, point)
      depth.scaleAndAddToRef(rest[i + 2] - z, point)
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
    Vector3.TransformNormalFromFloatsToRef(0, -.195, 0, matrix, exitTangent)
    const rigidEnd = (forearm.length + 1) * sides * 3
    for (let i = 0; i < rigidEnd; i += 3) {
      Vector3.TransformCoordinatesFromFloatsToRef(rest[i], rest[i + 1], rest[i + 2], matrix, point)
      point.toArray(positions, i)
    }
    for (let ring = forearm.length + 1; ring < profile.length; ring++) {
      fitBridge(ring * sides * 3, ring, travel[ring], x, z)
    }
    VertexData.ComputeNormals(positions, indices, normals)
    mesh.updateVerticesData(VertexBuffer.PositionKind, positions, true)
    mesh.updateVerticesData(VertexBuffer.NormalKind, normals)
  }
  return { mesh, fitPose }
}
