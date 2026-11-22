import { MultiMaterial } from '@babylonjs/core/Materials/multiMaterial'
import { SubMesh } from '@babylonjs/core/Meshes/subMesh'
import { airstripMarkings, saltwindLandscapePalette, saltwindRoads, saltwindWalkFinish, terrainFinish, waterSurface, windsock } from '../assets/geometry/saltwind-landscape'
import { wetSandTint } from '../assets/geometry/shore-finish'
import { createTrail } from '../assets/routes'
import { dressStrand } from '../assets/strand'
import type { ScenerySolids } from './walking'
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import type { MeshFactory } from '../island-meshes'
import { ribbonGeometry } from '../math/ribbon'
import { airstripWindsock, reedwater, sandspitBeach, tarnstep } from '../worlds/saltwind/layout/terrain'
import { villageWalks } from './footways'
import { habitatColor } from './habitats'
import { createCascadeMaterial, createLakeMaterial, createSoundMaterial } from './sea'
import { ferryTrack, fishingPier, routes, sampleRoute } from './routes'
import type { Route } from './routes'
import { lowerLake, pavedYards, runway, seaLevel, sites, tarn, discoveryWalks, picnicLedge, waterBounds } from './sites'
import { airfieldDistance, bridgeAt, cols, deckPoint, deckSection, fallsWidth, fallsX, fallsY, gridStep, groundHeight, heightGrid, nearestRoad, riverY, riverZ, rows, shoreDistance, siteDistance, surfaceHeight } from './terrain'

const halves = 2
const vertexComponents = 3
const zComponent = 2
const rgbChannelMax = 255
const terrainTileCells = 24
const offshoreRenderReach = 26
const yardSites = sites.filter((site) => site.id !== 'fields' && site.id !== 'cemetery')

function terrainColor(x: number, y: number, z: number) {
  const { noise, yard, tarnstepBank, picnicShelf, slate } = terrainFinish
  const { ripple, grain } = noise
  const variation = noise.base + ripple.amplitude * Math.sin(x * ripple.xFrequency + z * ripple.zFrequency)
    + grain.amplitude * Math.cos(z * grain.zFrequency - x * grain.xFrequency)
  let edge = Infinity
  for (const site of yardSites) edge = Math.min(edge, siteDistance(x, z, site))
  const yardBlend = Math.max(0, Math.min(1, (-edge + yard.edgeOffset) / yard.blendWidth)) * yard.opacity
  const color = habitatColor(x, y, z).map((channel, i) => channel + (saltwindLandscapePalette.yard[i] - channel) * yardBlend)
  const { zBlend, extension, sideBlend, maxZ } = tarnstepBank
  let bank = 0
  if (z > tarnstep.cutMinZ && z < maxZ) {
    const bankWidth = fallsWidth(z) + extension
    bank = Math.max(0, Math.min(1, (z - tarnstep.cutMinZ) / zBlend, (maxZ - z) / zBlend, (bankWidth - Math.abs(x - fallsX(z))) / sideBlend))
  }
  const ledge = Math.max(0, 1 - Math.hypot((x - picnicLedge.x) / picnicShelf.radiusX, (z - picnicLedge.z - picnicShelf.centerOffsetZ) / picnicShelf.radiusZ))
  const strata = slate.base + slate.amplitude * Math.sin(y * slate.yFrequency + x * slate.xFrequency)
  return color.map((channel, i) => (channel + (slate.color[i] * strata - channel) * Math.max(bank, ledge)) * variation)
}

