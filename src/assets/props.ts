import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { surfaces } from '../materials'
import { treeTrunkRadius } from '../scenery'
import { chestSize, crateSize } from '../world'
import type { Point } from '../world'
const cream = '#fff3d0'

export const extinguisherNozzle = { height: .98, center: .19, length: .35 }

export const umbrellaColors = ['#e97a59', '#ffce64', '#4faba4']

export function createHomeChest({ scene, box, paintSurface }: MeshFactory, point: Point, color: string) {
  const root = new TransformNode('Home chest', scene)
  root.position.set(point.x, 0, point.z)
  const { width, depth, height } = chestSize
  const wood = paintSurface('wood', '#a77a52')
  const boxHeight = height - 0.145
  box(0, boxHeight / 2, 0, width - 0.045, boxHeight, depth - 0.035, wood, root)
  box(0, boxHeight - 0.072, -0.014, width - 0.16, 0.1, depth - 0.015, color, root)
  const hinge = new TransformNode('Chest lid', scene)
  hinge.parent = root
  hinge.position.set(0, boxHeight + 0.007, depth / 2)
  box(0, 0.064, -depth / 2, width, 0.128, depth, wood, hinge)
  box(0, -0.012, -depth - 0.009, 0.133, 0.16, 0.032, '#dbb26c', hinge)
  return { root, hinge }
}

export function createWardrobe({ box, paintSurface }: MeshFactory, { x, z }: Point, y: number, color: string) {
  const wood = paintSurface('wood', '#9c6a47')
  const doors = paintSurface('wood', '#bc8b5c')
  box(x, y + 0.97, z, 1.05, 1.94, 0.33, wood)
  box(x, y + 1.97, z, 1.15, 0.09, 0.39, wood)
  for (const side of [-1, 1]) {
    box(x + side * 0.225, y + 0.97, z - 0.17, 0.43, 1.7, 0.064, doors)
    box(x + side * 0.225, y + 1.44, z - 0.207, 0.32, 0.38, 0.019, color)
    box(x + side * 0.078, y + 0.96, z - 0.219, 0.034, 0.145, 0.042, '#654937')
  }
}

export function createClothingCounter({ box, paintSurface }: MeshFactory, { x, z }: Point, y: number) {
  const wood = paintSurface('wood', '#a77856')
  box(x, y + 0.51, z, 1.46, 1.02, 0.42, wood)
  box(x, y + 1.06, z, 1.58, 0.12, 0.52, wood)
  box(x, y + 0.68, z + 0.216, 1.26, 0.45, 0.027, '#537d8c')
  for (const [index, color] of ['#84aaa7', '#ccead7', '#537d8c'].entries()) {
    box(x + 0.31, y + 1.16 + index * 0.072, z, 0.47 - index * 0.03, 0.072, 0.27, color)
  }
}

export function createSupply({ scene, box, cylinder }: MeshFactory, kind: 'crate' | 'extinguisher' | 'toolbox') {
  const node = new TransformNode('Supply', scene)
  if (kind === 'toolbox') {
    // Wren's loaner: a red steel box with a lid tray and a carry handle along the body.
    box(0, 0.13, 0, 0.2, 0.22, 0.52, '#b8463a', node)
    box(0, 0.255, 0, 0.21, 0.035, 0.54, '#8f3029', node)
    for (const z of [-0.17, 0.17]) box(0, 0.32, z, 0.035, 0.11, 0.035, '#3c3d3f', node)
    box(0, 0.375, 0, 0.04, 0.035, 0.38, '#3c3d3f', node)
    box(0.105, 0.2, 0, 0.012, 0.03, 0.07, '#e7c46a', node)
  } else if (kind === 'crate') {
    box(0, 0, 0, crateSize, crateSize, crateSize, '#cf8b4f', node)
    for (const side of [-1, 1]) {
      box(side * 0.3, 0, 0, 0.11, 0.91, 0.91, '#f9c174', node)
    }
    box(0, 0.06, -0.453, 0.35, 0.23, 0.02, '#ffe8b1', node)
  } else {
    cylinder(0, 0.48, 0, 0.56, 0.56, 0.83, 12, '#d4513d', node)
    cylinder(0, 0.57, 0, 0.57, 0.57, 0.18, 12, cream, node)
    const { height, center, length } = extinguisherNozzle
    box(0, height, 0, 0.42, 0.15, 0.22, '#2b4445', node)
    box(0, height, center, 0.15, 0.12, length, '#2b4445', node)
  }
  return node
}

export function createUmbrella({ cylinder, surface }: MeshFactory, x: number, z: number, color: string,
  heightAt: (point: Point) => number = () => 0) {
  const y = heightAt({ x, z })
  cylinder(x, y + 1.25, z, 0.12, 0.16, 2.5, 6, '#8c6545')
  cylinder(x, y + 2.6, z, 0.15, 3, 0.67, 8, color)
  // Adjacent woven bands share their hems and follow the sand beneath each corner.
  const ends = [-1.15, -.99, -.92, -.84, .84, .92, .99, 1.15]
  for (let i = 1; i < ends.length; i++) {
    const corners = [[.35, ends[i - 1]], [1.45, ends[i - 1]], [1.45, ends[i]], [.35, ends[i]]]
    const vertices = corners.flatMap(([dx, dz]) => [x + dx, heightAt({ x: x + dx, z: z + dz }) + .022, z + dz])
    surface('Beach towel', vertices, [0, 1, 2, 0, 2, 3], i === 2 || i === 6 ? color : '#f4e2b6').freezeWorldMatrix()
  }
}

export function createTree({ cylinder, sphere, paintSurface }: MeshFactory, x: number, z: number, height: number, variant: number, ground = 0) {
  cylinder(x, ground + height * 0.25 - 0.08, z, 0.31, treeTrunkRadius * 2, height * 0.5 + 0.16, 6, paintSurface('wood'))
  const canopy = paintSurface('leaves', ['#44784b', '#558953', '#366d4c', surfaces.leaves.color][variant % 4])
  if (variant % 3 === 0) {
    sphere(x, ground + height * 0.64, z, height * 0.8, height * 0.8, height * 0.77, canopy)
    sphere(x + height * 0.23, ground + height * 0.54, z + 0.27, height * 0.58, height * 0.57, height * 0.54, paintSurface('leaves', '#619553'))
  } else {
    cylinder(x, ground + height * 0.55, z, 0.1, height * 0.67, height * 0.63, 7, canopy)
    cylinder(x, ground + height * 0.76, z, 0.04, height * 0.48, height * 0.61, 7, paintSurface('leaves', variant % 2 ? '#55894e' : '#3e7852'))
  }
}

export function createRock({ sphere, paintSurface }: MeshFactory, x: number, z: number, size: number, angle: number, light: boolean, ground = 0) {
  const rock = sphere(x, size * 0.12 + ground, z, size, size * 0.78, size * 1.1,
    paintSurface('stone', light ? '#b0ad91' : surfaces.stone.color))
  rock.rotation.y = angle
  return rock
}
