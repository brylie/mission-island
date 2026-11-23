import { highwoodGroundCover } from './worlds/starter/highwood-planting'
import type { Material } from '@babylonjs/core/Materials/material'
import { fernfallSheet, highwoodGroundFinish, starterMeadowFinish, starterOcean } from './assets/geometry/starter-landscape'
import { meadowGroundTone } from './assets/surface-patterns'
import { surfaceRecipe } from './assets/surface-recipes'
import { dressStrand } from './assets/strand'
import { juniperCenter } from './juniper-habitat'
import { onBeachTowel } from './worlds/starter/sites'
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { CreateLineSystem } from '@babylonjs/core/Meshes/Builders/linesBuilder'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { seededRandom } from './seeded-random'
import { distanceToRoads, distanceToRoute, footpaths, walkways } from './routes'
import { inFerryYard } from './worlds/starter/ferry-terminal'
import { driftwoodStrand, fernfallChannel, shoreStations } from './worlds/starter/layout/terrain'
import { coastPoint, coastRadius, coastSegments, coastalSurface, falls, fernfallProfile, fernfallSection, grove, groundHeight, headland, meadowHill, originalCoastPoint, originalCoastRadius, pool, roadClearance, shoreProfile, streamX, waterLevel } from './terrain'
import { authoredShare } from './worlds/starter/generation/protection'
import { highwoodHeightmap } from './assets/geometry/highwood-heightmap'
import { bakedSurface } from './worlds/starter/highwood-terrain'
import { buildings, distance, harbor, island, lookout, town } from './world'
import type { Point } from './world'
import type { MeshFactory } from './island-meshes'
import { createOceanMaterial } from './ocean'
import { beachAttribute, beachAttributeSize, beachVertex, groundCoverAttribute, useBeachMaterial } from './beach-material'
import { createMeadowBlades, createMeadowSurface } from './meadow-shaders'
import { shoreDefaults, type ShoreSettings } from './shader-studies'

const halves = 2
const fullTurn = halves * Math.PI
const fernfallMinRefineAngle = 1.38
const fernfallMaxRefineAngle = 1.52
const fernfallAngleSubdivisions = 6
const beachMinRefineAngle = 5.17
const beachMaxRefineAngle = 5.77
const beachAngleSubdivisions = 3
const meadowRingIntervals = 88
const meadowMinRefineRadius = 0.42
const meadowMaxRefineRadius = 0.57
const meadowRingSubdivisions = 7
const sandGrassExclusion = 0.42
const beachRingSpacing = 0.006

function coastAngles() {
  // Refine around the stream, dune slopes, and Shellglass sill.
  const angleStep = fullTurn / coastSegments
  return Array.from({ length: coastSegments }, (_, j) => {
    const angle = j * angleStep
    const steps = angle > fernfallMinRefineAngle && angle < fernfallMaxRefineAngle
      ? fernfallAngleSubdivisions
      : angle > beachMinRefineAngle && angle < beachMaxRefineAngle ? beachAngleSubdivisions : 1
    return Array.from({ length: steps }, (_, k) => angle + k / steps * angleStep)
  }).flat()
}

function tintInfluence(point: Point, site: Point, reach: number) {
  return Math.max(0, 1 - distance(point, site) / reach) ** starterMeadowFinish.falloffPower
}

function appendMeadowColor(colors: number[], point: Point, wear: number) {
  const { x, z } = point
  const { duff, woodland, exposedRidge, wetland, streamBank, dryGrass, greenGrass } = starterMeadowFinish
  const duffTint = tintInfluence(point, juniperCenter, duff.reach)
  const forestTint = tintInfluence(point, grove, woodland.reach)
  const ridgeTint = tintInfluence(point, headland, exposedRidge.reach)
  const wetlandTint = tintInfluence(point, pool, wetland.reach)
  const streamStart = fernfallChannel.streambed.minZ
  let bank = 0
  if (z > streamStart && z < streamBank.endZ) {
    const bankWidth = fernfallSection(z).halfWidth + streamBank.reach
    bank = Math.max(0, Math.min(1, z - streamStart, (streamBank.endZ - z) / streamBank.endBlend, (bankWidth - Math.abs(x - streamX(z))) / streamBank.sideBlend))
  }
  const dry = meadowGroundTone(x, z, wear)
  const grass = 1 - dry
  const red = 1 + bank * streamBank.redGain - forestTint * woodland.redLoss + ridgeTint * exposedRidge.redGain + dryGrass.redGain * dry - greenGrass.redLoss * grass
  const green = 1 - duffTint * duff.greenLoss - bank * streamBank.greenLoss - forestTint * woodland.greenLoss - ridgeTint * exposedRidge.greenLoss - dryGrass.greenLoss * dry + greenGrass.greenGain * grass
  const blue = 1 - duffTint * duff.blueLoss + bank * streamBank.blueGain - forestTint * woodland.blueLoss - ridgeTint * exposedRidge.blueLoss + wetlandTint * wetland.blueGain - dryGrass.blueLoss * dry
  colors.push(red, green, blue, 1)
}