function createTerrain(meshes: MeshFactory) {
  const height = heightGrid(), tile = terrainTileCells
  const { sand: beachBounds } = sandspitBeach
  const { sand: beachFinish } = terrainFinish
  const material = meshes.paint('#ffffff')
  const shore = new MultiMaterial('Sandspit beach and upland', meshes.scene)
  shore.subMaterials = [material, meshes.paintSurface('sand', '#ffffff')]
  const { minX, minZ } = waterBounds
  for (let iz = 0; iz < rows - 1; iz += tile) for (let ix = 0; ix < cols - 1; ix += tile) {
    const ex = Math.min(ix + tile, cols - 1), ez = Math.min(iz + tile, rows - 1)
    const x0 = minX + ix * gridStep, z0 = minZ + iz * gridStep
    if (!couldSeeTerrain(x0, z0, ex - ix, ez - iz)) continue
    const positions: number[] = [], indices: number[] = [], colors: number[] = []
    const sand: number[] = [], uvs: number[] = []
    const stride = ex - ix + 1
    for (let z = iz; z <= ez; z++) for (let x = ix; x <= ex; x++) {
      const px = minX + x * gridStep, pz = minZ + z * gridStep, y = height[z * cols + x]
      positions.push(px, y, pz)
      uvs.push((px - pz) / beachFinish.uvScale, (pz + px * beachFinish.uvSkew) / beachFinish.uvScale)
      const rgb = terrainColor(px, y, pz)
      const byPier = px >= beachBounds.minX && px <= beachBounds.maxX && pz < beachBounds.maxZ
      if (byPier && y < 0) {
        const wet = Math.min(1, -y / wetSandTint.depth)
        rgb[0] *= 1 - wetSandTint.redLoss * wet
        rgb[1] *= 1 - wetSandTint.greenLoss * wet
        rgb[2] *= 1 + wetSandTint.blueGain * wet
      }
      colors.push(rgb[0] / rgbChannelMax, rgb[1] / rgbChannelMax, rgb[2] / rgbChannelMax, 1)
      if (x === ex || z === ez) continue
      const a = (z - iz) * stride + x - ix
      const faces = byPier && y < beachBounds.maxY && y > beachBounds.minY ? sand : indices
      faces.push(a, a + 1, a + stride, a + 1, a + stride + 1, a + stride)
    }
    const mesh = meshes.surface(`Ground ${ix},${iz}`, positions, indices.concat(sand), sand.length ? shore : material, undefined, sand.length ? uvs : undefined)
    if (sand.length) {
      mesh.releaseSubMeshes()
      if (indices.length) new SubMesh(0, 0, positions.length / vertexComponents, 0, indices.length, mesh)
      new SubMesh(1, 0, positions.length / vertexComponents, indices.length, sand.length, mesh)
    }
    mesh.setVerticesData(VertexBuffer.ColorKind, colors)
    // Identical central differences across tile borders keep lighting continuous.
    const normals: number[] = []
    for (let z = iz; z <= ez; z++) for (let x = ix; x <= ex; x++) {
      const dx = height[z * cols + Math.min(x + 1, cols - 1)] - height[z * cols + Math.max(x - 1, 0)]
      const dz = height[Math.min(z + 1, rows - 1) * cols + x] - height[Math.max(z - 1, 0) * cols + x]
      const length = Math.hypot(dx, halves * gridStep, dz)
      normals.push(-dx / length, halves * gridStep / length, -dz / length)
    }
    mesh.setVerticesData(VertexBuffer.NormalKind, normals)
    mesh.freezeWorldMatrix()
  }
}

function couldSeeTerrain(x: number, z: number, width: number, depth: number) {
  const halfX = width * gridStep / halves, halfZ = depth * gridStep / halves
  return shoreDistance(x + halfX, z + halfZ) + Math.hypot(halfX, halfZ) > -offshoreRenderReach
}

function strip(meshes: MeshFactory, name: string, points: readonly number[][], color: string) {
  const indices: number[] = []
  const verticesPerSection = 2
  for (let i = verticesPerSection; i < points.length; i += verticesPerSection) indices.push(i - verticesPerSection, i - 1, i, i - 1, i + 1, i)
  const mesh = meshes.surface(name, points.flat(), indices, color)
  mesh.freezeWorldMatrix()
}

