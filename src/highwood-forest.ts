import type { Material } from '@babylonjs/core/Materials/material'
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData'
import '@babylonjs/core/Meshes/thinInstanceMesh'
import { highwoodForestLook as look } from './assets/recipes/highwood-forest'
import type { TreeTemplateOptions, TreeTier } from './assets/trees/tree-catalog'
import { treeCollision } from './assets/trees/tree-collision'
import { buildTreeTemplate, type TreeTemplate } from './assets/trees/tree-template'
import type { MeshFactory } from './island-meshes'
import { groundHeight } from './terrain'
import { standingPlants } from './highwood-standing'
import type { Point } from './world'
import { logRise, plantTemplateOptions, type Planting } from './worlds/starter/highwood-planting'

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
const halfTile = 0.5

interface Tile { key: string, centre: Point, canopy: Planting[], understory: Planting[], far: Mesh[], near: boolean, close: boolean }

const comboKey = (plant: Planting, tier: TreeTier) => `${plant.species} ${plant.age} ${plant.exposure} ${plant.variant} ${tier}`
const tileKey = (x: number, z: number) => `${Math.floor(x / look.tileM)},${Math.floor(z / look.tileM)}`

// A fallen log tilts to follow the ground from its root to its far end, as the walking solids do.
function logTilt(plant: Planting) {
  const collision = treeCollision(plantTemplateOptions(plant, 'near') as TreeTemplateOptions)
  return collision.shape === 'lying' ? Math.atan(logRise(plant, collision.length * plant.scale)) : 0
}

function plantMatrix(plant: Planting) {
  const y = groundHeight(plant) - look.sinkM
  return Matrix.Compose(new Vector3(plant.scale, plant.scale, plant.scale), Quaternion.RotationYawPitchRoll(plant.heading, 0, logTilt(plant)), new Vector3(plant.x, y, plant.z))
}

interface FarGroup { parts: VertexData[], vertices: number, indices: number }

// Bakes the far templates of a tile's trees into one mesh per material. Two passes
// size typed arrays exactly, at half the memory of plain number arrays.
function mergeFar(meshes: MeshFactory, tile: Tile, template: (plant: Planting) => TreeTemplate, farMaterial: (material: Material) => Material) {
  const groups = new Map<Material, FarGroup>()
  for (const plant of tile.canopy) {
    const matrix = plantMatrix(plant)
    for (const part of template(plant).parts) {
      const material = farMaterial(part.material!)
      const group = groups.get(material) ?? { parts: [], vertices: 0, indices: 0 }
      groups.set(material, group)
      // Copy, or transforming the data would move the shared template too.
      const data = VertexData.ExtractFromMesh(part, true, true)
      data.transform(matrix)
      group.parts.push(data)
      group.vertices += data.positions!.length / vec3Stride
      group.indices += data.indices!.length
    }
  }
  return [...groups].map(([material, group]) => {
    const merged = new VertexData()
    merged.positions = new Float32Array(group.vertices * vec3Stride)
    merged.normals = new Float32Array(group.vertices * vec3Stride)
    merged.uvs = new Float32Array(group.vertices * uvStride)
    merged.colors = new Float32Array(group.vertices * colorStride).fill(1)
    merged.indices = new Uint32Array(group.indices)
    let vertex = 0, index = 0
    for (const data of group.parts) {
      merged.positions.set(data.positions!, vertex * vec3Stride)
      merged.normals.set(data.normals!, vertex * vec3Stride)
      if (data.uvs) merged.uvs.set(data.uvs, vertex * uvStride)
      if (data.colors) merged.colors.set(data.colors, vertex * colorStride)
      for (let i = 0; i < data.indices!.length; i++) merged.indices[index + i] = data.indices![i] + vertex
      vertex += data.positions!.length / vec3Stride
      index += data.indices!.length
    }
    const mesh = new Mesh(`Highwood far ${tile.key}`, meshes.scene)
    merged.applyToMesh(mesh)
    mesh.material = material
    mesh.isPickable = false
    mesh.receiveShadows = true
    // The typed arrays stay with the geometry, so Babylon can rebuild the GPU buffers after a lost WebGL context.
    mesh.freezeWorldMatrix()
    return mesh
  })
}

