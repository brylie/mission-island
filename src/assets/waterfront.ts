import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { waterLevel } from '../terrain'
import { harborDock, harborDockPiles, skiffStart } from '../world'

export function createDock({ box, cylinder, paintSurface }: MeshFactory) {
  for (let i = 0; i < harborDock.planks; i++) {
    box(harborDock.x, harborDock.top - 0.1, harborDock.firstZ - i * harborDock.spacing,
      harborDock.width, 0.2, harborDock.plankDepth, paintSurface('wood', i % 3 ? '#a67548' : '#b88758'))
  }
  for (const { x, z, bottom, top, diameter } of harborDockPiles) {
    cylinder(x, (top + bottom) / 2, z, diameter, diameter, top - bottom, 7, paintSurface('wood'))
  }
}

export function createHarborBoat({ scene, box, surface, paintSurface, shadows }: MeshFactory) {
  const boat = new TransformNode('Harbor skiff', scene)
  boat.position.set(skiffStart.x, waterLevel, skiffStart.z)
  boat.rotation.y = skiffStart.heading
  const outline = [
    [-0.9, -2.32], [0.9, -2.32], [1.14, -1.18], [1.14, 0.45],
    [0.81, 1.57], [0.29, 2.44], [0, 2.75], [-0.29, 2.44],
    [-0.81, 1.57], [-1.14, 0.45], [-1.14, -1.18],
  ]
  const rimHeight = (z: number) => 0.4 + Math.max(0, z) * 0.075
  const outer: number[] = []
  const inner: number[] = []
  const sideIndices: number[] = []
  for (const [i, [x, z]] of outline.entries()) {
    outer.push(x * 0.72, -0.44 + Math.max(0, z) * 0.09, z * 0.94, x, rimHeight(z), z)
    inner.push(x * 0.71, 0.073, z * 0.92, x * 0.91, rimHeight(z) - 0.022, z * 0.96)
    const a = i * 2
    const b = ((i + 1) % outline.length) * 2
    sideIndices.push(a, b, a + 1, b, b + 1, a + 1)
  }
  surface('Flared hull', outer, sideIndices, '#eee8cc', boat)
  surface('Inside hull', inner, sideIndices.slice().reverse(), '#6e9290', boat)
  const floor = outline.flatMap(([x, z]) => [x * 0.71, 0.073, z * 0.92])
  const planks = Array.from({ length: outline.length - 2 }, (_, i) => [0, i + 1, i + 2]).flat()
  surface('Cockpit floor', floor, planks, '#8b9b87', boat)
  const wood = paintSurface('wood', '#c4935c')
  // Each segment shares its corner vertices with the next one.
  const trim = outline.flatMap(([x, z]) => {
    const y = rimHeight(z)
    return [x * 1.042, y + 0.034, z * 1.02, x * 0.895, y + 0.034, z * 0.95,
      x * 1.028, y - 0.05, z * 1.02, x * 0.905, y - 0.05, z * 0.95]
  })
  const trimIndices = outline.flatMap((_, i) => {
    const a = i * 4
    const b = (i + 1) % outline.length * 4
    return [a, b, a + 1, b, b + 1, a + 1,
      a, a + 2, b, b, a + 2, b + 2,
      a + 1, b + 1, a + 3, b + 1, b + 3, a + 3,
      a + 2, a + 3, b + 2, b + 2, a + 3, b + 3]
  })
  const trimUvs = outline.flatMap(([x, z]) => [x, z, x, z + 0.2, x, z - 0.1, x, z + 0.3])
  const rim = surface('Wood rim', trim, trimIndices, wood, boat, trimUvs)
  shadows.addShadowCaster(rim, false)
  for (const z of [-1.3, 0.25, 1.42]) {
    box(0, 0.19, z, z > 1 ? 1.58 : 1.99, 0.12, 0.44, wood, boat)
  }
  box(0, 0.29, -2.34, 0.39, 0.62, 0.28, '#36484a', boat)
  box(0, 0.62, -2.37, 0.51, 0.35, 0.43, '#c96948', boat)
  return boat
}

export function createBuoy({ scene, sphere, box, cylinder }: MeshFactory, x: number, z: number) {
  const buoy = new TransformNode('Mooring buoy', scene)
  buoy.position.set(x, waterLevel, z)
  sphere(0, 0.03, 0, 0.92, 0.58, 0.92, '#d98545', buoy, false)
  cylinder(0, 0.08, 0, 0.87, 0.87, 0.08, 16, '#fae4b3', buoy)
  box(0, 0.34, 0, 0.13, 0.23, 0.13, '#f4c66e', buoy, false)
  return buoy
}

export function poseFloating(node: TransformNode, time: number, phase = 0, amplitude = 0.065) {
  node.position.y = waterLevel + Math.sin(time * 1.6 + phase) * amplitude
  node.rotation.x = Math.sin(time * 1.13 + phase * 0.6) * 0.035
  node.rotation.z = Math.cos(time * 1.4 + phase) * 0.048
}
