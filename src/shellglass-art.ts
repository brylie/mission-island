import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { shellglassStaffWaterMark, shellglassWaterShapes, shellglassWrack } from './assets/geometry/shellglass'
import { poseSiteFeature } from './assets/site-props'
import type { MeshFactory } from './island-meshes'
import { createOceanMaterial } from './ocean'
import { shoreDefaults, type ShoreSettings } from './shader-studies'
import { createPhenomena } from './island-phenomena'
import { groundHeight, tidePool, walkingHeight } from './terrain'
import { shellglassHigh, shellglassLow, shellglassPockets, shellglassTideAt, shellglassWash } from './shellglass-tide'
import { shellglassBasin } from './worlds/starter/layout/terrain'
import type { SiteFeature } from './worlds/site-feature'
import type { WildlifeFrame } from './wildlife'

const half = 0.5
const normalizedGridSpan = 2
const quarterTurn = Math.PI * half
const tideDetailDistance = 42
const tideDetailHeight = 36
const rainLightLoss = 0.18
const tidePocketRevealGap = 0.007
const planktonExtent = 0.43
const planktonSeed = 6787
const submergedGlowDepth = 0.017

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
  const { steps: n, rx, rz, yOffset, alphaIndex } = shellglassWaterShapes.rim
  const row = n + 1
  const points: number[] = [], uv: number[] = [], indices: number[] = []
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const u = normalizedGridSpan * i / n - 1, v = normalizedGridSpan * j / n - 1
    const point = basinPoint(u * rx, v * rz)
    points.push(point.x, groundHeight(point) + yOffset, point.z)
    uv.push(u, v)
    if (i && j) {
      const a = j * row + i
      const opposite = a - row - 1
      indices.push(opposite, a - row, a, opposite, a, a - 1)
    }
  }
  const mesh = meshes.surface('Wet rock rim', points, indices, material, undefined, uv)
  mesh.alphaIndex = alphaIndex
  return { mesh, material }
}

function makeWater(meshes: MeshFactory, name: string, material: ShaderMaterial, pointAt: (x: number, z: number) => { x: number, z: number }) {
  const center = pointAt(0, 0)
  const positions = [center.x, 0, center.z], indices: number[] = [], uv = [0, 0]
  const { segments, alphaIndex } = shellglassWaterShapes.fan
  for (let i = 0; i < segments; i++) {
    const angle = i * Math.PI / (segments * half), u = Math.cos(angle), v = Math.sin(angle)
    const point = pointAt(u, v)
    positions.push(point.x, 0, point.z)
    uv.push(u, v)
    indices.push(0, i + 1, 1 + (i + 1) % segments)
  }
  const surface = meshes.surface(name, positions, indices, material, undefined, uv)
  surface.alphaIndex = alphaIndex
  return surface
}

function stonePocket(meshes: MeshFactory, pocket: typeof shellglassPockets[number], index: number) {
  const { x, z, rx, rz, level } = pocket
  const { segments, ringScales, scallop: edge, rimLift, floorInset, rimAboveWater, rimVariation, rimFrequency, colors } = shellglassWaterShapes.pocket
  const ringPoint = (angle: number, scale: number) => {
    const scallop = scale * (1 + edge.innerAmplitude * Math.sin(edge.innerFrequency * angle + index) + edge.outerAmplitude * Math.cos(edge.outerFrequency * angle + edge.outerPhaseStep * index))
    return { x: x + rx * scallop * Math.cos(angle), z: z + rz * scallop * Math.sin(angle) }
  }
  const vertices: number[] = [], indices: number[] = []
  for (const [ring, scale] of ringScales.entries()) for (let i = 0; i < segments; i++) {
    const angle = i * Math.PI / (segments * half)
    const p = ringPoint(angle, scale)
    const floor = groundHeight(p)
    const height = ring === 1
      ? Math.max(floor + rimLift, level + rimAboveWater + Math.sin(angle * rimFrequency) * rimVariation)
      : floor - floorInset
    vertices.push(p.x, height, p.z)
    if (ring) {
      const a = (ring - 1) * segments + i, b = (ring - 1) * segments + (i + 1) % segments
      indices.push(a, b + segments, a + segments, a, b, b + segments)
    }
  }
  const rock = meshes.paint(colors[index % colors.length])
  rock.backFaceCulling = false
  return meshes.surface('Scalloped Shellglass rock pocket', vertices, indices, rock)
}