function buildGround(meshes: MeshFactory, angles: readonly number[], rings: readonly number[], material: Material, wear: number) {
  const positions: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
  const beach: number[] = []
  const indices: number[] = []
  const owned: boolean[] = []
  const segments = angles.length
  for (const ring of rings) {
    for (const angle of angles) {
      const point = originalCoastPoint(angle, ring)
      const { x, z } = point
      const height = groundHeight(point)
      positions.push(x, height, z)
      owned.push(authoredShare(point, originalCoastRadius(point)) < fullyAuthored)
      uvs.push(x, z)
      appendMeadowColor(colors, point, wear)
      beach.push(...beachVertex(point, coastalSurface(point, height)))
    }
  }
  // Ground the Highwood generator owns is drawn by its own tiles. Every vertex's
  // ownership is known before the triangles are chosen.
  const generated = (...corners: number[]) => corners.every((corner) => owned[corner])
  for (let i = 1; i < rings.length; i++) {
    for (let j = 0; j < segments; j++) {
      const offset = (i - 1) * segments
      const a = offset + j, next = offset + (j + 1) % segments
      if (rings[i - 1] > 0 && !generated(a, next + segments, next)) indices.push(a, next + segments, next)
      if (!generated(a, a + segments, next + segments)) indices.push(a, a + segments, next + segments)
    }
  }
  const mesh = meshes.surface('Starter Island terrain', positions, indices, material, undefined, uvs)
  mesh.setVerticesData(VertexBuffer.ColorKind, colors)
  mesh.setVerticesData(beachAttribute, beach, false, beachAttributeSize)
  mesh.freezeWorldMatrix()
}

const fullyAuthored = 0.999
// A whole number of cells per tile, so neighbouring tiles share their edge vertices.
const tileMetres = 63
const tileCell = 1.5
// Generated tiles dip this far below the ring mesh where both cover the old shore, so they never fight.
const seamDip = 0.03
const deepSeaFloor = -3

const vertexStride = 3
const colorStride = 4
const depthOffset = 2

function blendTint(color: number[], offset: number, tint: readonly number[], amount: number) {
  for (let k = 0; k < tint.length; k++) color[offset + k] *= 1 + (tint[k] - 1) * amount
}

const beachStride = 4
const beachRockChannel = 1

// Colour bare generated ground by its form: bare stone where it is steep (the
// beach shader's stone texture, not a tint, so it reads as rock), heath where it
// is high, green where water gathers and paler on dry low shoulders.
function tintByForm(positions: number[], colors: number[], beach: number[], steps: number) {
  const { rock, heath, wet, dry, aspect } = highwoodGroundFinish
  const row = steps + 1
  const ramp = (value: number, start: number, full: number) => Math.max(0, Math.min(1, (value - start) / (full - start)))
  for (let j = 0; j <= steps; j++) {
    for (let i = 0; i <= steps; i++) {
      const v = j * row + i
      const at = (k: number) => positions[k * vertexStride + 1]
      const dx = (at(j * row + Math.min(steps, i + 1)) - at(j * row + Math.max(0, i - 1))) / (tileCell * (Math.min(steps, i + 1) - Math.max(0, i - 1)))
      const dz = (at(Math.min(steps, j + 1) * row + i) - at(Math.max(0, j - 1) * row + i)) / (tileCell * (Math.min(steps, j + 1) - Math.max(0, j - 1)))
      const height = at(v)
      const point = { x: positions[v * vertexStride], z: positions[v * vertexStride + depthOffset] }
      const o = v * colorStride
      blendTint(colors, o, wet.tint, bakedSurface(point).moisture)
      blendTint(colors, o, dry.tint, ramp(height, dry.heightStart, dry.heightFull) * (1 - ramp(height, heath.heightStart, heath.heightFull)))
      blendTint(colors, o, heath.tint, ramp(height, heath.heightStart, heath.heightFull))
      // Ground rising to the north faces south, toward the sun.
      const steep = Math.hypot(dx, dz), facing = steep > 0 ? dz / steep * ramp(steep, aspect.slopeStart, aspect.slopeFull) : 0
      blendTint(colors, o, facing > 0 ? aspect.sunny : aspect.shaded, Math.abs(facing))
      const stone = beach.length / beachStride > v ? v * beachStride + beachRockChannel : -1
      if (stone >= 0) beach[stone] = Math.max(beach[stone], rock.cover * ramp(Math.hypot(dx, dz), rock.slopeStart, rock.slopeFull))
    }
  }
}

