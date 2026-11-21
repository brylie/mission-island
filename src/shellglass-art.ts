import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { poseSiteFeature } from './assets/site-props'
import type { MeshFactory } from './island-meshes'
import { createOceanMaterial } from './ocean'
import { shoreDefaults, type ShoreSettings } from './shader-studies'
import { createPhenomena } from './island-phenomena'
import { groundHeight, tidePool, walkingHeight } from './terrain'
import { shellglassHigh, shellglassLow, shellglassPockets, shellglassTideAt, shellglassWash } from './shellglass-tide'
import type { SiteFeature } from './worlds/site-feature'
import type { WildlifeFrame } from './wildlife'

const vertexSource = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 world, worldViewProjection;
varying vec2 texCoord;
varying vec3 point;
void main() {
  texCoord = uv;
  point = (world * vec4(position, 1.)).xyz;
  gl_Position = worldViewProjection * vec4(position, 1.);
}
`

function tideMaterial(meshes: MeshFactory, name: string, fragment: string, uniforms: string[]) {
  const material = new ShaderMaterial(name, meshes.scene, { vertexSource, fragmentSource: `
    precision highp float;
    varying vec2 texCoord;
    varying vec3 point;
    ${fragment}
  ` }, { attributes: ['position', 'uv'], uniforms: ['world', 'worldViewProjection', ...uniforms], needAlphaBlending: true })
  material.backFaceCulling = false
  material.disableDepthWrite = true
  return material
}

// Rotate the wash and wet rock strip to follow the existing basin.
function basinPoint(x: number, z: number) {
  const { cos, sin } = shellglassWash
  return { x: tidePool.x + cos * x + sin * z, z: tidePool.z - sin * x + cos * z }
}

function buildWetRim(meshes: MeshFactory) {
  const material = tideMaterial(meshes, 'Wet Shellglass stone', `
    uniform float light, level, wetRim;
    void main() {
      float border = 1. - smoothstep(.81, .98, length(texCoord));
      float exposed = smoothstep(level - .012, level + .018, point.y);
      float dampness = 1. - smoothstep(wetRim - .025, wetRim + .008, point.y);
      float grain = .87 + .13 * sin(point.x * 24. + sin(point.z * 29.));
      gl_FragColor = vec4(vec3(.185,.277,.235) * light, border * exposed * dampness * grain * .82);
    }
  `, ['light', 'level', 'wetRim'])
  const n = 38
  const points: number[] = [], uv: number[] = [], indices: number[] = []
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const u = 2 * i / n - 1, v = 2 * j / n - 1
    const point = basinPoint(u * 3.15, v * 2.22)
    points.push(point.x, groundHeight(point) + 0.024, point.z)
    uv.push(u, v)
    if (i && j) {
      const a = j * (n + 1) + i
      indices.push(a - n - 2, a - n - 1, a, a - n - 2, a, a - 1)
    }
  }
  const mesh = meshes.surface('Wet rock rim', points, indices, material, undefined, uv)
  mesh.alphaIndex = 1
  return { mesh, material }
}

function makeWater(meshes: MeshFactory, name: string, material: ShaderMaterial, pointAt: (x: number, z: number) => { x: number, z: number }) {
  const center = pointAt(0, 0)
  const positions = [center.x, 0, center.z], indices: number[] = [], uv = [0, 0]
  for (let i = 0; i < 64; i++) {
    const angle = i * Math.PI / 32, u = Math.cos(angle), v = Math.sin(angle)
    const point = pointAt(u, v)
    positions.push(point.x, 0, point.z)
    uv.push(u, v)
    indices.push(0, i + 1, 1 + (i + 1) % 64)
  }
  const surface = meshes.surface(name, positions, indices, material, undefined, uv)
  surface.alphaIndex = 2
  return surface
}

function stonePocket(meshes: MeshFactory, pocket: typeof shellglassPockets[number], index: number) {
  const { x, z, rx, rz, level } = pocket
  const ringPoint = (angle: number, scale: number) => {
    const scallop = scale * (1 + 0.09 * Math.sin(3 * angle + index) + 0.07 * Math.cos(5 * angle + 2 * index))
    return { x: x + rx * scallop * Math.cos(angle), z: z + rz * scallop * Math.sin(angle) }
  }
  const vertices: number[] = [], indices: number[] = []
  for (const ring of [0, 1, 2]) for (let i = 0; i < 18; i++) {
    const angle = i * Math.PI / 9
    const p = ringPoint(angle, [1.16, 0.86, 0.66][ring])
    const floor = groundHeight(p)
    const height = ring === 0
      ? floor - 0.014
      : ring === 1
        ? Math.max(floor + 0.013, level + 0.028 + Math.sin(angle * 3) * 0.019)
        : floor - 0.014
    vertices.push(p.x, height, p.z)
    if (ring) {
      const a = (ring - 1) * 18 + i, b = (ring - 1) * 18 + (i + 1) % 18
      indices.push(a, b + 18, a + 18, a, b, b + 18)
    }
  }
  const rock = meshes.paint(index % 2 ? '#77806b' : '#6a7866')
  rock.backFaceCulling = false
  return meshes.surface('Scalloped Shellglass rock pocket', vertices, indices, rock)
}

function addWrack(meshes: MeshFactory) {
  // Walk up the landward bank to the last high-water contour.
  for (let i = 0; i < 24; i++) {
    const angle = 0.65 + i * 0.123
    let point = basinPoint(0, 0)
    for (let r = 0.55; r <= 1; r += 0.015) {
      point = basinPoint(Math.cos(angle) * r * 2.65, Math.sin(angle) * r * 1.82)
      if (groundHeight(point) > shellglassHigh + 0.012) break
    }
    const y = groundHeight(point) + 0.025
    const weed = meshes.sphere(point.x, y, point.z, 0.19 + 0.08 * Math.sin(i * 1.7), 0.065, 0.093, i % 3 ? '#786c40' : '#657049', undefined, false, 5)
    weed.rotation.y = angle + Math.PI / 2
  }
}

export function createShellglassTide(meshes: MeshFactory, staff?: SiteFeature) {
  const water = tideMaterial(meshes, 'Shellglass tide and retained pools', `
    uniform float time, light;
    void main() {
      float radius = length(texCoord);
      float wave = sin(dot(point.xz, vec2(6.3,4.1)) - time * 2.6 + sin(point.z * 5.1 + time));
      float shard = max(0., sin(dot(point.xz,vec2(-5.1,9.2)) + time * 2.2));
      vec3 color = mix(vec3(.12,.43,.42),vec3(.42,.71,.63),.32 + wave * .13 + shard * .16);
      color += vec3(.17,.19,.14) * pow(max(0.,wave * shard), 5.);
      float edge = 1. - smoothstep(.81,1.,radius);
      gl_FragColor = vec4(color * light, edge * .66);
    }
  `, ['time', 'light'])
  const shoreWash = createOceanMaterial(meshes.scene, 'wash')
  const wash = makeWater(meshes, 'Shellglass wash', water, (x, z) => basinPoint(x * shellglassWash.rx, z * shellglassWash.rz))
  const rim = buildWetRim(meshes)
  const pockets = shellglassPockets.map((pocket, i) => {
    const rock = stonePocket(meshes, pocket, i)
    const surface = makeWater(meshes, 'Retained water in rock pocket', water, (u, v) =>
      ({ x: pocket.x + u * pocket.rx * 0.86, z: pocket.z + v * pocket.rz * 0.86 }))
    surface.position.y = pocket.level
    return { rock, surface }
  })
  const glows = shellglassPockets.map(({ x, z, level }, i) => ({
    x,
    z,
    y: Number(level),
    extent: 0.43,
    kind: 'glow' as const,
    name: 'Shellglass pocket plankton',
    seed: 6787 + i,
  }))
  const plankton = createPhenomena(meshes.scene, glows)
  addWrack(meshes)

  const mark = staff ? new TransformNode('Shellglass tide staff wet mark', meshes.scene) : undefined
  if (mark && staff) poseSiteFeature(mark, staff, walkingHeight)
  const wetMark = mark ? meshes.box(0, 0.19, -0.14, 0.10, 1, 0.012, '#3b7e7c', mark, false) : undefined
  const cap = mark ? meshes.box(0, 0.35, -0.148, 0.134, 0.038, 0.012, '#c7e7ca', mark, false) : undefined

  return (frame: WildlifeFrame, light: number, islandTime: number, shore: ShoreSettings = shoreDefaults) => {
    const tide = shellglassTideAt(islandTime)
    const near = Math.hypot(frame.camera.x - tidePool.x, frame.camera.z - tidePool.z) < 42 && frame.camera.y < 36
    wash.setEnabled(near)
    rim.mesh.setEnabled(near)
    // Add the small height offset above the ocean plane only inside the basin.
    wash.position.y = tide.level
    wash.material = shore.quality === 'off' ? water : shoreWash.material
    if (near && shore.quality !== 'off') shoreWash.pose(frame.time, light, frame.weather.rain, shore, tide.level)
    water.setFloat('time', frame.time)
    water.setFloat('light', light * (1 - frame.weather.rain * 0.18))
    rim.material.setFloat('light', light)
    rim.material.setFloat('level', tide.level)
    rim.material.setFloat('wetRim', tide.wetRim)
    pockets.forEach(({ rock, surface }, i) => {
      const pocket = shellglassPockets[i]
      rock.setEnabled(near)
      surface.setEnabled(near && tide.level < pocket.level - 0.007)
      glows[i].y = Math.max(tide.level, pocket.level) - 0.017
    })
    if (wetMark && cap) {
      wetMark.setEnabled(near)
      cap.setEnabled(near)
      const fill = 0.05 + 0.60 * (tide.level - shellglassLow) / (shellglassHigh - shellglassLow)
      wetMark.scaling.y = fill
      wetMark.position.y = 0.16 + fill / 2
      cap.position.y = 0.16 + fill
    }
    plankton(frame)
    return { tide, near }
  }
}
