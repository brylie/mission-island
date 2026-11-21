import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { barrowRig } from '../barrow'
import type { MeshFactory } from '../island-meshes'

type Vertex = [number, number, number]

function buildTray(meshes: MeshFactory, root: TransformNode) {
  const { rimHeight, trayHalfDepth: depth, trayHalfWidth: width } = barrowRig
  const rim: Vertex[] = [[-width, rimHeight, -depth], [width, rimHeight, -depth],
    [width * .76, rimHeight - .04, depth], [-width * .76, rimHeight - .04, depth]]
  const floor: Vertex[] = [[-.255, .53, -.32], [.255, .53, -.32], [.19, .53, .34], [-.19, .53, .34]]
  const { box, surface, shadows } = meshes
  const inner = rim.map(([x, y, z]): Vertex => [x * .97, y - .016, z * .97])
  box(0, .518, 0, .52, .024, .67, '#395c50', root)
  const addPanel = (name: string, points: Vertex[], color: string) => {
    const panel = surface(name, points.flat(), [0, 1, 2, 0, 2, 3], color, root)
    shadows.addShadowCaster(panel, false)
  }
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4
    addPanel('Pressed steel tray', [floor[i], floor[j], rim[j], rim[i]], '#39665a')
    addPanel('Painted tray inside', [floor[j], floor[i], inner[i], inner[j]], '#50776a')
    const [x, y, z] = rim[i]
    const [nextX, nextY, nextZ] = rim[j]
    const lip = box((x + nextX) / 2, (y + nextY) / 2, (z + nextZ) / 2,
      .029, .026, Math.hypot(nextX - x, nextY - y, nextZ - z) + .025, '#75978a', root)
    lip.rotation.set(-Math.atan2(nextY - y, Math.hypot(nextX - x, nextZ - z)), Math.atan2(nextX - x, nextZ - z), 0)
  }
}

export function createBarrow(meshes: MeshFactory) {
  const { scene, box, cylinder } = meshes
  const { wheelRadius, wheelZ, wheelHalfWidth, grip } = barrowRig
  const root = new TransformNode('Farm wheelbarrow', scene)
  const axle = new TransformNode('Barrow axle', scene)
  axle.parent = root
  axle.position.set(0, wheelRadius, wheelZ)
  const wheel = new TransformNode('Farm barrow wheel', scene)
  wheel.parent = axle
  const diameter = wheelRadius * 2
  cylinder(0, 0, 0, diameter, diameter, wheelHalfWidth * 2, 24, '#303431', wheel).rotation.z = Math.PI / 2
  cylinder(0, 0, 0, .315, .315, wheelHalfWidth * 2 + .013, 16, '#857759', wheel).rotation.z = Math.PI / 2
  cylinder(0, 0, 0, .095, .095, .239, 10, '#4d514b', axle).rotation.z = Math.PI / 2
  for (const side of [-1, 1]) {
    for (const angle of [0, Math.PI / 3, 2 * Math.PI / 3]) {
      box(side * .104, 0, 0, .018, .273, .025, '#b39b6f', wheel).rotation.x = angle
    }
  }

  const tilt = new TransformNode('Barrow frame tilt', scene)
  tilt.parent = axle
  const frame = new TransformNode('Tray and handles', scene)
  frame.parent = tilt
  frame.position.set(0, -wheelRadius, -wheelZ)
  buildTray(meshes, frame)
  for (const side of [-1, 1]) {
    const rail = box(side * .31, .617, .029, .057, .059, 1.04, '#8b6947', frame)
    rail.rotation.set(.43, -side * .29, 0)
    box(side * grip.x, grip.y, grip.z, .07, .074, .18, '#5d4934', frame).rotation.copyFrom(rail.rotation)
    box(side * .205, .39, .44, .039, .32, .049, '#485954', frame).rotation.z = -side * .51
    box(side * .28, .249, -.355, .05, .494, .052, '#50605a', frame).rotation.z = side * .19
    box(side * .25, .246, -.239, .039, .54, .042, '#50605a', frame).rotation.x = -.46
    box(side * .326, .031, -.355, .097, .052, .066, '#39413e', frame)
  }
  box(0, .32, -.31, .65, .036, .043, '#51605a', frame)

  const carrots = Array.from({ length: 6 }, (_, i) => {
    const carrot = new TransformNode('Packed carrot', scene)
    carrot.parent = frame
    const y = .575 + (i % 2) * .026
    carrot.position.set((i % 3 - 1) * .148, y, i < 3 ? -.167 : .15)
    carrot.rotation.y = [.62, -.14, .35, -.66, .16, .48][i]
    carrot.scaling.setAll(.91 + (i % 3) * .06)
    cylinder(0, 0, 0, .091, .021, .231, 9, '#eb8339', carrot).rotation.x = Math.PI / 2
    for (const side of [-1, 1]) {
      box(side * .018, .009, .128, .024, .024, .083, '#6f9749', carrot).rotation.set(-.31, side * .37, 0)
    }
    carrot.setEnabled(false)
    return { carrot, y }
  })
  root.setEnabled(false)
  return { root, tilt, wheel, carrots }
}