// Highwood's generated ground, in square tiles so off-screen tiles are culled.
function buildGeneratedGround(meshes: MeshFactory, material: Material, wear: number) {
  const map = highwoodHeightmap
  const east = map.west + (map.columns - 1) * map.cell, north = map.south + (map.rows - 1) * map.cell
  const steps = Math.round(tileMetres / tileCell)
  for (let tz = map.south; tz < north; tz += tileMetres) {
    for (let tx = map.west; tx < east; tx += tileMetres) {
      const positions: number[] = [], uvs: number[] = [], colors: number[] = [], beach: number[] = [], cover: number[] = [], indices: number[] = []
      const keep: boolean[] = []
      let wet = false
      for (let j = 0; j <= steps; j++) {
        for (let i = 0; i <= steps; i++) {
          const point = { x: Math.min(east, tx + i * tileCell), z: Math.min(north, tz + j * tileCell) }
          const share = authoredShare(point, originalCoastRadius(point))
          const height = groundHeight(point)
          keep.push(share < fullyAuthored)
          wet ||= height > deepSeaFloor
          positions.push(point.x, height - (share > 0 ? seamDip : 0), point.z)
          uvs.push(point.x, point.z)
          appendMeadowColor(colors, point, wear)
          beach.push(...beachVertex(point, coastalSurface(point, height)))
          const layers = highwoodGroundCover(point)
          cover.push(layers.litter, layers.heath, layers.moss, 1 - layers.bracken)
        }
      }
      tintByForm(positions, colors, beach, steps)
      for (let j = 0; j < steps; j++) {
        for (let i = 0; i < steps; i++) {
          const a = j * (steps + 1) + i, b = a + 1, c = a + steps + 1, d = c + 1
          if (keep[a] || keep[b] || keep[c] || keep[d]) indices.push(a, b, d, a, d, c)
        }
      }
      if (!wet || !indices.length) continue
      const mesh = meshes.surface('Highwood terrain', positions, indices, material, undefined, uvs)
      mesh.setVerticesData(VertexBuffer.ColorKind, colors)
      mesh.setVerticesData(beachAttribute, beach, false, beachAttributeSize)
      mesh.setVerticesData(groundCoverAttribute, cover, false, beachAttributeSize)
      mesh.freezeWorldMatrix()
    }
  }
}

const driftwoodWrackMinRadius = 0.935
const driftwoodWrackMaxDepth = 0.55
const oceanAlphaIndex = 0

