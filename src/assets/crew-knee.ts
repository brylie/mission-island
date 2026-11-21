import { Bone } from '@babylonjs/core/Bones/bone.js'
import { Skeleton } from '@babylonjs/core/Bones/skeleton.js'
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer.js'
import { Axis, Space } from '@babylonjs/core/Maths/math.axis.js'
import { Matrix } from '@babylonjs/core/Maths/math.vector.js'
import { Mesh } from '@babylonjs/core/Meshes/mesh.js'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js'

// All leg garments are authored in the hip's local space. The same knee bends
// bare calves and trouser cloth, while shoes below the joint remain rigid.
export function rigCrewKnee(hip: TransformNode) {
  const height = -.305
  const skeleton = new Skeleton('Leg', `crew-leg-${hip.uniqueId}`, hip.getScene())
  const thigh = new Bone('Thigh', skeleton)
  const shin = new Bone('Shin', skeleton, thigh, Matrix.Translation(0, height, 0))
  for (const mesh of hip.getChildMeshes(true)) {
    if (!(mesh instanceof Mesh)) continue
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!
    const indices: number[] = [], weights: number[] = []
    for (let i = 1; i < positions.length; i += 3) {
      const t = Math.max(0, Math.min(1, (height + .078 - positions[i]) / .156))
      const flex = t * t * (3 - 2 * t)
      indices.push(0, 1, 0, 0)
      weights.push(1 - flex, flex, 0, 0)
    }
    mesh.setVerticesData(VertexBuffer.MatricesIndicesKind, indices)
    mesh.setVerticesData(VertexBuffer.MatricesWeightsKind, weights)
    mesh.numBoneInfluencers = 2
    mesh.skeleton = skeleton
  }
  hip.onDisposeObservable.addOnce(() => skeleton.dispose())
  let angle = 0
  return (target: number, blend: number) => {
    const next = angle + (target - angle) * blend
    if (Math.abs(next - angle) < .00001) return
    angle = next
    shin.setAxisAngle(Axis.X, angle, Space.LOCAL)
  }
}
