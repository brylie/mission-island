import assert from 'node:assert/strict'
import test from 'node:test'
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer.js'
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js'
import { Mesh } from '@babylonjs/core/Meshes/mesh.js'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js'
import { Scene } from '@babylonjs/core/scene.js'
import { rigCrewKnee } from '../src/assets/crew-knee.ts'

test('swapping leg garments while seated preserves the knee and rigid shoe fitting', (t) => {
  const engine = new NullEngine(), scene = new Scene(engine)
  t.after(() => { scene.dispose(); engine.dispose() })
  const hip = new TransformNode('Hip', scene)
  const garments = ['Trouser leg', 'Bare calf'].map(name => {
    const mesh = new Mesh(name, scene)
    mesh.parent = hip
    mesh.setVerticesData(VertexBuffer.PositionKind, [0, -.10, 0, 0, -.305, 0, 0, -.53, 0])
    return mesh
  })
  const [trousers, calf] = garments
  calf.setEnabled(false)
  const pose = rigCrewKnee(hip)
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
  pose(0, .5)
  assert.ok(Math.abs(shin.getRotation().x - .525) < .00001)
  pose(0, 1)
  assert.ok(Math.abs(shin.getRotation().x) < .00001)
  hip.dispose()
  assert.equal(scene.skeletons.length, 0)
})
