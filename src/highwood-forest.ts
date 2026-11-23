import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import type { Material } from '@babylonjs/core/Materials/material'
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData'
import '@babylonjs/core/Meshes/thinInstanceMesh'
import { highwoodForestLook as look } from './assets/recipes/highwood-forest'
import type { TreeSpecies, TreeTier } from './assets/trees/tree-catalog'
import { buildTreeTemplate, type TreeTemplate } from './assets/trees/tree-template'
import type { MeshFactory } from './island-meshes'
import { groundHeight } from './terrain'
import type { Point } from './world'
import { highwoodPlanting, type Planting } from './worlds/starter/highwood-planting'
import { highwoodTemplateSeedBase } from './worlds/starter/layout/highwood-planting'

// Draws Highwood's forest so it costs little however many plants it holds:
// - far trees are merged into one static mesh per tile and material, so a tile
//   is a few draw calls and off-screen tiles are culled whole;
// - near tiles show detailed templates as thin instances, one draw per template,
//   rebuilt only when the set of near tiles changes;
// - understory draws only close by, where fog and the ground take over beyond.
// Nothing here adds physics bodies; walking solids come from the shared planting.

const matrixStride = 16
const colorStride = 4
const vec3Stride = 3
const uvStride = 2
const half = 0.5

interface Tile { key: string, centre: Point, canopy: Planting[], understory: Planting[], far: Mesh[], near: boolean, close: boolean }

const comboKey = (plant: Planting, tier: TreeTier) => `${plant.species} ${plant.age} ${plant.exposure} ${plant.variant} ${tier}`
const tileKey = (x: number, z: number) => `${Math.floor(x / look.tileM)},${Math.floor(z / look.tileM)}`

function plantMatrix(plant: Planting) {
  const y = groundHeight(plant) - look.sinkM
  return Matrix.Compose(new Vector3(plant.scale, plant.scale, plant.scale), Quaternion.RotationYawPitchRoll(plant.heading, 0, 0), new Vector3(plant.x, y, plant.z))
}

// Bakes the far templates of a tile's trees into one mesh per material.
function mergeFar(meshes: MeshFactory, tile: Tile, template: (plant: Planting) => TreeTemplate) {
  const groups = new Map<Material, { positions: number[], normals: number[], uvs: number[], colors: number[], indices: number[] }>()
  for (const plant of tile.canopy) {
    const matrix = plantMatrix(plant)
    for (const part of template(plant).parts) {
      const material = part.material!
      const group = groups.get(material) ?? { positions: [], normals: [], uvs: [], colors: [], indices: [] }
      groups.set(material, group)
      // Copy, or transforming the data would move the shared template too.
      const data = VertexData.ExtractFromMesh(part, true, true)
      data.transform(matrix)
      const base = group.positions.length / vec3Stride
      group.positions.push(...data.positions!)
      group.normals.push(...data.normals!)
      group.uvs.push(...(data.uvs ?? new Array<number>(data.positions!.length / vec3Stride * uvStride).fill(0)))
      group.colors.push(...(data.colors ?? new Array<number>(data.positions!.length / vec3Stride * colorStride).fill(1)))
      for (const index of data.indices!) group.indices.push(base + index)
    }
  }
  return [...groups].map(([material, group]) => {
    const mesh = meshes.surface(`Highwood far ${tile.key}`, group.positions, group.indices, material, undefined, group.uvs, group.normals)
    mesh.setVerticesData(VertexBuffer.ColorKind, group.colors, false, colorStride)
    mesh.freezeWorldMatrix()
    return mesh
  })
}

export function createHighwoodForest(meshes: MeshFactory) {
  const templates = new Map<string, TreeTemplate>()
  function template(plant: Planting, tier: TreeTier = 'far') {
    const key = comboKey(plant, tier)
    let found = templates.get(key)
    if (!found) {
      found = buildTreeTemplate(meshes, { species: plant.species as TreeSpecies, age: plant.age, exposure: plant.exposure, seed: highwoodTemplateSeedBase + plant.variant, tier })
      found.root.setEnabled(false)
      templates.set(key, found)
    }
    return found
  }

  const tiles = new Map<string, Tile>()
  for (const plant of highwoodPlanting()) {
    const key = tileKey(plant.x, plant.z)
    let tile = tiles.get(key)
    if (!tile) {
      const [i, j] = key.split(',').map(Number)
      tile = { key, centre: { x: (i + half) * look.tileM, z: (j + half) * look.tileM }, canopy: [], understory: [], far: [], near: false, close: false }
      tiles.set(key, tile)
    }
    ;(plant.layer === 'understory' ? tile.understory : tile.canopy).push(plant)
  }
  for (const tile of tiles.values()) tile.far = mergeFar(meshes, tile, (plant) => template(plant))

  // One thin-instance mesh per detailed template, shared by every near tile.
  const batches = new Map<string, Mesh[]>()
  function batchFor(plant: Planting) {
    const key = comboKey(plant, 'near')
    let parts = batches.get(key)
    if (!parts) {
      parts = template(plant, 'near').parts.map((part) => {
        const batch = part.clone(`Highwood ${key}`, null, true)
        batch.makeGeometryUnique()
        // The template's root stays disabled; a clone must leave it, or it is hidden too.
        batch.parent = null
        batch.setEnabled(false)
        batch.receiveShadows = true
        meshes.shadows.addShadowCaster(batch, false)
        return batch
      })
      batches.set(key, parts)
    }
    return parts
  }

  function rebuild() {
    const matrices = new Map<string, number[]>()
    for (const tile of tiles.values()) {
      const plants = [...(tile.near ? tile.canopy : []), ...(tile.close ? tile.understory : [])]
      for (const plant of plants) {
        const key = comboKey(plant, 'near')
        batchFor(plant)
        const list = matrices.get(key) ?? []
        plantMatrix(plant).copyToArray(list, list.length)
        matrices.set(key, list)
      }
    }
    for (const [key, parts] of batches) {
      const list = matrices.get(key)
      for (const part of parts) {
        part.setEnabled(Boolean(list?.length))
        if (!list?.length) continue
        part.thinInstanceSetBuffer('matrix', new Float32Array(list), matrixStride, true)
        // Bounds must cover the instances, or the batch is culled as if it stood at the origin.
        part.thinInstanceRefreshBoundingInfo(false)
      }
    }
  }

  return {
    // Switch tiles between tiers as the camera moves; rebuilds only when a tile changes.
    update(camera: Point, close: boolean) {
      let changed = false
      for (const tile of tiles.values()) {
        const range = Math.hypot(camera.x - tile.centre.x, camera.z - tile.centre.z)
        const near = close && range < (tile.near ? look.nearM + look.bandM : look.nearM)
        const understory = close && range < (tile.close ? look.understoryM + look.understoryBandM : look.understoryM)
        if (near !== tile.near || understory !== tile.close) {
          tile.near = near
          tile.close = understory
          changed = true
          for (const mesh of tile.far) mesh.setEnabled(!near)
        }
      }
      if (changed) rebuild()
    },
    stats() {
      let near = 0
      for (const tile of tiles.values()) if (tile.near) near++
      return { tiles: tiles.size, near, templates: templates.size, batches: batches.size }
    },
  }
}