export function createIslandTerrain(meshes: MeshFactory, finish: { material: Material, wear: number } = {
  material: meshes.paintRecipe('meadow-turf'),
  wear: surfaceRecipe('meadow-turf').wear.amount,
}) {
  const meadow = createMeadowSurface(finish.material)
  useBeachMaterial(finish.material, meshes)
  const angles = coastAngles()
  const meadowRings = Array.from({ length: meadowRingIntervals + 1 }, (_, i) => {
    const ring = i / meadowRingIntervals * shoreStations.meadowEdge.radius
    const steps = ring > meadowMinRefineRadius && ring < meadowMaxRefineRadius ? meadowRingSubdivisions : 1
    return Array.from({ length: steps }, (_, k) => (i + k / steps) / meadowRingIntervals * shoreStations.meadowEdge.radius)
  }).flat()
  const beachRings = shoreProfile.slice(shoreProfile.indexOf(shoreStations.meadowEdge)).flatMap(({ radius }, i, rings) => {
    const next = rings[i + 1]?.radius
    if (!next || radius >= shoreStations.shoal.radius) return [radius]
    const steps = Math.ceil((next - radius) / beachRingSpacing)
    return Array.from({ length: steps }, (_, j) => radius + (next - radius) * j / steps)
  })
  buildGround(meshes, angles, [...meadowRings, ...beachRings.slice(1)], finish.material, finish.wear)
  buildGeneratedGround(meshes, finish.material, finish.wear)
  const banks = driftwoodStrand.banks.map(({ angle, radius }) => coastPoint(angle, radius))
  dressStrand(meshes, 'Driftwood', banks, driftwoodStrand.scatterSeed, groundHeight, (p, y) =>
    coastRadius(p) > driftwoodWrackMinRadius && y > waterLevel - driftwoodWrackMaxDepth && !onBeachTowel(p))
  const water = createOceanMaterial(meshes.scene)
  const y = waterLevel
  const min = -starterOcean.halfExtent, max = starterOcean.halfExtent
  const ocean = meshes.surface('Ocean', [min, y, min, max, y, min, max, y, max, min, y, max], [...starterOcean.triangles], water.material)
  ocean.alphaIndex = oceanAlphaIndex
  ocean.freezeWorldMatrix()
  const poseCascade = createFernfallSurface(meshes)
  return {
    meadow,
    pose(time: number, light: number, rain: number, shore: ShoreSettings = shoreDefaults, localWaterLevel = waterLevel) {
      water.pose(time, light, rain, shore, localWaterLevel)
      poseCascade(time)
    },
  }
}

const cascadeRowCount = 96
const cascadeColumnCount = 10
const streamAlphaIndex = 1
const foamLineCount = 34
const foamNearDistance = 52
const foamMaxEyeHeight = 55
const foamColor = '#dcffff'
const foamOpacity = 0.55
const foamSpeed = 0.29
const foamSpeedStep = 0.013
const foamSpeedGroups = 5
const foamPhaseShift = 0.418
const foamStartOffset = 0.7
const foamFlowLength = 7.8
const foamLaneFrequency = 2.7
const foamLaneReach = 0.82
const foamMinPointSpacing = 0.035
const foamSpacingDrift = 0.21
const foamJitter = 0.038
const foamJitterFrequency = 1.8
const foamSurfaceLift = 0.027

