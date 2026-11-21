import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { coastalProfile } from './coastal-profiles'

export function createDockTug(meshes: MeshFactory) {
  const { scene, box, cylinder } = meshes
  const root = new TransformNode('Three-wheel dock tug', scene)
  const green = '#498477', cream = '#e5cd97', rubber = '#333d3e', iron = '#526260'
  box(0, 0.42, -0.09, 1.04, 0.16, 1.91, iron, root)
  box(0, 0.60, -0.67, 1.26, 0.27, 1.03, green, root)
  box(0, 0.766, -0.67, 1.29, 0.068, 1.06, '#b8966a', root)
  for (const x of [-0.62, 0.62]) box(x, 0.87, -0.655, 0.064, 0.16, 1.05, green, root)
  box(0, 0.87, -1.177, 1.282, 0.162, 0.082, green, root)
  box(0, 0.89, -0.16, 1.19, 0.22, 0.065, green, root)
  // An open driver's step separates the low load deck and the rounded nose.
  box(0, 0.50, 0.30, 0.99, 0.08, 0.81, '#85765e', root)
  box(0, 0.67, 0.01, 0.53, 0.27, 0.35, green, root)
  box(0, 0.83, 0.02, 0.59, 0.105, 0.43, '#594f43', root)
  box(0, 0.99, -0.155, 0.57, 0.29, 0.085, '#685647', root).rotation.x = -0.11
  coastalProfile(meshes, root, 'Enamel motor bonnet', green, [
    [0.59, 0.76, 0.43, 0.26],
    [0.76, 0.76, 0.50, 0.27],
    [0.98, 0.74, 0.49, 0.22],
    [1.11, 0.71, 0.45, 0.17],
    [1.14, 0.71, 0.39, 0.14],
  ], 16, 0.46)
  box(0, 0.54, 1.15, 0.91, 0.084, 0.12, cream, root)
  for (const y of [0.65, 0.69, 0.73]) box(0, y, 1.146, 0.29, 0.014, 0.017, iron, root)
  for (const x of [-0.52, 0.52]) {
    box(x, 0.67, -1.196, 0.17, 0.075, 0.028, '#c4684e', root)
    box(x, 0.546, -0.71, 0.23, 0.07, 0.69, green, root)
  }
  for (const x of [-0.281, 0.281]) {
    const lamp = cylinder(x, 0.786, 1.141, 0.138, 0.15, 0.078, 12, iron, root)
    lamp.rotation.x = Math.PI / 2
    cylinder(x, 0.786, 1.188, 0.112, 0.112, 0.024, 12, '#f3d99d', root).rotation.x = Math.PI / 2
  }
  for (const x of [-0.446, 0.446]) {
    box(x, 1.34, 0.73, 0.048, 0.99, 0.054, cream, root).rotation.x = 0.12
    box(x, 1.34, -0.12, 0.045, 0.99, 0.050, iron, root)
  }
  const glass = meshes.paint('#a7d2cf').clone('Dock tug windshield')!
  glass.alpha = 0.34
  box(0, 1.55, 0.768, 0.855, 0.41, 0.037, glass, root, false).rotation.x = 0.12
  box(0, 1.347, 0.742, 0.91, 0.051, 0.066, cream, root)
  box(0, 1.842, 0.28, 1.03, 0.087, 1.11, cream, root)
  box(0, 1.805, 0.28, 0.97, 0.043, 1.04, green, root)
  cylinder(0, 1.02, 0.58, 0.042, 0.046, 0.43, 8, iron, root).rotation.x = -0.37
  cylinder(0, 1.214, 0.50, 0.30, 0.27, 0.039, 14, rubber, root).rotation.x = -0.37
  const rollers: TransformNode[] = []
  const steer = new TransformNode('Front fork', scene)
  steer.parent = root
  steer.position.set(0, 0.26, 0.86)
  function wheel(x: number, z: number, front = false) {
    const hub = new TransformNode('Axle', scene)
    hub.parent = front ? steer : root
    if (!front) hub.position.set(x, 0.26, z)
    rollers.push(hub)
    cylinder(0, 0, 0, 0.52, 0.52, 0.161, 18, rubber, hub).rotation.z = Math.PI / 2
    for (const side of [-1, 1]) {
      cylinder(side * 0.089, 0, 0, 0.26, 0.26, 0.043, 14, cream, hub).rotation.z = Math.PI / 2
      cylinder(side * 0.115, 0, 0, 0.11, 0.11, 0.014, 10, iron, hub).rotation.z = Math.PI / 2
    }
  }
  for (const x of [-0.13, 0.13]) box(x, 0.12, 0, 0.038, 0.26, 0.054, iron, steer)
  wheel(-0.55, -0.72)
  wheel(0.55, -0.72)
  wheel(0, 0.86, true)
  return (angle: number, roll: number) => {
    steer.rotation.y = angle
    for (const wheel of rollers) wheel.rotation.x = roll
  }
}