const lakeSegments = 96
const cascadeRowSpacing = 0.5
const cascadeColumnsPerSide = 4

function createWater(meshes: MeshFactory) {
  const { sound, river: riverSurface, tarnstep: cascadeSurface } = waterSurface
  const min = -sound.halfExtent, max = sound.halfExtent
  const y = seaLevel - sound.surfaceDrop
  const color = createSoundMaterial(meshes.scene)
  const sea = meshes.surface('Saltwind Sound', [min, y, min, max, y, min, max, y, max, min, y, max], [...sound.triangles], color)
  sea.freezeWorldMatrix()
  const stillWater = createLakeMaterial(meshes.scene)
  for (const lake of [lowerLake, tarn]) {
    const points = [lake.x, lake.y, lake.z], indices: number[] = [], uv = [0, 0]
    for (let i = 0; i <= lakeSegments; i++) {
      const angle = i * Math.PI / (lakeSegments / halves)
      uv.push(Math.cos(angle), Math.sin(angle))
      points.push(lake.x + Math.cos(angle) * lake.rx, lake.y, lake.z + Math.sin(angle) * lake.rz)
      if (i) indices.push(0, i, i + 1)
    }
    meshes.surface(lake === tarn ? 'Alder Tarn' : 'Mirror Lake', points, indices, stillWater, undefined, uv).freezeWorldMatrix()
  }
  const river: number[][] = []
  for (let x = reedwater.visibleStartX; x <= reedwater.lakeEndX; x++) {
    const y = riverY(x) - riverSurface.surfaceDrop, z = riverZ(x)
    river.push([x, y, z + reedwater.halfWidth], [x, y, z - reedwater.halfWidth])
  }
  strip(meshes, 'Reedwater River', river, riverSurface.color)
  const stream: number[] = [], faces: number[] = [], uv: number[] = []
  const current = createCascadeMaterial(meshes.scene)
  const cascadeRows = (tarnstep.waterMaxZ - tarnstep.waterMinZ) / cascadeRowSpacing
  const cascadeColumns = cascadeColumnsPerSide * halves
  const cascadeStride = cascadeColumns + 1
  for (let row = 0; row <= cascadeRows; row++) {
    const z = tarnstep.waterMinZ + row * cascadeRowSpacing, y = fallsY(z), width = fallsWidth(z)
    const slope = Math.min(1, fallsY(z + cascadeRowSpacing) - fallsY(z - cascadeRowSpacing))
    for (let column = 0; column <= cascadeColumns; column++) {
      const lane = column / cascadeColumnsPerSide - 1
      // Extend a little into the cut bank so its terrain trims the water's edge.
      stream.push(fallsX(z) + lane * (width + cascadeSurface.cutBankOverlap), y, z)
      uv.push(lane, slope)
      if (row && column) {
        const d = row * cascadeStride + column
        faces.push(d - cascadeStride - 1, d - cascadeStride, d, d - cascadeStride - 1, d, d - 1)
      }
    }
  }
  meshes.surface('Tarnstep ledges and plunge pools', stream, faces, current, undefined, uv).freezeWorldMatrix()
  return (time: number, light: number) => {
    for (const material of [color, current, stillWater]) {
      material.setFloat('time', time)
      material.setFloat('light', light)
    }
  }
}

const deckSectionVertices = 3
const ferryHullOverlapZ = -254
const firstRoadMarkDistance = 3
const roadMarkEndGap = 3
const roadMarkSpacing = 13
const markedRoadMinWidth = 8
const roadMarkJunctionClearance = 8
const fishingPierRailStart = 2
const ferryDeckRailStart = 16

