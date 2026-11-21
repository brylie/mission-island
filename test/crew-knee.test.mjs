import assert from 'node:assert/strict'
import test from 'node:test'
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer.js'
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js'
import { Mesh } from '@babylonjs/core/Meshes/mesh.js'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js'
import { Scene } from '@babylonjs/core/scene.js'
import { bindLegMesh, rigCrewKnee } from '../src/assets/crew-knee.ts'

test('swapping leg garments while seated preserves the knee and rigid shoe fitting', (t) => {
  const engine = new NullEngine(), scene = new Scene(engine)
  t.after(() => { scene.dispose(); engine.dispose() })
  const hip = new TransformNode('Hip', scene)
  const garments = ['Trouser leg', 'Bare calf'].map(name => {
    const mesh = new Mesh(name, scene)
    mesh.parent = hip
    mesh.setVerticesData(VertexBuffer.PositionKind, [0, -.10, 0, 0, -.305, 0, 0, -.45, 0])
    return mesh
  })
  const [trousers, calf] = garments
  calf.setEnabled(false)
  const { bend: pose, skeleton } = rigCrewKnee(hip)
  assert.equal(trousers.skeleton, calf.skeleton)
  for (const mesh of garments) {
    const weights = mesh.getVerticesData(VertexBuffer.MatricesWeightsKind)
    assert.equal(weights[0], 1)
    assert.ok(Math.abs(weights[5] - .5) < .00001)
    assert.equal(weights[9], 1)
  }
  const shin = trousers.skeleton.bones[1]
  pose(1.05, 1)
  trousers.setEnabled(false)
  calf.setEnabled(true)
  assert.ok(Math.abs(shin.getRotation().x - 1.05) < .00001)
  const boot = new Mesh('Purchased boot', scene)
  const attachment = new TransformNode('Footwear fitting', scene)
  attachment.parent = hip
  boot.parent = attachment
  boot.setVerticesData(VertexBuffer.PositionKind, [0, -.66, 0])
  bindLegMesh(boot, skeleton)
  assert.equal(boot.skeleton, calf.skeleton)
  assert.deepEqual([...boot.getVerticesData(VertexBuffer.MatricesWeightsKind)], [0, 0, 1, 0])
  attachment.dispose()
  assert.ok(scene.skeletons.includes(skeleton))
  pose(0, .5)
  assert.ok(Math.abs(shin.getRotation().x - .525) < .00001)
  pose(0, 1)
  assert.ok(Math.abs(shin.getRotation().x) < .00001)
  hip.dispose()
  assert.equal(scene.skeletons.length, 0)
})

test('the supporting knee extends as the planted boot rolls from heel to toe', async t => {
  const { Vector3 } = await import('@babylonjs/core/Maths/math.vector.js')
  const { fitCrewGait } = await import('../src/assets/crew-gait-pose.ts')
  const { crewGaitPreview, crewHip } = await import('../src/crew-gait.ts')
  const engine = new NullEngine(), scene = new Scene(engine)
  t.after(() => { scene.dispose(); engine.dispose() })
  const root = new TransformNode('walker', scene), body = new TransformNode('pelvis', scene)
  body.parent = root
  const legs = [-1, 1].map(side => {
    const leg = new TransformNode('hip', scene)
    leg.parent = body
    leg.position.set(side * crewHip.x, crewHip.y, crewHip.z)
    return leg
  })
  const knees = legs.map(rigCrewKnee)
  const speed = 8, frame = crewGaitPreview(0, speed, 1)
  for (const [stance, edge] of [[0, -.13], [.25, -.13], [.45, -.13], [.7, .215], [.99, .215]]) {
    const time = stance * frame.contact / speed
    root.position.z = time * speed
    const gait = crewGaitPreview(time, speed, 1)
    for (const foot of gait.feet) foot.z += root.position.z
    fitCrewGait({ root, body, legs, knees }, gait)
    const skeleton = knees[0].skeleton
    skeleton.computeAbsoluteMatrices(true)
    const boot = skeleton.bones[2].getAbsoluteMatrix()
    const shoePoint = z => Vector3.TransformCoordinates(
      Vector3.TransformCoordinates(new Vector3(0, -.15, z), boot), legs[0].computeWorldMatrix(true))
    const pivot = shoePoint(edge)
    assert.ok(Math.abs(pivot.y) < .001)
    assert.ok(Math.abs(pivot.z - (crewHip.z + frame.contact / 2 + edge)) < .001)
    assert.ok(skeleton.bones[1].getRotation().x < .22)
    if (stance === 0) assert.ok(shoePoint(.215).y > .07)
    if (stance === .99) assert.ok(shoePoint(-.13).y > .10)
  }
})
