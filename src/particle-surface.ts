import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { Scene } from '@babylonjs/core/scene'
import type { particleAppearance } from './particle-motion'
import type { ParticleRecipe } from './assets/particle-recipes'
import { createParticleTexture } from './assets/particle-texture'

type Appearance = ReturnType<typeof particleAppearance>

const corners = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]

export function createSurfaceParticles(scene: Scene, name: string, recipe: ParticleRecipe, capacity: number) {
  const mesh = new Mesh(name, scene)
  mesh.isPickable = false
  mesh.alwaysSelectAsActiveMesh = true
  mesh.alphaIndex = 3
  const material = new ShaderMaterial(name, scene, {
    vertexSource: `
      precision highp float;
      attribute vec3 position;
      attribute vec2 uv;
      attribute vec4 color;
      uniform mat4 worldViewProjection;
      varying vec2 texCoord;
      varying vec4 tint;
      void main() {
        texCoord = uv;
        tint = color;
        gl_Position = worldViewProjection * vec4(position, 1.);
      }
    `,
    fragmentSource: `
      precision mediump float;
      uniform sampler2D shape;
      varying vec2 texCoord;
      varying vec4 tint;
      void main() {
        gl_FragColor = texture2D(shape, texCoord) * tint;
      }
    `,
  }, { attributes: ['position', 'uv', 'color'], uniforms: ['worldViewProjection'], samplers: ['shape'], needAlphaBlending: true })
  material.backFaceCulling = false
  material.disableDepthWrite = true
  material.setTexture('shape', createParticleTexture(scene, recipe.shape))
  mesh.material = material

  const positions = new Float32Array(capacity * 12)
  const colors = new Float32Array(capacity * 16)
  const uv = new Float32Array(capacity * 8)
  const indices = new Uint16Array(capacity * 6)
  for (let i = 0; i < capacity; i++) {
    const vertex = i * 4
    uv.set([0, 0, 1, 0, 1, 1, 0, 1], i * 8)
    indices.set([vertex, vertex + 1, vertex + 2, vertex, vertex + 2, vertex + 3], i * 6)
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
        const vertex = index * 4 + corner
        positions[vertex * 3] = x + wide * cos + (ground ? tall * sin : 0)
        positions[vertex * 3 + 1] = y + (ground ? 0 : tall)
        positions[vertex * 3 + 2] = z - wide * sin + (ground ? tall * cos : 0)
        colors[vertex * 4] = r
        colors[vertex * 4 + 1] = g
        colors[vertex * 4 + 2] = b
        colors[vertex * 4 + 3] = a
      }
    },
    finish(count: number) {
      mesh.isVisible = count > 0
      if (!count) return
      batch.indexCount = count * 6
      mesh.updateVerticesData(VertexBuffer.PositionKind, positions)
      mesh.updateVerticesData(VertexBuffer.ColorKind, colors)
    },
  }
}