function createFernfallSurface(meshes: MeshFactory) {
  const { ripple, froth, fade } = fernfallSheet
  const sheet = meshes.paint(fernfallSheet.color)
  sheet.alpha = fernfallSheet.opacity
  sheet.backFaceCulling = false
  const spill: number[] = [], spillIndices: number[] = [], colors: number[] = []
  const start = fernfallProfile[0].z, end = fernfallProfile[fernfallProfile.length - 1].z
  for (let i = 0; i <= cascadeRowCount; i++) {
    const z = start + (end - start) * i / cascadeRowCount
    const { y, halfWidth } = fernfallSection(z)
    const drop = Math.min(1, (y - fernfallSection(z + froth.gradientSample).y) * froth.gradientGain)
    for (let j = 0; j <= cascadeColumnCount; j++) {
      const lane = halves * j / cascadeColumnCount - 1
      const x = streamX(z) + lane * halfWidth
      spill.push(x, y + ripple.amplitude * Math.cos(lane * ripple.laneFrequency + z * ripple.streamFrequency) * (1 - lane * lane), z)
      const whitening = drop * (froth.base + froth.amplitude * Math.cos(lane * froth.laneFrequency + Math.sin(z * froth.streamFrequency)))
      const opacity = Math.min(1, (end - z) / fade.outletLength) * (1 - fade.edgeStrength * Math.abs(lane) ** fade.edgePower)
      colors.push(froth.red.base + whitening * froth.red.gain, froth.green.base + whitening * froth.green.gain, froth.blue.base + whitening * froth.blue.gain, opacity)
      if (i && j) {
        const d = i * (cascadeColumnCount + 1) + j, b = d - cascadeColumnCount - 1
        spillIndices.push(b - 1, b, d, b - 1, d, d - 1)
      }
    }
  }
  const stream = meshes.surface('Fernfall spring and cascade', spill, spillIndices, sheet)
  stream.setVerticesData(VertexBuffer.ColorKind, colors)
  stream.hasVertexAlpha = true
  stream.alphaIndex = streamAlphaIndex
  stream.freezeWorldMatrix()
  const streaks = Array.from({ length: foamLineCount }, () => [Vector3.Zero(), Vector3.Zero(), Vector3.Zero()])
  const cascade = CreateLineSystem('Cascade foam', { lines: streaks, updatable: true }, meshes.scene)
  cascade.color = Color3.FromHexString(foamColor)
  cascade.alpha = foamOpacity
  cascade.isPickable = false
  cascade.alwaysSelectAsActiveMesh = true
  return (time: number) => {
    const eye = meshes.scene.activeCamera?.position
    cascade.setEnabled(Boolean(eye && Math.hypot(eye.x - falls.x, eye.z - falls.z) < foamNearDistance && eye.y < foamMaxEyeHeight))
    if (!cascade.isEnabled()) return
    streaks.forEach((streak, i) => {
      const phase = (time * (foamSpeed + (i % foamSpeedGroups) * foamSpeedStep) + i * foamPhaseShift) % 1
      const z = start + foamStartOffset + phase * phase * foamFlowLength
      const lane = Math.sin(i * foamLaneFrequency) * foamLaneReach
      for (const [index, point] of streak.entries()) {
        const along = z + index * (foamMinPointSpacing + phase * foamSpacingDrift)
        const section = fernfallSection(along)
        const x = streamX(along) + section.halfWidth * (lane + foamJitter * Math.sin(along * foamJitterFrequency + i))
        point.set(x, section.y + foamSurfaceLift, along)
      }
    })
    CreateLineSystem('Cascade foam', { lines: streaks, instance: cascade }, meshes.scene)
  }
}

const grassPlacementSeed = 82489
const grassModelSeed = 82490
const grassPlacementAttempts = 2290
const islandGrassAttempts = 1900
const meadowGrassExtentWidth = 29
const meadowGrassExtentLength = 25
const grassScatterCentre = 0.5
const grassHarborClearance = 5
const grassTownClearance = 8
const grassLookoutClearance = 5.5
const grassRoadClearance = 4.2
const grassYardClearance = 0.5
const grassPathClearance = 0.3
const grassBuildingClearance = 0.15
const grassWaterClearance = 0.06

export function createGrassTufts(meshes: MeshFactory) {
  const random = seededRandom(grassPlacementSeed)
  const points: { x: number, z: number }[] = []
  for (let i = 0; i < grassPlacementAttempts; i++) {
    const extent = i < islandGrassAttempts ? island : { width: meadowGrassExtentWidth, length: meadowGrassExtentLength }
    const center = i < islandGrassAttempts ? { x: 0, z: 0 } : meadowHill
    const x = center.x + (random() - grassScatterCentre) * extent.width
    const z = center.z + (random() - grassScatterCentre) * extent.length
    const point = { x, z }
    if (onBeachTowel(point) || distance(point, harbor) < grassHarborClearance || distance(point, town) < grassTownClearance
      || distance(point, lookout) < grassLookoutClearance || distanceToRoads(point) < grassRoadClearance || roadClearance(point) < grassRoadClearance || inFerryYard(point, grassYardClearance)
      || footpaths.some(({ points, width }) => distanceToRoute(point, points) < width / halves + grassPathClearance)
      || walkways.some(({ points, width }) => distanceToRoute(point, points) < width / halves + grassPathClearance)
      || buildings.some((entry) => Math.abs(entry.x - x) < entry.w / halves + grassBuildingClearance && Math.abs(entry.z - z) < entry.d / halves + grassBuildingClearance)) continue
    const height = groundHeight(point)
    if (height <= waterLevel + grassWaterClearance) continue
    const { sand, rock } = coastalSurface(point, height)
    if (sand + rock < sandGrassExclusion) points.push(point)
  }
  return createMeadowBlades(meshes, points, groundHeight, grassModelSeed)
}
