import type { Material } from '@babylonjs/core/Materials/material'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { surfaceRecipe, surfaceRepeatMeters } from './surface-recipes'
import { cylinderSurfaceUVs } from '../surface-uvs'
import { offset, type Point } from '../world'
import type { FeatureModel, SiteFeature } from '../worlds/site-feature'

function featurePieces(meshes: MeshFactory, root: TransformNode) {
  return {
    paintRecipe: meshes.paintRecipe,
    paintSurface: meshes.paintSurface,
    face: (vertices: number[], color: string) => {
      const indices = []
      for (let i = 2; i < vertices.length / 3; i++) indices.push(0, i - 1, i)
      meshes.surface('Sandstone fracture', vertices, indices, color, root)
    },
    box: (x: number, y: number, z: number, width: number, height: number, depth: number, color: string) => {
      return meshes.box(x, y, z, width, height, depth, color, root)
    },
    round: (x: number, y: number, z: number, top: number, bottom: number, height: number, color: string | Material) => {
      return meshes.cylinder(x, y, z, top, bottom, height, 10, color, root)
    },
    leaf: (x: number, y: number, z: number, color: string) =>
      meshes.sphere(x, y, z, 0.091, 0.17, 0.045, color, root, false, 5),
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
    for (const [i, x] of [-0.56, -0.28, 0, 0.28, 0.56].entries()) {
      const height = 0.21 + i % 3 * 0.035
      round(x, 0.34 + height / 2, 0.03, 0.025, 0.041, height, '#638851')
      for (const side of [-1, 1]) {
        const blade = leaf(x + side * 0.066, 0.37 + height * 0.54, 0.055 + side * 0.014, side < 0 ? '#638c55' : '#8ba661')
        blade.rotation.z = -side * 1.02
        blade.rotation.y = i * 0.61
      }
      round(x, 0.34 + height, 0.03, 0.133, 0.046, 0.075, color)
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
  splitstone({ face }, color) {
    // The flat opposing faces are a single fracture. Bedding dips the same
    // way on both sides, even where the shorter eastern fin has weathered away.
    const fins = [
      { x: -1.73, z: 0.45, height: 2.08, outline: [[-0.94, -0.55], [-0.34, -1.32], [0.71, -0.94], [0.81, 0.96], [0.09, 1.44], [-0.78, 0.77]] },
      { x: 1.61, z: -0.22, height: 1.43, outline: [[-0.76, -1.09], [0.22, -1.21], [0.91, -0.35], [0.62, 0.82], [-0.12, 1.23], [-0.69, 0.72]] },
    ]
    for (const fin of fins) {
      const ring = (level: number, width: number, cap = false) => fin.outline.map(([x, z]) => [
        fin.x + x * width + level * 0.06,
        level + x * 0.14 + z * 0.09 + (cap ? 0.22 * Math.sin(x * 2 + z) : 0),
        fin.z + z * width,
      ])
      const layers = [ring(-0.32, 1.04), ring(0.62, 0.98), ring(0.74, 0.95), ring(fin.height, 0.82, true)]
      for (let k = 1; k < layers.length; k++) {
        const low = layers[k - 1], high = layers[k]
        for (let a = 0; a < low.length; a++) {
          const b = (a + 1) % low.length
          face([...low[a], ...low[b], ...high[b], ...high[a]], k === 2 ? '#c7a87f' : color)
        }
      }
      face(layers[3].flat(), '#ad9775')
    }
  },
  picnic(parts, color) {
    // A low seat built into the rock, with a basket and folded cloth at one end.
    const { box, round } = parts
    for (const x of [-0.82, 0.82]) box(x, 0.19, 0, 0.38, 0.46, 0.68, '#817f6d')
    box(0, 0.46, 0, 2.16, 0.13, 0.60, lightWood)
    box(0.66, 0.54, 0.015, 0.65, 0.035, 0.64, color)
    box(0.66, 0.685, 0.012, 0.40, 0.255, 0.31, '#b88655')
    for (const y of [0.622, 0.713]) box(0.66, y, 0.012, 0.413, 0.025, 0.32, '#dbb887')
    for (const dx of [-0.15, 0.15]) round(0.66 + dx, 0.865, 0.01, 0.028, 0.03, 0.13, wood)
    box(0.66, 0.93, 0.01, 0.32, 0.04, 0.045, wood)
  },
  benchmark({ round, box, paintRecipe, paintSurface }, color) {
    const base = round(0, 0.18, 0, 0.9, 1.15, 0.47, paintRecipe('lichen-clock'))
    base.scaling.z = 0.8
    cylinderSurfaceUVs(base, 0.92, 0.47, surfaceRepeatMeters(surfaceRecipe('lichen-clock'), {}))
    const stone = round(0.025, 0.65, 0.02, 0.53, 0.77, 0.66, paintSurface('stone', '#a59e86'))
    stone.scaling.z = 0.86
    round(0.025, 0.997, 0.02, 0.43, 0.48, 0.044, color)
    box(0.025, 1.025, 0.02, 0.024, 0.019, 0.35, '#d5b87d')
    box(0.025, 1.026, 0.02, 0.215, 0.020, 0.022, '#d5b87d')
  },
  log({ round }, color) {
    const trunk = round(0, 0.2, 0, 0.34, 0.52, 2.4, color)
    trunk.rotation.z = Math.PI / 2
    const branch = round(-0.45, 0.44, 0.09, 0.11, 0.19, 0.51, wood)
    branch.rotation.z = -0.56
    branch.rotation.x = 0.35
  },
  cairn({ round }, color) {
    for (const [x, y, width, height, turn] of [[0, 0.10, 0.86, 0.25, 0.4], [0.055, 0.31, 0.56, 0.19, 1.1], [0.02, 0.46, 0.32, 0.13, 2.3]]) {
      const stone = round(x, y, 0, width * 0.72, width, height, color)
      stone.scaling.z = 0.75
      stone.rotation.y = turn
    }
  },
  gauge({ box }, color) {
    box(0, 0.65, 0, 0.14, 1.4, 0.13, wood)
    box(0, 0.72, -0.075, 0.13, 1.08, 0.025, color)
    for (let i = 0; i < 10; i++) box(-0.02, 0.26 + i * 0.1, -0.093, i % 2 ? 0.045 : 0.09, 0.022, 0.012, linen)
  },
  'tide-staff'(parts, color) {
    models.gauge(parts, color)
    // A scarf repair and an old red high-water notch face the beach approach.
    parts.box(0.02, 0.27, 0.081, 0.155, 0.48, 0.057, lightWood)
    for (const y of [0.115, 0.402]) parts.box(0.005, y, 0.029, 0.173, 0.044, 0.19, '#52685e')
    parts.box(0.01, 1.11, -0.099, 0.122, 0.042, 0.025, '#a95239')
    parts.box(0.005, 1.055, 0.076, 0.13, 0.035, 0.024, '#a95239')
  },
  marker({ box, round }, color) {
    box(0, 0.13, 0, 0.95, 0.26, 0.72, metal)
    box(0, 0.58, 0, 0.49, 0.67, 0.40, wood)
    box(0, 0.91, 0, 0.7, 0.13, 0.56, color)
    round(0, 0.98, 0, 0.26, 0.26, 0.04, linen)
  },
  shelter({ box }, color) {
    for (const x of [-1.42, 1.42]) for (const z of [-0.76, 0.76]) box(x, 1.17, z, 0.11, 2.34, 0.11, wood)
    box(0, 2.37, 0, 3.18, 0.15, 1.94, color).rotation.x = -0.06
    for (const y of [0.53, 0.76, 0.99, 1.22]) box(0, y, 0.76, 2.81, 0.18, 0.08, lightWood)
    box(0, 0.47, 0.44, 2.61, 0.12, 0.47, lightWood)
    for (const x of [-1, 1]) box(x, 0.22, 0.43, 0.12, 0.44, 0.35, metal)
    box(0.89, 1.58, 0.75, 0.55, 0.67, 0.09, wood)
    box(0.89, 1.58, 0.69, 0.46, 0.58, 0.025, linen)
    for (let i = 0; i < 4; i++) box(0.89, 1.73 - i * 0.1, 0.67, 0.31, 0.019, 0.012, metal)
  },
  lifebuoy({ box }, color) {
    box(0, 0.88, 0, 0.14, 1.76, 0.16, wood)
    box(0, 1.48, -0.08, 0.45, 0.08, 0.12, metal)
    for (let i = 0; i < 16; i++) {
      const angle = i * Math.PI / 8
      box(0.34 * Math.cos(angle), 1.16 + 0.34 * Math.sin(angle), -0.19, 0.155, 0.151, 0.13, i % 4 < 2 ? linen : color).rotation.z = angle
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
    for (const x of [-0.72, 0.72]) box(x, 0.65, 0, 0.14, 1.32, 0.23, metal)
    box(0, 1.23, 0, 1.6, 0.14, 0.24, color)
    for (const x of [-0.36, 0.36]) {
      const mount = round(x, 0.86, 0.135, 0.65, 0.65, 0.17, '#976d56')
      mount.rotation.x = Math.PI / 2
      for (const [diameter, z] of [[0.57, 0.25], [0.46, 0.29], [0.35, 0.323]]) {
        round(x, 0.86, z, diameter, diameter, 0.068, color).rotation.x = Math.PI / 2
      }
      round(x + 0.24, 0.57, 0.31, 0.079, 0.095, 0.32, '#bcb99b').rotation.z = -0.23
    }
  },
}

export function poseSiteFeature(root: TransformNode, feature: SiteFeature, heightAt: (point: Point) => number) {
  root.position.set(feature.x, heightAt(feature), feature.z)
  root.rotation.y = feature.heading ?? 0
  if (feature.followSlope) {
    const pose = { ...feature, heading: root.rotation.y }
    root.rotation.z = Math.atan2(heightAt(offset(pose, 1, 0)) - heightAt(offset(pose, -1, 0)), 2)
  }
  root.scaling.setAll(feature.scale ?? 1)
}

export function createSiteFeature(meshes: MeshFactory, feature: SiteFeature) {
  const root = new TransformNode(feature.name, meshes.scene)
  models[feature.model](featurePieces(meshes, root), feature.color)
  return root
}

export function placeSiteFeatures(meshes: MeshFactory, features: readonly SiteFeature[], heightAt: (point: Point) => number) {
  for (const feature of features) {
    const root = createSiteFeature(meshes, feature)
    poseSiteFeature(root, feature, heightAt)
    meshes.batchModel(root)
  }
}
