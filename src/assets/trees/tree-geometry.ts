import { clamp } from '../../math/noise.ts'
import { templateBudgets } from '../geometry/tree-species.ts'
import { growLog, growSnag } from './grow-deadwood.ts'
import { growFronds, growMound } from './grow-shrub.ts'
import { growTree } from './grow-tree.ts'
import { facet, triangleCount, type MeshData, type Vec3 } from './tree-mesh.ts'
import { seedStreams, treeSpecies, type FoliageRecipe, type TreeCollision, type TreeTemplateOptions } from './tree-catalog.ts'

const half = 0.5
const vertexStride = 3
const colorStride = 4
const alphaChannel = 3
const zComponent = 2

// Where a later sway pass can pivot each part: the trunk from its base, the crown about its mass.
// Each vertex's colour alpha also carries its sway weight, from 0 at the ground to 1 at the top.
export interface SwayHooks { trunkBase: Vec3, crownCenter: Vec3, height: number }

export interface TreeGeometry {
  bark: MeshData
  foliage: MeshData
  foliageRecipe: FoliageRecipe
  collision: TreeCollision
  triangles: number
  budget: keyof typeof templateBudgets
  // Foliage clumps grown before distant masses merge them; zero for bare wood and fronds.
  clumps: number
  // Furthest horizontal reach of the template from its origin, for spacing placements.
  crownRadius: number
  sway: SwayHooks
}

function grow(options: TreeTemplateOptions) {
  const form = treeSpecies[options.species]
  const streams = seedStreams(options.species, options.seed)
  switch (form.habit) {
    case 'tree': return { ...growTree(form, options, streams), foliageRecipe: form.foliage, budget: form.budget }
    case 'mound': return { ...growMound(form, options, streams), foliageRecipe: form.foliage, budget: 'shrub' as const }
    case 'fronds': return { ...growFronds(form, options, streams), foliageRecipe: 'broadleaf' as const, budget: 'shrub' as const, clumps: 0 }
    case 'snag': return { ...growSnag(form, options, streams), foliageRecipe: 'needles' as const, budget: 'deadwood' as const, clumps: 0 }
    case 'log': return { ...growLog(form, options, streams), foliageRecipe: 'needles' as const, budget: 'deadwood' as const, clumps: 0 }
  }
}

function middle(mesh: MeshData): Vec3 {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  mesh.positions.forEach((value, i) => {
    min[i % vertexStride] = Math.min(min[i % vertexStride], value)
    max[i % vertexStride] = Math.max(max[i % vertexStride], value)
  })
  return [(min[0] + max[0]) * half, (min[1] + max[1]) * half, (min[2] + max[2]) * half]
}

// Babylon only blends vertex alpha when a mesh opts in, so alpha is free to carry sway weight.
function writeSwayWeight(mesh: MeshData, height: number) {
  for (let i = 0; i < mesh.positions.length / vertexStride; i++) {
    mesh.colors[i * colorStride + alphaChannel] = clamp(mesh.positions[i * vertexStride + 1] / height)
  }
}

function reachOf(mesh: MeshData) {
  let reach = 0
  for (let i = 0; i < mesh.positions.length; i += vertexStride) reach = Math.max(reach, Math.hypot(mesh.positions[i], mesh.positions[i + zComponent]))
  return reach
}

// Pure geometry for one template: arrays a test can measure and a mesh factory can upload.
// Every face is split to its own corners so the island's flat shading shows each facet.
export function generateTreeGeometry(options: TreeTemplateOptions): TreeGeometry {
  const grown = grow(options)
  const bark = facet(grown.bark), foliage = facet(grown.foliage)
  const collision = grown.collision
  const height = collision.shape === 'upright' ? collision.height : collision.axisHeight + collision.radius
  const crownCenter = foliage.positions.length ? middle(foliage) : middle(bark)
  writeSwayWeight(bark, height)
  writeSwayWeight(foliage, height)
  return {
    bark,
    foliage,
    foliageRecipe: grown.foliageRecipe,
    collision,
    budget: grown.budget,
    clumps: grown.clumps,
    crownRadius: Math.max(reachOf(bark), reachOf(foliage)),
    triangles: triangleCount(bark) + triangleCount(foliage),
    sway: { trunkBase: [0, 0, 0], crownCenter, height },
  }
}

export const templateBudget = (geometry: TreeGeometry, tier: TreeTemplateOptions['tier']) => templateBudgets[geometry.budget][tier]
