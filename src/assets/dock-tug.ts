import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { coastalProfile } from './coastal-profiles'

export function createDockTug(meshes: MeshFactory) {
  const { scene, box, cylinder } = meshes
  const root = new TransformNode('Three-wheel dock tug', scene)
  const green = '#498477', cream = '#e5cd97', rubber = '#333d3e', iron = '#526260'
  box(0, .42, -.09, 1.04, .16, 1.91, iron, root)
  box(0, .60, -.67, 1.26, .27, 1.03, green, root)
  box(0, .766, -.67, 1.29, .068, 1.06, '#b8966a', root)
  for (const x of [-.62, .62]) box(x, .87, -.655, .064, .16, 1.05, green, root)
  box(0, .87, -1.177, 1.282, .162, .082, green, root)
  box(0, .89, -.16, 1.19, .22, .065, green, root)
  // An open driver's step separates the low load deck and the rounded nose.
  box(0, .50, .30, .99, .08, .81, '#85765e', root)
  box(0, .67, .01, .53, .27, .35, green, root)
  box(0, .83, .02, .59, .105, .43, '#594f43', root)
  box(0, .99, -.155, .57, .29, .085, '#685647', root).rotation.x = -.11
  coastalProfile(meshes, root, 'Enamel motor bonnet', green, [
    [.59, .76, .43, .26], [.76, .76, .50, .27], [.98, .74, .49, .22],
    [1.11, .71, .45, .17], [1.14, .71, .39, .14],
  ], 16, .46)
  box(0, .54, 1.15, .91, .084, .12, cream, root)
  for (const y of [.65, .69, .73]) box(0, y, 1.146, .29, .014, .017, iron, root)
  for (const x of [-.52, .52]) {
    box(x, .67, -1.196, .17, .075, .028, '#c4684e', root)
    box(x, .546, -.71, .23, .07, .69, green, root)
  }
  for (const x of [-.281, .281]) {
    const lamp = cylinder(x, .786, 1.141, .138, .15, .078, 12, iron, root)
    lamp.rotation.x = Math.PI / 2
    cylinder(x, .786, 1.188, .112, .112, .024, 12, '#f3d99d', root).rotation.x = Math.PI / 2
  }
  for (const x of [-.446, .446]) {
    box(x, 1.34, .73, .048, .99, .054, cream, root).rotation.x = .12
    box(x, 1.34, -.12, .045, .99, .050, iron, root)
  }
  const glass = meshes.paint('#a7d2cf').clone('Dock tug windshield')!
  glass.alpha = .34
  box(0, 1.55, .768, .855, .41, .037, glass, root, false).rotation.x = .12
  box(0, 1.347, .742, .91, .051, .066, cream, root)
  box(0, 1.842, .28, 1.03, .087, 1.11, cream, root)
  box(0, 1.805, .28, .97, .043, 1.04, green, root)
  cylinder(0, 1.02, .58, .042, .046, .43, 8, iron, root).rotation.x = -.37
  cylinder(0, 1.214, .50, .30, .27, .039, 14, rubber, root).rotation.x = -.37
  const rollers: TransformNode[] = []
  const steer = new TransformNode('Front fork', scene)
  steer.parent = root
  steer.position.set(0, .26, .86)
  function wheel(x: number, z: number, front = false) {
    const hub = new TransformNode('Axle', scene)
    hub.parent = front ? steer : root
    if (!front) hub.position.set(x, .26, z)
    rollers.push(hub)
    cylinder(0, 0, 0, .52, .52, .161, 18, rubber, hub).rotation.z = Math.PI / 2
    for (const side of [-1, 1]) {
      cylinder(side * .089, 0, 0, .26, .26, .043, 14, cream, hub).rotation.z = Math.PI / 2
      cylinder(side * .115, 0, 0, .11, .11, .014, 10, iron, hub).rotation.z = Math.PI / 2
    }
  }
  for (const x of [-.13, .13]) box(x, .12, 0, .038, .26, .054, iron, steer)
  wheel(-.55, -.72)
  wheel(.55, -.72)
  wheel(0, .86, true)
  return (angle: number, roll: number) => {
    steer.rotation.y = angle
    for (const wheel of rollers) wheel.rotation.x = roll
  }
}
