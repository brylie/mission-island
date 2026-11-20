import { Constants } from '@babylonjs/core/Engines/constants'
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial'
import { Vector2, Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import type { Weather } from '../protocol'
import { patchNoise } from '../shader-studies'
import type { Point, Pose } from '../world'

export interface EffectFrame {
  time: number
  camera: Point & { y: number }
  weather: Weather
  light: number
  lamp?: Pose & { y: number }
}

export interface Place extends Point { y: number }
type Blend = 'add' | 'alpha' | 'opaque'

interface Program {
  fragment: string
  deform?: string
  blend: Blend
  bias?: number
}

export interface Effect {
  root: TransformNode
  pose(frame: EffectFrame, response: number, detail?: number): void
}

export type Builder = (meshes: MeshFactory, origin: Place, studio: boolean) => Effect

const uniforms = ['world', 'worldViewProjection', 'clock', 'response', 'detail', 'eye',
  'sunDirection', 'daylight', 'rain', 'fogTint', 'fogNear', 'fogFar', 'lamp', 'beam']

const environment = `
uniform float clock;
uniform float response;
uniform float detail;
uniform float daylight;
uniform float rain;
uniform vec3 sunDirection;
uniform vec3 eye;
uniform vec3 lamp;
uniform vec2 beam;
`

const shading = `
vec3 diffuseLight(vec3 base, vec3 n) {
  float facing = max(0., dot(n, sunDirection));
  return base * (.23 + daylight * (.39 + .42 * facing));
}
float softBand(float value, float center, float width) {
  return 1. - smoothstep(width * .24, width, abs(value - center));
}
`

export function createEffect(meshes: MeshFactory, name: string, origin: Place, program: Program) {
  const { scene } = meshes
  const root = new TransformNode(name, scene)
  root.position.set(origin.x, origin.y, origin.z)
  const material = new ShaderMaterial(name, scene, {
    vertexSource: `
      precision highp float;
      attribute vec3 position;
      attribute vec3 normal;
      attribute vec2 uv;
      uniform mat4 world;
      uniform mat4 worldViewProjection;
      ${environment}
      varying vec2 texCoord;
      varying vec3 localPoint;
      varying vec3 worldPoint;
      varying vec3 normalW;
      void main() {
        vec3 p = position;
        ${program.deform ?? ''}
        texCoord = uv;
        localPoint = p;
        worldPoint = (world * vec4(p, 1.)).xyz;
        normalW = mat3(world) * normal;
        gl_Position = worldViewProjection * vec4(p, 1.);
      }
    `,
    fragmentSource: `
      precision highp float;
      varying vec2 texCoord;
      varying vec3 localPoint;
      varying vec3 worldPoint;
      varying vec3 normalW;
      ${environment}
      uniform vec3 fogTint;
      uniform float fogNear;
      uniform float fogFar;
      ${patchNoise}
      ${shading}
      void main() {
        vec3 n = normalize(normalW);
        vec3 toEye = normalize(eye - worldPoint);
        vec4 ink = vec4(0.);
        ${program.fragment}
        float fog = smoothstep(fogNear, fogFar, distance(eye, worldPoint));
        ${program.blend === 'opaque' ? 'ink.rgb = mix(ink.rgb, fogTint, fog);' : 'ink.a *= 1. - fog;'}
        gl_FragColor = vec4(ink.rgb, clamp(ink.a, 0., 1.));
      }
    `,
  }, { attributes: ['position', 'normal', 'uv'], uniforms, needAlphaBlending: program.blend !== 'opaque' })
  material.backFaceCulling = false
  material.disableDepthWrite = program.blend !== 'opaque'
  if (program.blend === 'add') material.alphaMode = Constants.ALPHA_ADD
  if (program.bias) material.zOffset = program.bias
  const sun = Vector3.Zero(), view = Vector3.Zero(), lampPoint = Vector3.Zero(), heading = Vector2.Zero()
  return {
    root,
    material,
    pose({ time, camera, weather, light, lamp }: EffectFrame, response: number, detail = 0) {
      const angle = (weather.hour - 6) * Math.PI / 12
      sun.set(-Math.cos(angle), Math.sin(angle), -.24).normalize()
      material.setVector3('sunDirection', sun)
      material.setVector3('eye', view.set(camera.x, camera.y, camera.z))
      material.setFloat('clock', time)
      if (lamp) {
        material.setVector3('lamp', lampPoint.set(lamp.x, lamp.y, lamp.z))
        material.setVector2('beam', heading.set(Math.sin(lamp.heading), Math.cos(lamp.heading)))
      }
      material.setFloat('daylight', light)
      material.setFloat('rain', weather.rain)
      material.setFloat('response', response)
      material.setFloat('detail', detail)
      material.setColor3('fogTint', scene.fogColor)
      material.setFloat('fogNear', scene.fogStart)
      material.setFloat('fogFar', Math.max(scene.fogStart + 1, scene.fogEnd))
    },
  }
}

type DrawEffect = ReturnType<typeof createEffect>

export function grid(meshes: MeshFactory, effect: DrawEffect, name: string, width: number, depth: number, divisions = 1,
  height: (x: number, z: number) => number = () => 0, layer = 4) {
  const vertices: number[] = [], uv: number[] = [], indices: number[] = []
  const stride = divisions + 1
  for (let j = 0; j <= divisions; j++) {
    for (let i = 0; i <= divisions; i++) {
      const u = i / divisions, v = j / divisions
      const x = width * (u - .5), z = depth * (v - .5)
      vertices.push(x, height(x, z), z)
      uv.push(u, v)
      if (i && j) {
        const d = j * stride + i, b = d - stride
        indices.push(b - 1, b, d, b - 1, d, d - 1)
      }
    }
  }
  const surface = meshes.surface(name, vertices, indices, effect.material, effect.root, uv)
  surface.alphaIndex = layer
  return surface
}

export function card(meshes: MeshFactory, effect: DrawEffect, name: string, width: number, height: number, billboards = false) {
  const mesh = CreatePlane(name, { width, height }, meshes.scene)
  mesh.parent = effect.root
  mesh.material = effect.material
  mesh.isPickable = false
  mesh.alphaIndex = 6
  if (billboards) mesh.billboardMode = Mesh.BILLBOARDMODE_ALL
  return mesh
}

export const boundaryFade = `
vec2 edge = min(texCoord, 1. - texCoord);
float border = smoothstep(0., .15, min(edge.x, edge.y));
`