function addWrack(meshes: MeshFactory) {
  // Walk up the landward bank to the last high-water contour.
  const { count, firstAngle, angleStep, search, yOffset, width, widthJitter, jitterFrequency, height, depth, colors, segments } = shellglassWrack
  const { alongRadius, acrossRadius } = shellglassBasin
  for (let i = 0; i < count; i++) {
    const angle = firstAngle + i * angleStep
    let point = basinPoint(0, 0)
    for (let r = search.innerRadius; r <= 1; r += search.step) {
      point = basinPoint(Math.cos(angle) * r * alongRadius, Math.sin(angle) * r * acrossRadius)
      if (groundHeight(point) > shellglassHigh + search.aboveHighWater) break
    }
    const y = groundHeight(point) + yOffset
    const weed = meshes.sphere(point.x, y, point.z, width + widthJitter * Math.sin(i * jitterFrequency), height, depth, i % colors.greenEvery ? colors.dry : colors.green, undefined, false, segments)
    weed.rotation.y = angle + quarterTurn
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
  const { waterRadiusScale } = shellglassWaterShapes.pocket
  const pockets = shellglassPockets.map((pocket, i) => {
    const rock = stonePocket(meshes, pocket, i)
    const surface = makeWater(meshes, 'Retained water in rock pocket', water, (u, v) =>
      ({ x: pocket.x + u * pocket.rx * waterRadiusScale, z: pocket.z + v * pocket.rz * waterRadiusScale }))
    surface.position.y = pocket.level
    return { rock, surface }
  })
  const glows = shellglassPockets.map(({ x, z, level }, i) => ({
    x,
    z,
    y: Number(level),
    extent: planktonExtent,
    kind: 'glow' as const,
    name: 'Shellglass pocket plankton',
    seed: planktonSeed + i,
  }))
  const plankton = createPhenomena(meshes.scene, glows)
  addWrack(meshes)

  const mark = staff ? new TransformNode('Shellglass tide staff wet mark', meshes.scene) : undefined
  if (mark && staff) poseSiteFeature(mark, staff, walkingHeight)
  const { strip, cap: markCap, scale: fillScale } = shellglassStaffWaterMark
  const wetMark = mark ? meshes.box(...strip.shape, strip.color, mark, false) : undefined
  const cap = mark ? meshes.box(...markCap.shape, markCap.color, mark, false) : undefined

  return (frame: WildlifeFrame, light: number, islandTime: number, shore: ShoreSettings = shoreDefaults) => {
    const tide = shellglassTideAt(islandTime)
    const near = Math.hypot(frame.camera.x - tidePool.x, frame.camera.z - tidePool.z) < tideDetailDistance && frame.camera.y < tideDetailHeight
    wash.setEnabled(near)
    rim.mesh.setEnabled(near)
    // Add the small height offset above the ocean plane only inside the basin.
    wash.position.y = tide.level
    wash.material = shore.quality === 'off' ? water : shoreWash.material
    if (near && shore.quality !== 'off') shoreWash.pose(frame.time, light, frame.weather.rain, shore, tide.level)
    water.setFloat('time', frame.time)
    water.setFloat('light', light * (1 - frame.weather.rain * rainLightLoss))
    rim.material.setFloat('light', light)
    rim.material.setFloat('level', tide.level)
    rim.material.setFloat('wetRim', tide.wetRim)
    pockets.forEach(({ rock, surface }, i) => {
      const pocket = shellglassPockets[i]
      rock.setEnabled(near)
      surface.setEnabled(near && tide.level < pocket.level - tidePocketRevealGap)
      glows[i].y = Math.max(tide.level, pocket.level) - submergedGlowDepth
    })
    if (wetMark && cap) {
      wetMark.setEnabled(near)
      cap.setEnabled(near)
      const fill = fillScale.minimum + fillScale.span * (tide.level - shellglassLow) / (shellglassHigh - shellglassLow)
      wetMark.scaling.y = fill
      wetMark.position.y = fillScale.baseY + fill * half
      cap.position.y = fillScale.baseY + fill
    }
    plankton(frame)
    return { tide, near }
  }
}
