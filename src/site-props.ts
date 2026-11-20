import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from './island-meshes'
import type { Point } from './world'

export interface SiteFeature extends Point {
  site: string
  name: string
  model: FeatureModel
  color: string
  heading?: number
  scale?: number
}

type FeatureModel = 'rack' | 'planter' | 'crates' | 'bench' | 'marker' | 'shelter' | 'scope' | 'rail' | 'pennant' | 'barrels' | 'hose' | 'cairn' | 'gauge' | 'log' | 'lifebuoy'

function featurePieces(meshes: MeshFactory, root: TransformNode) {
  return {
    box: (x: number, y: number, z: number, width: number, height: number, depth: number, color: string) => {
      return meshes.box(x, y, z, width, height, depth, color, root)
    },
    round: (x: number, y: number, z: number, top: number, bottom: number, height: number, color: string) => {
      return meshes.cylinder(x, y, z, top, bottom, height, 10, color, root)
    },
    leaf: (x: number, y: number, z: number, color: string) =>
      meshes.sphere(x, y, z, .091, .17, .045, color, root, false, 5),
  }
}

type Pieces = ReturnType<typeof featurePieces>
const wood = '#865d45', lightWood = '#cf9e68', metal = '#5c6964', linen = '#f0deaa'

const models: Record<FeatureModel, (parts: Pieces, color: string) => void> = {
  rack({ box, round }, color) {
    for (const x of [-0.83, 0.83]) box(x, 0.75, 0, 0.12, 1.5, 0.15, wood)
    box(0, 1.42, 0, 1.83, 0.12, 0.14, lightWood)
    for (const x of [-0.53, -0.26, 0, 0.26, 0.53]) box(x, 0.96, 0.035, 0.025, 0.76, 0.025, linen)
    for (const y of [0.62, 0.82, 1.02, 1.22]) box(0, y, 0.058, 1.08, 0.025, 0.026, linen)
    for (const x of [-0.53, 0, 0.53]) round(x, 0.58, 0.053, 0.12, 0.12, 0.16, color)
  },
  planter({ box, round, leaf }, color) {
    box(0, 0.15, 0, 1.6, 0.30, 0.5, wood)
    box(0, 0.30, 0, 1.66, 0.09, 0.57, lightWood)
    for (const [i, x] of [-.56, -.28, 0, .28, .56].entries()) {
      const height = .21 + i % 3 * .035
      round(x, .34 + height / 2, .03, .025, .041, height, '#638851')
      for (const side of [-1, 1]) {
        const blade = leaf(x + side * .066, .37 + height * .54, .055 + side * .014, side < 0 ? '#638c55' : '#8ba661')
        blade.rotation.z = -side * 1.02
        blade.rotation.y = i * .61
      }
      round(x, .34 + height, .03, .133, .046, .075, color)
    }
  },
  crates({ box }, color) {
    for (const [x, y, z] of [[-0.36, 0.28, 0.02], [0.35, 0.28, -0.05], [0.30, 0.79, -0.07]]) {
      box(x, y, z, 0.64, 0.52, 0.53, wood)
      box(x, y, z - 0.275, 0.60, 0.41, 0.04, lightWood)
      box(x, y + 0.03, z - 0.303, 0.22, 0.14, 0.026, color)
    }
  },
  bench({ box }, color) {
    for (const x of [-0.65, 0.65]) box(x, 0.25, 0, 0.18, 0.50, 0.52, metal)
    box(0, 0.51, 0, 1.7, 0.12, 0.54, lightWood)
    for (const x of [-0.65, 0.65]) box(x, 0.69, 0.21, 0.13, 0.44, 0.13, metal)
    box(0, 0.92, 0.22, 1.7, 0.23, 0.105, color)
  },
  log({ round }, color) {
    const trunk = round(0, .2, 0, .34, .52, 2.4, color)
    trunk.rotation.z = Math.PI / 2
    const branch = round(-.45, .44, .09, .11, .19, .51, wood)
    branch.rotation.z = -.56
    branch.rotation.x = .35
  },
  cairn({ round }, color) {
    for (const [x, y, width, height, turn] of [[0, .10, .86, .25, .4], [.055, .31, .56, .19, 1.1], [.02, .46, .32, .13, 2.3]]) {
      const stone = round(x, y, 0, width * .72, width, height, color)
      stone.scaling.z = .75
      stone.rotation.y = turn
    }
  },
  gauge({ box }, color) {
    box(0, .65, 0, .14, 1.4, .13, wood)
    box(0, .72, -.075, .13, 1.08, .025, color)
    for (let i = 0; i < 10; i++) box(-.02, .26 + i * .1, -.093, i % 2 ? .045 : .09, .022, .012, linen)
  },
  marker({ box, round }, color) {
    box(0, 0.13, 0, 0.95, 0.26, 0.72, metal)
    box(0, 0.58, 0, 0.49, 0.67, 0.40, wood)
    box(0, 0.91, 0, 0.7, 0.13, 0.56, color)
    round(0, 0.98, 0, 0.26, 0.26, 0.04, linen)
  },
  shelter({ box }, color) {
    for (const x of [-1.42, 1.42]) for (const z of [-.76, .76]) box(x, 1.17, z, .11, 2.34, .11, wood)
    box(0, 2.37, 0, 3.18, .15, 1.94, color).rotation.x = -.06
    for (const y of [.53, .76, .99, 1.22]) box(0, y, .76, 2.81, .18, .08, lightWood)
    box(0, .47, .44, 2.61, .12, .47, lightWood)
    for (const x of [-1, 1]) box(x, .22, .43, .12, .44, .35, metal)
    box(.89, 1.58, .75, .55, .67, .09, wood)
    box(.89, 1.58, .69, .46, .58, .025, linen)
    for (let i = 0; i < 4; i++) box(.89, 1.73 - i * .1, .67, .31, .019, .012, metal)
  },
  lifebuoy({ box }, color) {
    box(0, .88, 0, .14, 1.76, .16, wood)
    box(0, 1.48, -.08, .45, .08, .12, metal)
    for (let i = 0; i < 16; i++) {
      const angle = i * Math.PI / 8
      box(.34 * Math.cos(angle), 1.16 + .34 * Math.sin(angle), -.19,
        .155, .151, .13, i % 4 < 2 ? linen : color).rotation.z = angle
    }
  },
  scope({ box, round }, color) {
    round(0, 0.08, 0, 0.69, 0.76, 0.16, metal)
    round(0, 0.53, 0, 0.18, 0.2, 0.90, wood)
    round(0, 1.02, 0, 0.56, 0.39, 0.81, color).rotation.x = Math.PI / 2 + 0.15
    box(0, 1.09, -0.407, 0.24, 0.20, 0.06, '#537786')
  },
  rail({ box }, color) {
    for (const x of [-0.85, 0, 0.85]) box(x, 0.36, 0, 0.14, 0.72, 0.16, wood)
    box(0, 0.68, 0, 1.91, 0.16, 0.13, color)
    box(0, 0.38, 0, 1.77, 0.09, 0.10, lightWood)
  },
  pennant({ box, round }, color) {
    for (const x of [-0.81, 0.81]) round(x, 0.95, 0, 0.12, 0.15, 1.9, wood)
    box(0, 1.77, 0, 1.63, 0.035, 0.038, linen)
    for (const [index, x] of [-0.55, -0.2, 0.18, 0.51].entries()) box(x, 1.58 + index % 2 * 0.06, 0, 0.21, 0.36, 0.045, index % 2 ? linen : color)
  },
  barrels({ round }, color) {
    for (const [x, size] of [[-0.37, 0.81], [0.34, 0.57]]) {
      round(x, size * 0.47, 0, size * 0.66, size * 0.72, size * 0.95, wood)
      round(x, size * 0.8, 0, size * 0.72, size * 0.72, 0.07, metal)
      round(x, size * 0.24, 0, size * 0.75, size * 0.75, 0.07, metal)
      round(x, size * 0.94, 0, size * 0.67, size * 0.65, 0.05, color)
    }
  },
  hose({ box, round }, color) {
    for (const x of [-.72, .72]) box(x, .65, 0, .14, 1.32, .23, metal)
    box(0, 1.23, 0, 1.6, .14, .24, color)
    for (const x of [-.36, .36]) {
      const mount = round(x, .86, .135, .65, .65, .17, '#976d56')
      mount.rotation.x = Math.PI / 2
      for (const [diameter, z] of [[.57, .25], [.46, .29], [.35, .323]]) {
        round(x, .86, z, diameter, diameter, .068, color).rotation.x = Math.PI / 2
      }
      round(x + .24, .57, .31, .079, .095, .32, '#bcb99b').rotation.z = -.23
    }
  },
}

export function placeSiteFeatures(meshes: MeshFactory, features: readonly SiteFeature[], heightAt: (point: Point) => number) {
  for (const feature of features) {
    const root = new TransformNode(feature.name, meshes.scene)
    root.position.set(feature.x, heightAt(feature), feature.z)
    root.rotation.y = feature.heading ?? 0
    root.scaling.setAll(feature.scale ?? 1)
    models[feature.model](featurePieces(meshes, root), feature.color)
    meshes.batchModel(root)
  }
}
