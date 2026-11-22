import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../../island-meshes'
import { generateTreeGeometry, templateBudget, type SwayHooks } from './tree-geometry'
import type { TreeCollision, TreeTemplateOptions } from './tree-catalog'
import type { MeshData } from './tree-mesh'

const colorStride = 4

type TreePart = 'trunk' | 'crown'
type TreeRecipe = 'bark' | 'needles' | 'broadleaf'

// Read from mesh.metadata by a later sway or wind pass; nothing drives motion yet.
interface TreePartTag { treePart: TreePart, species: TreeTemplateOptions['species'], sway: SwayHooks }

export interface TreeTemplate {
  root: TransformNode
  // One merged mesh per material, ready to clone for thin instances.
  trunk?: Mesh
  crown?: Mesh
  parts: Mesh[]
  collision: TreeCollision
  // Furthest horizontal reach from the origin, for spacing placements.
  crownRadius: number
  triangles: number
  // The [lowest, highest] triangle count this species and tier should land in.
  budget: readonly [number, number]
  sway: SwayHooks
}

// Templates share the island's recipe materials, so a whole forest is three materials. A later
// sway shader should give trees their own material then, rather than change these shared ones.
function upload(meshes: MeshFactory, name: string, data: MeshData, recipe: TreeRecipe, root: TransformNode, tag: TreePartTag) {
  // Faceted geometry carries one normal per face, so the factory skips its smoothing pass.
  const mesh = meshes.surface(name, data.positions, data.indices, meshes.paintRecipe(recipe), root, data.uvs, data.normals)
  mesh.setVerticesData(VertexBuffer.ColorKind, data.colors, false, colorStride)
  mesh.metadata = tag
  return mesh
}

// Bakes one species × age × exposure × seed into a template whose origin sits at the
// trunk base. Exposed forms lean toward +x: rotate each instance so +x points downwind.
export function buildTreeTemplate(meshes: MeshFactory, options: TreeTemplateOptions, root?: TransformNode): TreeTemplate {
  const name = `${options.species} ${options.age} ${options.exposure} ${options.seed} ${options.tier}`
  const parent = root ?? new TransformNode(name, meshes.scene)
  const geometry = generateTreeGeometry(options)
  const tag = (treePart: TreePart): TreePartTag => ({ treePart, species: options.species, sway: geometry.sway })
  const trunk = geometry.bark.indices.length ? upload(meshes, `${name} trunk`, geometry.bark, 'bark', parent, tag('trunk')) : undefined
  const crown = geometry.foliage.indices.length ? upload(meshes, `${name} crown`, geometry.foliage, geometry.foliageRecipe, parent, tag('crown')) : undefined
  return {
    root: parent,
    trunk,
    crown,
    parts: [trunk, crown].filter((part): part is Mesh => Boolean(part)),
    collision: geometry.collision,
    crownRadius: geometry.crownRadius,
    triangles: geometry.triangles,
    budget: templateBudget(geometry, options.tier),
    sway: geometry.sway,
  }
}