export function createHighwoodForest(meshes: MeshFactory) {
  // Detail ranges; the graphics setting pulls them in on older computers.
  const ranges = { nearM: look.nearM, understoryM: look.understoryM }
  const templates = new Map<string, TreeTemplate>()
  // Far silhouettes draw with their own copies of the tree materials: a material shared
  // with the near thin instances lost the far crowns entirely once both drew.
  const farMaterials = new Map<Material, Material>()
  const farMaterial = (material: Material) => {
    let copy = farMaterials.get(material)
    if (!copy) {
      copy = material.clone(`${material.name} far`) ?? material
      farMaterials.set(material, copy)
    }
    return copy
  }
  function template(plant: Planting, tier: TreeTier = 'far') {
    const key = comboKey(plant, tier)
    let found = templates.get(key)
    if (!found) {
      found = buildTreeTemplate(meshes, plantTemplateOptions(plant, tier) as TreeTemplateOptions)
      found.root.setEnabled(false)
      templates.set(key, found)
    }
    return found
  }

  const tiles = new Map<string, Tile>()
  // The plants standing with the island's roads: the bake's, or with a previewed draft road
  // cleared the same way the bake clears (src/highwood-standing.ts).
  for (const plant of standingPlants()) {
    const key = tileKey(plant.x, plant.z)
    let tile = tiles.get(key)
    if (!tile) {
      const [i, j] = key.split(',').map(Number)
      tile = { key, centre: { x: (i + half) * look.tileM, z: (j + half) * look.tileM }, canopy: [], understory: [], far: [], near: false, close: false }
      tiles.set(key, tile)
    }
    ;(plant.layer === 'understory' ? tile.understory : tile.canopy).push(plant)
  }
  // Exposed crest trees stand on skylines, where a switch between tiers would show; they
  // always draw detailed. There are few of them.
  const alwaysNear = (plant: Planting) => plant.exposure === 'exposed'
  for (const tile of tiles.values()) tile.far = mergeFar(meshes, { ...tile, canopy: tile.canopy.filter((plant) => !alwaysNear(plant)) }, (plant) => template(plant), farMaterial)

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
        // Low shrubs and bracken cast little shade; leaving them out of the shadow map saves a pass of triangles.
        if (plant.layer !== 'understory') meshes.shadows.addShadowCaster(batch, false)
        return batch
      })
      batches.set(key, parts)
    }
    return parts
  }

  function rebuild() {
    const matrices = new Map<string, number[]>()
    for (const tile of tiles.values()) {
      const plants = [...(tile.near ? tile.canopy : tile.canopy.filter(alwaysNear)), ...(tile.close ? tile.understory : [])]
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
        // Setting the matrices also refreshes the batch's bounds to cover every instance.
        part.thinInstanceSetBuffer('matrix', new Float32Array(list), matrixStride, true)
      }
    }
  }

  // Crest trees draw from the start, before any tile turns near.
  rebuild()

  return {
    // Switch tiles between tiers as the camera moves; rebuilds only when a tile changes.
    update(camera: Point, close: boolean) {
      let changed = false
      for (const tile of tiles.values()) {
        // Distance to the nearest point of the tile, so a corner near the camera counts as near.
        const half = look.tileM * halfTile
        const range = Math.hypot(Math.max(0, Math.abs(camera.x - tile.centre.x) - half), Math.max(0, Math.abs(camera.z - tile.centre.z) - half))
        const near = close && range < (tile.near ? ranges.nearM + look.bandM : ranges.nearM)
        const understory = close && range < (tile.close ? ranges.understoryM + look.understoryBandM : ranges.understoryM)
        if (near !== tile.near || understory !== tile.close) {
          tile.near = near
          tile.close = understory
          changed = true
          for (const mesh of tile.far) mesh.setEnabled(!near)
        }
      }
      if (changed) rebuild()
    },
    setDetail(nearM: number, understoryM: number) {
      Object.assign(ranges, { nearM, understoryM })
    },
    stats() {
      let near = 0
      for (const tile of tiles.values()) if (tile.near) near++
      return { tiles: tiles.size, near, templates: templates.size, batches: batches.size }
    },
  }
}
