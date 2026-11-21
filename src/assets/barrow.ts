import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { barrowRig } from '../barrow'
import type { MeshFactory } from '../island-meshes'

type Vertex = [number, number, number]
export const barrowFeet = { halfWidth: 0.326, z: -0.355 }

function buildTray(meshes: MeshFactory, root: TransformNode) {
  const { rimHeight, trayHalfDepth: depth, trayHalfWidth: width } = barrowRig
  const rim: Vertex[] = [[-width, rimHeight, -depth], [width, rimHeight, -depth], [width * 0.76, rimHeight - 0.04, depth], [-width * 0.76, rimHeight - 0.04, depth]]
  const floor: Vertex[] = [[-0.255, 0.53, -0.32], [0.255, 0.53, -0.32], [0.19, 0.53, 0.34], [-0.19, 0.53, 0.34]]
  const { box, surface, shadows } = meshes
  const inner = rim.map(([x, y, z]): Vertex => [x * 0.97, y - 0.016, z * 0.97])
  box(0, 0.518, 0, 0.52, 0.024, 0.67, '#395c50', root)
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
    const lip = box((x + nextX) / 2, (y + nextY) / 2, (z + nextZ) / 2, 0.029, 0.026, Math.hypot(nextX - x, nextY - y, nextZ - z) + 0.025, '#75978a', root)
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
  cylinder(0, 0, 0, 0.315, 0.315, wheelHalfWidth * 2 + 0.013, 16, '#857759', wheel).rotation.z = Math.PI / 2
  cylinder(0, 0, 0, 0.095, 0.095, 0.239, 10, '#4d514b', axle).rotation.z = Math.PI / 2
  for (const side of [-1, 1]) {
    for (const angle of [0, Math.PI / 3, 2 * Math.PI / 3]) {
      box(side * 0.104, 0, 0, 0.018, 0.273, 0.025, '#b39b6f', wheel).rotation.x = angle
    }
  }

  const tilt = new TransformNode('Barrow frame tilt', scene)
  tilt.parent = axle
  const frame = new TransformNode('Tray and handles', scene)
  frame.parent = tilt
  frame.position.set(0, -wheelRadius, -wheelZ)
  buildTray(meshes, frame)
  for (const side of [-1, 1]) {
    const rail = box(side * 0.31, 0.617, 0.029, 0.057, 0.059, 1.04, '#8b6947', frame)
    rail.rotation.set(0.43, -side * 0.29, 0)
    box(side * grip.x, grip.y, grip.z, 0.07, 0.074, 0.18, '#5d4934', frame).rotation.copyFrom(rail.rotation)
    box(side * 0.205, 0.39, 0.44, 0.039, 0.32, 0.049, '#485954', frame).rotation.z = -side * 0.51
    box(side * 0.28, 0.249, barrowFeet.z, 0.05, 0.494, 0.052, '#50605a', frame).rotation.z = side * 0.19
    box(side * 0.25, 0.246, -0.239, 0.039, 0.54, 0.042, '#50605a', frame).rotation.x = -0.46
    box(side * barrowFeet.halfWidth, 0.031, barrowFeet.z, 0.097, 0.052, 0.066, '#39413e', frame)
  }
  box(0, 0.32, -0.31, 0.65, 0.036, 0.043, '#51605a', frame)

  const carrots = Array.from({ length: 6 }, (_, i) => {
    const carrot = new TransformNode('Packed carrot', scene)
    carrot.parent = frame
    const y = 0.575 + (i % 2) * 0.026
    carrot.position.set((i % 3 - 1) * 0.148, y, i < 3 ? -0.167 : 0.15)
    carrot.rotation.y = [0.62, -0.14, 0.35, -0.66, 0.16, 0.48][i]
    carrot.scaling.setAll(0.91 + (i % 3) * 0.06)
    cylinder(0, 0, 0, 0.091, 0.021, 0.231, 9, '#eb8339', carrot).rotation.x = Math.PI / 2
    for (const side of [-1, 1]) {
      box(side * 0.018, 0.009, 0.128, 0.024, 0.024, 0.083, '#6f9749', carrot).rotation.set(-0.31, side * 0.37, 0)
    }
    carrot.setEnabled(false)
    return { carrot, y }
  })
  root.setEnabled(false)
  return { root, tilt, wheel, carrots }
}
