import { Bone } from '@babylonjs/core/Bones/bone.js'
import { Skeleton } from '@babylonjs/core/Bones/skeleton.js'
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer.js'
import { Axis, Space } from '@babylonjs/core/Maths/math.axis.js'
import { Matrix, Quaternion } from '@babylonjs/core/Maths/math.vector.js'
import { Mesh } from '@babylonjs/core/Meshes/mesh.js'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js'
import { crewShin, crewThigh } from '../crew-gait.ts'

// All leg garments are authored in the hip's local space. The same knee bends
// bare calves and trouser cloth. The ankle keeps the bottom of each shoe rigid.
const kneeHeight = -crewThigh
const ankleHeight = kneeHeight - crewShin

export function rigCrewKnee(hip: TransformNode) {
  const skeleton = new Skeleton('Leg', `crew-leg-${hip.uniqueId}`, hip.getScene())
  const thigh = new Bone('Thigh', skeleton)
  const shin = new Bone('Shin', skeleton, thigh, Matrix.Translation(0, kneeHeight, 0))
  const foot = new Bone('Foot', skeleton, shin, Matrix.Translation(0, -crewShin, 0))
  for (const mesh of hip.getChildMeshes(true)) {
    if (mesh instanceof Mesh) bindLegMesh(mesh, skeleton)
  }
  hip.onDisposeObservable.addOnce(() => skeleton.dispose())
  let angle = 0
  const ankle = Quaternion.Identity()
  const rest = Quaternion.Identity()
  function bend(target: number, blend: number) {
    const next = angle + (target - angle) * blend
    if (Math.abs(next - angle) < .00001) return
    angle = next
    shin.setAxisAngle(Axis.X, angle, Space.LOCAL)
  }
  function orientFoot(target: Quaternion, blend: number) {
    if (Quaternion.AreClose(ankle, target, .000001)) return
    Quaternion.SlerpToRef(ankle, target, blend, ankle)
    foot.setRotationQuaternion(ankle, Space.LOCAL)
  }
  return { bend, orientFoot, restFoot: (blend: number) => orientFoot(rest, blend), skeleton }
}

function flexAt(y: number, center: number, halfWidth: number) {
  const t = Math.max(0, Math.min(1, (center + halfWidth - y) / (2 * halfWidth)))
  return t * t * (3 - 2 * t)
}

export function bindLegMesh(mesh: Mesh, skeleton: Skeleton) {
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!
  const indices: number[] = [], weights: number[] = []
  for (let i = 1; i < positions.length; i += 3) {
    const y = positions[i]
    const knee = flexAt(y, kneeHeight, .078)
    const ankle = flexAt(y, ankleHeight, .036)
    indices.push(0, 1, 2, 0)
    weights.push(1 - knee, knee - ankle, ankle, 0)
  }
  mesh.setVerticesData(VertexBuffer.MatricesIndicesKind, indices)
  mesh.setVerticesData(VertexBuffer.MatricesWeightsKind, weights)
  mesh.numBoneInfluencers = 3
  mesh.skeleton = skeleton
}
