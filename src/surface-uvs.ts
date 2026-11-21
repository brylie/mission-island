import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'

export function boxSurfaceUVs(mesh: Mesh, alongX = false, phase = 0) {
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!
  const normals = mesh.getVerticesData(VertexBuffer.NormalKind)!
  const uvs = []
  for (let i = 0; i < positions.length; i += 3) {
    const [x, y, z] = [positions[i], positions[i + 1], positions[i + 2]]
    if (normals[i + 1]) {
      uvs.push(alongX ? z : x, (alongX ? x : z) + phase)
    }
    else if (normals[i]) {
      uvs.push(alongX ? z : y, (alongX ? y : z) + phase)
    }
    else {
      uvs.push(alongX ? y : x, (alongX ? x : y) + phase)
    }
  }
  mesh.setVerticesData(VertexBuffer.UVKind, uvs)
}

export function cylinderSurfaceUVs(mesh: Mesh, diameter: number, height: number, repeat: number) {
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!
  const normals = mesh.getVerticesData(VertexBuffer.NormalKind)!
  const baseUVs = mesh.getVerticesData(VertexBuffer.UVKind)!
  // Fit whole repeats around the circumference so the wrap has no open seam.
  const circumference = Math.max(1, Math.round(Math.PI * diameter / repeat)) * repeat
  const uvs = []
  for (let i = 0, uv = 0; i < positions.length; i += 3, uv += 2) {
    if (Math.abs(normals[i + 1]) > 0.99) uvs.push(positions[i] * mesh.scaling.x, positions[i + 2] * mesh.scaling.z)
    else uvs.push(baseUVs[uv] * circumference, baseUVs[uv + 1] * height)
  }
  mesh.setVerticesData(VertexBuffer.UVKind, uvs)
}
