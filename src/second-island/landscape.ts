import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { ribbonGeometry } from '../routes'
import { habitatColor } from './habitats'
import { createSoundMaterial } from './sea'
import { ferryTrack, fishingPier, routes, sampleRoute } from './routes'
import type { Route } from './routes'
import { lowerLake, pavedYards, runway, seaLevel, sites, tarn, viaductWalk, waterBounds } from './sites'
import { airfieldDistance, bridgeAt, cols, deckPoint, deckSection, fallsX, fallsY, gridStep, groundHeight, heightGrid,
  nearestRoad, riverY, riverZ, rows, shoreDistance, siteDistance, surfaceHeight } from './terrain'

export const palette = {
  sea: [49, 117, 133], shoal: [101, 170, 162], yard: [186, 166, 129],
} as const

function terrainColor(x: number, y: number, z: number) {
  const noise = .97 + .027 * Math.sin(x * .09 + z * .07) + .019 * Math.cos(z * .14 - x * .12)
  const yard = sites.some((site) => !['fields', 'cemetery'].includes(site.id) && siteDistance(x, z, site) <= 0)
  const color = yard ? palette.yard : habitatColor(x, y, z)
  return color.map((channel) => channel * noise)
}

function createTerrain(meshes: MeshFactory) {
  const height = heightGrid(), tile = 24
  const material = meshes.paint('#ffffff')
  const { minX, minZ } = waterBounds
  for (let iz = 0; iz < rows - 1; iz += tile) for (let ix = 0; ix < cols - 1; ix += tile) {
    const ex = Math.min(ix + tile, cols - 1), ez = Math.min(iz + tile, rows - 1)
    const x0 = minX + ix * gridStep, z0 = minZ + iz * gridStep
    if (!couldSeeTerrain(x0, z0, ex - ix, ez - iz)) continue
    const positions: number[] = [], indices: number[] = [], colors: number[] = []
    const stride = ex - ix + 1
    for (let z = iz; z <= ez; z++) for (let x = ix; x <= ex; x++) {
      const px = minX + x * gridStep, pz = minZ + z * gridStep, y = height[z * cols + x]
      positions.push(px, y, pz)
      const rgb = terrainColor(px, y, pz)
      colors.push(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, 1)
      if (x === ex || z === ez) continue
      const a = (z - iz) * stride + x - ix
      indices.push(a, a + 1, a + stride, a + 1, a + stride + 1, a + stride)
    }
    const mesh = meshes.surface(`Ground ${ix},${iz}`, positions, indices, material)
    mesh.setVerticesData(VertexBuffer.ColorKind, colors)
    // Identical central differences across tile borders keep lighting continuous.
    const normals: number[] = []
    for (let z = iz; z <= ez; z++) for (let x = ix; x <= ex; x++) {
      const dx = height[z * cols + Math.min(x + 1, cols - 1)] - height[z * cols + Math.max(x - 1, 0)]
      const dz = height[Math.min(z + 1, rows - 1) * cols + x] - height[Math.max(z - 1, 0) * cols + x]
      const length = Math.hypot(dx, 2 * gridStep, dz)
      normals.push(-dx / length, 2 * gridStep / length, -dz / length)
    }
    mesh.setVerticesData(VertexBuffer.NormalKind, normals)
    mesh.freezeWorldMatrix()
  }
}

function couldSeeTerrain(x: number, z: number, width: number, depth: number) {
  const halfX = width * gridStep / 2, halfZ = depth * gridStep / 2
  return shoreDistance(x + halfX, z + halfZ) + Math.hypot(halfX, halfZ) > -26
}

function strip(meshes: MeshFactory, name: string, points: readonly number[][], color: string) {
  const indices: number[] = []
  for (let i = 2; i < points.length; i += 2) indices.push(i - 2, i - 1, i, i - 1, i + 1, i)
  const mesh = meshes.surface(name, points.flat(), indices, color)
  mesh.freezeWorldMatrix()
}

