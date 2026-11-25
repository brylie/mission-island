import type { Material } from '@babylonjs/core/Materials/material'
import type { MeshFactory } from '../island-meshes'
import { roadFieldsAttribute, roadFieldsSize, roadRutsAttribute } from '../road-material'
import type { Point } from '../world'
import { buildRoadNetworkMesh, type RoadMeshSource } from './road-network-mesh'

// The road network's surface: one mesh over every road, paved and graded, with its road material.
// The mesh is built by `buildRoadNetworkMesh`; this puts it in the scene.
export function createRoadNetworkSurface(meshes: MeshFactory, source: RoadMeshSource, heightAt: (point: Point) => number, material: Material) {
  const built = buildRoadNetworkMesh(source, heightAt)
  if (!built.indices.length) return undefined
  const mesh = meshes.surface('Road network', built.positions, built.indices, material, undefined, built.uvs)
  mesh.setVerticesData(roadFieldsAttribute, built.fields, false, roadFieldsSize)
  mesh.setVerticesData(roadRutsAttribute, built.ruts, false, 1)
  mesh.freezeWorldMatrix()
  return mesh
}
