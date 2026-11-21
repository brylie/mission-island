import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { coastalProfile } from './coastal-profiles'

export function createOystercatcher(meshes: MeshFactory) {
  const root = new TransformNode('Oystercatcher', meshes.scene)
  const body = new TransformNode('Breast and mantle', meshes.scene)
  body.parent = root
  body.position.y = 0.215
  const ink = '#37454a', white = '#f1e8ce'
  coastalProfile(meshes, body, 'Pale belly', white, [
    [-0.21, 0.024, 0.012, 0.012],
    [-0.11, 0.028, 0.066, 0.043],
    [0.002, 0.02, 0.087, 0.077],
    [0.093, 0.036, 0.074, 0.078],
    [0.136, 0.064, 0.038, 0.041],
  ])
  const legs: TransformNode[] = []
  for (const side of [-1, 1]) {
    const wing = coastalProfile(meshes, body, 'Folded wing', ink, [
      [-0.245, 0.027, 0.002, 0.003],
      [-0.13, 0.043, 0.032, 0.027],
      [-0.02, 0.055, 0.054, 0.046],
      [0.05, 0.064, 0.041, 0.050],
      [0.081, 0.067, 0.014, 0.025],
      [0.087, 0.067, 0.002, 0.010],
    ])
    wing.position.x = side * 0.046
    wing.rotation.y = side * 0.14
    const leg = new TransformNode('Wader leg', meshes.scene)
    legs.push(leg)
    leg.parent = root
    leg.position.set(side * 0.042, 0.22, 0.013)
    meshes.cylinder(0, -0.105, 0, 0.014, 0.010, 0.22, 8, '#be806c', leg)
    for (const spread of [-0.52, 0, 0.52]) {
      const toe = meshes.sphere(0.018 * Math.sin(spread), -0.211, 0.029, 0.009, 0.010, 0.073, '#bd816e', leg, false, 3)
      toe.rotation.y = spread
    }
  }
  coastalProfile(meshes, body, 'Dark mantle and bib', ink, [
    [-0.17, 0.053, 0.006, 0.005],
    [-0.075, 0.071, 0.059, 0.023],
    [0.021, 0.078, 0.073, 0.041],
    [0.088, 0.069, 0.068, 0.059],
    [0.13, 0.057, 0.031, 0.050],
  ])
  const head = new TransformNode('Peck pivot', meshes.scene)
  head.parent = body
  head.position.set(0, 0.058, 0.075)
  coastalProfile(meshes, head, 'Dark hood', ink, [
    [-0.056, 0.034, 0.024, 0.036],
    [-0.032, 0.046, 0.050, 0.057],
    [0.002, 0.061, 0.061, 0.065],
    [0.032, 0.067, 0.061, 0.060],
    [0.059, 0.066, 0.046, 0.049],
    [0.079, 0.06, 0.023, 0.028],
    [0.086, 0.06, 0.010, 0.014],
  ])
  coastalProfile(meshes, head, 'Chisel bill', '#df783c', [
    [0.069, 0.059, 0.021, 0.022],
    [0.10, 0.055, 0.017, 0.014],
    [0.205, 0.049, 0.005, 0.007],
  ], 8)
  for (const side of [-1, 1]) {
    meshes.sphere(side * 0.054, 0.084, 0.038, 0.013, 0.025, 0.025, '#db9350', head, false, 5)
    meshes.sphere(side * 0.061, 0.084, 0.039, 0.007, 0.013, 0.013, '#202a2a', head, false, 5)
  }
  function pose(time: number, feeding: boolean, stride = 0) {
    for (const [i, leg] of legs.entries()) leg.rotation.x = Math.sin(time * 13 + i * Math.PI) * 0.44 * stride
    const dip = feeding ? Math.max(0, Math.sin(time * 2.2)) ** 3 : 0
    body.rotation.x = 0.08 + 0.84 * dip
    head.rotation.x = 0.78 * dip
    head.rotation.y = (1 - dip) * 0.19 * Math.sin(time * 1.4)
  }
  return { root, pose }
}