function createWater(meshes: MeshFactory) {
  const minX = -1600, minZ = -1600, maxX = 1600, maxZ = 1600
  const y = seaLevel - .005
  const color = createSoundMaterial(meshes.scene)
  const sea = meshes.surface('Saltwind Sound', [minX, y, minZ, maxX, y, minZ, maxX, y, maxZ, minX, y, maxZ], [0, 1, 2, 0, 2, 3], color)
  sea.freezeWorldMatrix()
  for (const lake of [lowerLake, tarn]) {
    const points = [lake.x, lake.y, lake.z], indices: number[] = []
    for (let i = 0; i <= 96; i++) {
      const angle = i * Math.PI / 48
      points.push(lake.x + Math.cos(angle) * lake.rx, lake.y, lake.z + Math.sin(angle) * lake.rz)
      if (i) indices.push(0, i, i + 1)
    }
    meshes.surface(lake === tarn ? 'Alder Tarn' : 'Mirror Lake', points, indices, '#75afb3').freezeWorldMatrix()
  }
  const river: number[][] = []
  for (let x = -444; x <= -87; x++) {
    const y = riverY(x) - .009, z = riverZ(x)
    river.push([x, y, z + 9], [x, y, z - 9])
  }
  strip(meshes, 'Reedwater River', river, '#6ba9ad')
  const stream: number[][] = []
  for (let z = 123; z <= 199; z++) stream.push([fallsX(z) - 3.2, fallsY(z), z], [fallsX(z) + 3.2, fallsY(z), z])
  strip(meshes, 'Tarnstep Falls', stream, '#b5d8d6')
  const foamRoot = new TransformNode('Falls foam', meshes.scene)
  const foam = Array.from({ length: 12 }, (_, i) => meshes.box(0, 0, 0, .24, .075, 1.05 + i % 3 * .35, '#e4ebe1', foamRoot, false))
  return (time: number, light: number) => {
    color.setFloat('time', time)
    color.setFloat('light', light)
    for (const [i, fleck] of foam.entries()) {
      const z = 196 - (time * 7 + i * 5.79) % 54
      const x = fallsX(z) + ((i * 47 % 71) / 71 - .5) * 5.6
      fleck.position.set(x, fallsY(z) + .13, z)
      fleck.rotation.x = -Math.atan2(fallsY(z + .5) - fallsY(z - .5), 1)
    }
  }
}

function createRoad(meshes: MeshFactory, route: Route) {
  const board = route === ferryTrack || route === fishingPier
  const positions: number[] = [], indices: number[] = []
  route.samples.forEach((sample, i) => {
    for (const p of deckSection(sample, route)) positions.push(p.x, p.y, p.z)
    if (!i) return
    for (const lane of [0, 1]) {
      const a = (i - 1) * 3 + lane, b = a + 3
      indices.push(a, a + 1, b, a + 1, b + 1, b)
    }
  })
  meshes.surface(route.name, positions, indices, board ? '#ae987b' : '#69716b').freezeWorldMatrix()
  const length = route.samples.at(-1)?.distance ?? 0
  for (let distance = 3; distance < length - 3; distance += 13) {
    if (board || route.width < 8) break
    const p = sampleRoute(route, distance)
    if (nearestRoad(p.x, p.z, false, route).distance >= 8) {
      const y = deckPoint(p, 0, route).y
      const mark = meshes.box(p.x, y + .036, p.z, .14, .014, 2.35, '#e6d9aa', undefined, false)
      mark.rotation.y = p.yaw
      const a = sampleRoute(route, distance - 1)
      const b = sampleRoute(route, distance + 1)
      mark.rotation.x = -Math.atan2(deckPoint(b, 0, route).y - deckPoint(a, 0, route).y, 2)
    }
  }
  const spans: [number, number][] = []
  let start: number | undefined
  for (const p of route.samples) {
    if (bridgeAt(route, p)) {
      start ??= p.distance
    } else if (start !== undefined) {
      spans.push([start, p.distance])
      start = undefined
    }
  }
  if (route === fishingPier) spans.push([2, length - .24])
  if (route === ferryTrack) spans.push([16, length - .24])
  for (const [from, to] of spans) addRails(meshes, route, from, to)
}