function createRoad(meshes: MeshFactory, route: Route, solids: ScenerySolids) {
  const { boardColor, roadColor, centreLine, rails } = saltwindRoads
  const board = route === ferryTrack || route === fishingPier
  const positions: number[] = [], indices: number[] = []
  route.samples.forEach((sample, i) => {
    for (const p of deckSection(sample, route)) positions.push(p.x, p.y, p.z)
    if (!i || (route === ferryTrack && sample.z <= ferryHullOverlapZ)) return
    for (const lane of [0, 1]) {
      const a = (i - 1) * deckSectionVertices + lane, b = a + deckSectionVertices
      indices.push(a, a + 1, b, a + 1, b + 1, b)
    }
  })
  meshes.surface(route.name, positions, indices, board ? boardColor : roadColor).freezeWorldMatrix()
  const length = route.samples.at(-1)?.distance ?? 0
  for (let distance = firstRoadMarkDistance; distance < length - roadMarkEndGap; distance += roadMarkSpacing) {
    if (board || route.width < markedRoadMinWidth) break
    const p = sampleRoute(route, distance)
    if (nearestRoad(p.x, p.z, false, route).distance >= roadMarkJunctionClearance) {
      const y = deckPoint(p, 0, route).y
      const mark = meshes.box(p.x, y + centreLine.centreY, p.z, ...centreLine.size, centreLine.color, undefined, false)
      mark.rotation.y = p.yaw
      const a = sampleRoute(route, distance - 1)
      const b = sampleRoute(route, distance + 1)
      mark.rotation.x = -Math.atan2(deckPoint(b, 0, route).y - deckPoint(a, 0, route).y, halves)
    }
  }
  const spans: [number, number][] = []
  let start: number | undefined
  for (const p of route.samples) {
    if (bridgeAt(route, p)) {
      start ??= p.distance
    }
    else if (start !== undefined) {
      spans.push([start, p.distance])
      start = undefined
    }
  }
  if (route === fishingPier) spans.push([fishingPierRailStart, length - rails.endInset])
  if (route === ferryTrack) spans.push([ferryDeckRailStart, length - rails.endInset])
  const firstRail = meshes.scene.meshes.length
  for (const [from, to] of spans) addRails(meshes, route, from, to)
  solids.capture(meshes.scene.meshes.slice(firstRail))
}

const railPostSpacing = 5.5
const railSupportInterval = 2
const railSupportMinHeight = 0.46

function addRails(meshes: MeshFactory, route: Route, from: number, to: number) {
  const { edgeInset, post, support, beams, beamWidth } = saltwindRoads.rails
  const count = Math.ceil((to - from) / railPostSpacing)
  const halfSupportWidth = support.width / halves, halfSupportDepth = support.depth / halves
  for (const side of [-1, 1]) {
    const offset = side * (route.width / halves - edgeInset)
    let previous: ReturnType<typeof deckPoint> | undefined
    for (let i = 0; i <= count; i++) {
      const sample = sampleRoute(route, from + (to - from) * i / count)
      const p = deckPoint(sample, offset, route)
      meshes.box(p.x, p.y + post.centreY, p.z, ...post.size, post.color)
      if (i % railSupportInterval === 0 && p.y - groundHeight(p.x, p.z) > railSupportMinHeight) {
        const corners = [-halfSupportWidth, halfSupportWidth].flatMap((dx) =>
          [-halfSupportDepth, halfSupportDepth].map((dz) => groundHeight(p.x + dx, p.z + dz)))
        const bottom = Math.min(...corners) - support.foundation
        const height = p.y - bottom
        meshes.box(p.x, bottom + height / halves, p.z, support.width, height, support.depth, support.color)
      }
      if (previous) {
        const dx = p.x - previous.x, dy = p.y - previous.y, dz = p.z - previous.z
        const length = Math.hypot(dx, dz)
        const x = (p.x + previous.x) / halves, y = (p.y + previous.y) / halves, z = (p.z + previous.z) / halves
        for (const { height, centreY, color } of beams) {
          const beam = meshes.box(x, y + centreY, z, beamWidth, height, Math.hypot(length, dy), color)
          beam.rotation.set(-Math.atan2(dy, length), Math.atan2(dx, dz), 0)
        }
      }
      previous = p
    }
  }
}

