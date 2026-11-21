import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { Scene } from '@babylonjs/core/scene'
import { particleQuad, particleSurfaceShader } from './assets/effects/particle-surface'
import type { particleAppearance } from './particle-motion'
import type { ParticleRecipe } from './assets/recipes/particle-recipes'
import { createParticleTexture } from './assets/particle-texture'

type Appearance = ReturnType<typeof particleAppearance>

const coordinatesPerVertex = 3
const colorChannelsPerVertex = 4
const zOffset = 2
const blueOffset = 2
const alphaOffset = 3
const particleSurfaceAlphaIndex = 3
const { corners, uv: quadUV, indices: quadIndices } = particleQuad
const verticesPerQuad = corners.length
const indicesPerQuad = quadIndices.length

export function createSurfaceParticles(scene: Scene, name: string, recipe: ParticleRecipe, capacity: number) {
  const mesh = new Mesh(name, scene)
  mesh.isPickable = false
  mesh.alwaysSelectAsActiveMesh = true
  mesh.alphaIndex = particleSurfaceAlphaIndex
  const material = new ShaderMaterial(name, scene, particleSurfaceShader, { attributes: ['position', 'uv', 'color'], uniforms: ['worldViewProjection'], samplers: ['shape'], needAlphaBlending: true })
  material.backFaceCulling = false
  material.disableDepthWrite = true
  material.setTexture('shape', createParticleTexture(scene, recipe.shape))
  mesh.material = material

  const positions = new Float32Array(capacity * verticesPerQuad * coordinatesPerVertex)
  const colors = new Float32Array(capacity * verticesPerQuad * colorChannelsPerVertex)
  const uv = new Float32Array(capacity * quadUV.length)
  const indices = new Uint16Array(capacity * indicesPerQuad)
  for (let i = 0; i < capacity; i++) {
    const vertex = i * verticesPerQuad
    uv.set(quadUV, i * quadUV.length)
    indices.set(quadIndices.map((index) => vertex + index), i * indicesPerQuad)
  }
  mesh.setVerticesData(VertexBuffer.PositionKind, positions, true)
  mesh.setVerticesData(VertexBuffer.ColorKind, colors, true)
  mesh.setVerticesData(VertexBuffer.UVKind, uv)
  mesh.setIndices(indices)
  const batch = mesh.subMeshes[0]
  // Drawing only the live prefix makes this a non-global submesh for transparent sorting.
  batch.setBoundingInfo(mesh.getBoundingInfo())
  mesh.isVisible = false

  return {
    paint(index: number, frame: Appearance, r: number, g: number, b: number, a: number) {
      const ground = recipe.surface === 'ground'
      const { size, x, y, z, yaw, angle, stretch } = frame
      const facing = ground ? yaw - angle : yaw
      const sin = Math.sin(facing), cos = Math.cos(facing)
      for (let corner = 0; corner < corners.length; corner++) {
        const [u, v] = corners[corner]
        const wide = u * size * recipe.aspect, tall = v * size * stretch
        const vertex = index * verticesPerQuad + corner
        const positionOffset = vertex * coordinatesPerVertex
        const colorOffset = vertex * colorChannelsPerVertex
        positions[positionOffset] = x + wide * cos + (ground ? tall * sin : 0)
        positions[positionOffset + 1] = y + (ground ? 0 : tall)
        positions[positionOffset + zOffset] = z - wide * sin + (ground ? tall * cos : 0)
        colors[colorOffset] = r
        colors[colorOffset + 1] = g
        colors[colorOffset + blueOffset] = b
        colors[colorOffset + alphaOffset] = a
      }
    },
    finish(count: number) {
      mesh.isVisible = count > 0
      if (!count) return
      batch.indexCount = count * indicesPerQuad
      mesh.updateVerticesData(VertexBuffer.PositionKind, positions)
      mesh.updateVerticesData(VertexBuffer.ColorKind, colors)
    },
  }
}