function addRails(meshes: MeshFactory, route: Route, from: number, to: number) {
  const count = Math.ceil((to - from) / 5.5)
  for (const side of [-1, 1]) {
    const offset = side * (route.width / 2 - .24)
    let previous: ReturnType<typeof deckPoint> | undefined
    for (let i = 0; i <= count; i++) {
      const sample = sampleRoute(route, from + (to - from) * i / count)
      const p = deckPoint(sample, offset, route)
      meshes.box(p.x, p.y + .38, p.z, .22, .80, .22, '#e7d6b2')
      if (i % 2 === 0 && p.y - groundHeight(p.x, p.z) > .46) {
        const corners = [-.38, .38].flatMap((dx) =>
          [-.44, .44].map((dz) => groundHeight(p.x + dx, p.z + dz)))
        const bottom = Math.min(...corners) - .28
        const height = p.y - bottom
        meshes.box(p.x, bottom + height / 2, p.z, .76, height, .88, '#93968a')
      }
      if (previous) {
        const dx = p.x - previous.x, dy = p.y - previous.y, dz = p.z - previous.z
        const length = Math.hypot(dx, dz)
        const x = (p.x + previous.x) / 2, y = (p.y + previous.y) / 2, z = (p.z + previous.z) / 2
        for (const [height, level, color] of [[.13, .65, '#e7d6b2'], [.36, -.17, '#878277']] as const) {
          const beam = meshes.box(x, y + level, z, .22, height, Math.hypot(length, dy), color)
          beam.rotation.set(-Math.atan2(dy, length), Math.atan2(dx, dz), 0)
        }
      }
      previous = p
    }
  }
}

function createAirstrip(meshes: MeshFactory) {
  const { x, z, width, length, y } = runway
  for (const pad of pavedYards.filter(({ id }) => ['runway', 'taxi', 'air-apron'].includes(id))) {
    meshes.box(pad.x, pad.y - .045, pad.z, pad.width, .09, pad.depth, pad.id === 'air-apron' ? '#777d72' : '#646b65', undefined, false)
  }
  for (const side of [-1, 1]) {
    meshes.box(x, y + .077, z + side * (width / 2 - .78), length - 4, .011, .20, '#f7e3bc', undefined, false)
    for (let i = 0; i < 7; i++) meshes.box(x + side * (length / 2 - 8), y + .079, z + (i - 3) * 1.65, 7.6, .012, .41, '#faf0ce', undefined, false)
  }
  for (let i = -7; i <= 7; i++) meshes.box(x + i * 24, y + .078, z, 10, .013, .24, '#fff1c4', undefined, false)
  const wx = 231, wz = -119
  meshes.cylinder(wx, y + 3.05, wz, .13, .19, 6.1, 9, '#805d48')
  meshes.box(wx + 1.10, y + 5.89, wz, 2.35, .51, .55, '#dc774f').rotation.z = -.19
  for (const dx of [.53, 1.56]) meshes.box(wx + dx, y + 6.05 - dx * .19, wz, .29, .53, .57, '#f1ddae').rotation.z = -.19
}

export function clearAirfield(x: number, z: number) { return airfieldDistance(x, z) < 2 }

export function createLandscape(meshes: MeshFactory) {
  createTerrain(meshes)
  const water = createWater(meshes)
  for (const route of [...routes, ferryTrack, fishingPier]) createRoad(meshes, route)
  const points = viaductWalk.path.flatMap((point, i, path) => {
    const next = path[i + 1]
    if (!next) return [point]
    const steps = Math.ceil(Math.hypot(point.x - next.x, point.z - next.z) * 2)
    return Array.from({ length: steps }, (_, s) => ({
      x: point.x + (next.x - point.x) * s / steps, z: point.z + (next.z - point.z) * s / steps,
    }))
  })
  const trail = ribbonGeometry([points], 1.25, 0)
  for (let i = 0; i < trail.positions.length; i += 3) {
    trail.positions[i + 1] = surfaceHeight(trail.positions[i], trail.positions[i + 2]) + .07
  }
  meshes.surface('Viaduct survey footpath', trail.positions, trail.indices, '#cbb58a').freezeWorldMatrix()
  createAirstrip(meshes)
  return water
}