function createAirstrip(meshes: MeshFactory) {
  const { x, z, width, length, y } = runway
  const { pavement, edges, threshold, centreLine } = airstripMarkings
  for (const pad of pavedYards.filter(({ id }) => ['runway', 'taxi', 'air-apron'].includes(id))) {
    const color = pad.id === 'air-apron' ? pavement.apronColor : pavement.runwayColor
    meshes.box(pad.x, pad.y - pavement.thickness / halves, pad.z, pad.width, pavement.thickness, pad.depth, color, undefined, false)
  }
  for (const side of [-1, 1]) {
    meshes.box(x, y + edges.centreY, z + side * (width / halves - edges.inset), length - edges.trimLength, edges.height, edges.depth, edges.color, undefined, false)
    const thresholdX = x + side * (length / halves - threshold.inset)
    for (const offset of threshold.offsets) {
      meshes.box(thresholdX, y + threshold.centreY, z + offset * threshold.spacing, ...threshold.size, threshold.color, undefined, false)
    }
  }
  for (let i = -centreLine.countPerSide; i <= centreLine.countPerSide; i++) {
    meshes.box(x + i * centreLine.spacing, y + centreLine.centreY, z, ...centreLine.size, centreLine.color, undefined, false)
  }
  const { x: wx, z: wz } = airstripWindsock
  const { pole, fabric, bands, droop } = windsock
  meshes.cylinder(wx, y + pole.centreY, wz, pole.topDiameter, pole.bottomDiameter, pole.height, pole.sides, pole.color)
  meshes.box(wx + fabric.x, y + fabric.y, wz, ...fabric.size, fabric.color).rotation.z = -droop
  for (const offset of bands.x) meshes.box(wx + offset, y + bands.topY - offset * droop, wz, ...bands.size, bands.color).rotation.z = -droop
}

const airfieldClearance = 2
const beachScatterBand = 0.55

export function clearAirfield(x: number, z: number) {
  return airfieldDistance(x, z) < airfieldClearance
}

export function createLandscape(meshes: MeshFactory, solids: ScenerySolids) {
  createTerrain(meshes)
  dressStrand(meshes, 'Sandspit', sandspitBeach.edge, sandspitBeach.scatterSeed, ({ x, z }) => groundHeight(x, z), (_p, y) => y > -beachScatterBand && y < beachScatterBand)
  const water = createWater(meshes)
  for (const route of [...routes, ferryTrack, fishingPier]) createRoad(meshes, route, solids)
  for (const walk of discoveryWalks) {
    createTrail(meshes, walk.name + ' footpath', walk.path, saltwindWalkFinish.trailWidth, 'gravel', ({ x, z }) => surfaceHeight(x, z), meshes.paintRecipe('path-gravel'))
  }
  const { frontWalk } = saltwindWalkFinish
  for (const walk of villageWalks) {
    if (!walk.points.length) continue
    const path = ribbonGeometry([walk.points], frontWalk.width, 0)
    for (let i = 0; i < path.positions.length; i += vertexComponents) {
      path.positions[i + 1] = surfaceHeight(path.positions[i], path.positions[i + zComponent]) + frontWalk.lift
    }
    const uv = walk.points.flatMap((p) => {
      const d = Math.hypot(p.x - walk.points[0].x, p.z - walk.points[0].z)
      return [0, d / frontWalk.width, 1, d / frontWalk.width]
    })
    const paving = walk.name === 'cemetery' ? meshes.paintSurface('gravel') : meshes.paintSurface('concrete', frontWalk.concrete)
    meshes.surface(walk.name + ' front walk', path.positions, path.indices, paving, undefined, uv).freezeWorldMatrix()
  }
  const firstAirstrip = meshes.scene.meshes.length
  createAirstrip(meshes)
  solids.capture(meshes.scene.meshes.slice(firstAirstrip))
  return water
}
