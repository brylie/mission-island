import type { Material } from '@babylonjs/core/Materials/material'
import { wetSandTint } from './assets/geometry/shore-finish'
import { fernfallSheet, starterMeadowFinish, starterOcean, starterShoreFinish } from './assets/geometry/starter-landscape'
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
import { coastPoint, coastRadius, coastSegments, falls, fernfallProfile, fernfallSection, grove, groundHeight, headland, meadowHill, pool, shoreProfile, streamX, tidePool, waterLevel } from './terrain'
import { buildings, distance, harbor, island, lookout, town } from './world'
import type { Point } from './world'
import type { MeshFactory } from './island-meshes'
import { createOceanMaterial } from './ocean'
import { createMeadowBlades, createMeadowSurface } from './meadow-shaders'
import { shoreDefaults, type ShoreSettings } from './shader-studies'

const halves = 2
const fullTurn = halves * Math.PI
const fernfallMinRefineAngle = 1.38
const fernfallMaxRefineAngle = 1.52
const fernfallAngleSubdivisions = 6
const shellglassMinRefineAngle = 5.23
const shellglassMaxRefineAngle = 5.60
const shellglassAngleSubdivisions = 3
const meadowRingIntervals = 88
const meadowMinRefineRadius = 0.42
const meadowMaxRefineRadius = 0.57
const meadowRingSubdivisions = 7
const beachRingSpacing = 0.006

function coastAngles() {
  // Refine around the stream and Shellglass. Share the angles at the joined rings.
  const angleStep = fullTurn / coastSegments
  const angles = Array.from({ length: coastSegments }, (_, j) => {
    const angle = j * angleStep
    const steps = angle > fernfallMinRefineAngle && angle < fernfallMaxRefineAngle
      ? fernfallAngleSubdivisions
      : angle > shellglassMinRefineAngle && angle < shellglassMaxRefineAngle ? shellglassAngleSubdivisions : 1
    return Array.from({ length: steps }, (_, k) => angle + k / steps * angleStep)
  }).flat()
  angles.push(fullTurn)
  return angles
}

function appendSandColor(colors: number[], x: number, z: number, height: number) {
  const { shellglass } = starterShoreFinish
  const { seam: seamPattern } = shellglass
  const bed = Math.max(0, 1 - Math.hypot((x - tidePool.x) / shellglass.toneRadiusX, (z - tidePool.z) / shellglass.toneRadiusZ) ** shellglass.falloffPower)
  const seam = seamPattern.base + seamPattern.amplitude * Math.sin(x * seamPattern.xFrequency + z * seamPattern.zFrequency)
  const wet = Math.max(0, Math.min(1, (waterLevel - height) / wetSandTint.depth))
  const red = (1 - shellglass.redLoss * bed * seam) * (1 - wet * wetSandTint.redLoss)
  const green = (1 - shellglass.greenLoss * bed * seam) * (1 - wet * wetSandTint.greenLoss)
  const blue = (1 - shellglass.blueLoss * bed) * (1 + wet * wetSandTint.blueGain)
  colors.push(red, green, blue, 1)
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

function buildGroundBand(meshes: MeshFactory, name: string, angles: readonly number[], rings: readonly number[], material: Material, wear: number, sand: boolean) {
  const positions: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const segments = angles.length - 1
  for (const [i, ring] of rings.entries()) {
    for (let j = 0; j <= segments; j++) {
      const angle = angles[j]
      const point = coastPoint(angle, ring)
      const { x, z } = point
      const height = groundHeight(point)
      positions.push(x, height, z)
      if (sand) {
        uvs.push(angle / fullTurn * starterShoreFinish.uvRepeatsPerTurn, (ring - shoreStations.sandEdge.radius) * starterShoreFinish.uvRadialScale)
        appendSandColor(colors, x, z, height)
      }
      else {
        uvs.push(x, z)
        appendMeadowColor(colors, point, wear)
      }
      if (i === 0 || j === segments) continue
      const a = (i - 1) * (segments + 1) + j
      const b = a + segments + 1
      if (rings[i - 1] > 0) indices.push(a, b + 1, a + 1)
      indices.push(a, b, b + 1)
    }
  }
  const mesh = meshes.surface(name, positions, indices, material, undefined, uvs)
  mesh.setVerticesData(VertexBuffer.ColorKind, colors)
  mesh.freezeWorldMatrix()
}

const driftwoodWrackMinRadius = 0.935
const driftwoodWrackMaxDepth = 0.55
const oceanAlphaIndex = 0

export function createIslandTerrain(meshes: MeshFactory, finish: { material: Material, wear: number } = {
  material: meshes.paintRecipe('meadow-turf'),
  wear: surfaceRecipe('meadow-turf').wear.amount,
}) {
  const meadow = createMeadowSurface(finish.material)
  const angles = coastAngles()
  const meadowRings = Array.from({ length: meadowRingIntervals + 1 }, (_, i) => {
    const ring = i / meadowRingIntervals * shoreStations.meadowEdge.radius
    const steps = ring > meadowMinRefineRadius && ring < meadowMaxRefineRadius ? meadowRingSubdivisions : 1
    return Array.from({ length: steps }, (_, k) => (i + k / steps) / meadowRingIntervals * shoreStations.meadowEdge.radius)
  }).flat()
  buildGroundBand(meshes, 'Textured meadow', angles, [...meadowRings, shoreStations.sandEdge.radius], finish.material, finish.wear, false)
  const beachRings = shoreProfile.slice(shoreProfile.indexOf(shoreStations.sandEdge)).flatMap(({ radius }, i, rings) => {
    const next = rings[i + 1]?.radius
    if (!next || radius >= shoreStations.shoal.radius) return [radius]
    const steps = Math.ceil((next - radius) / beachRingSpacing)
    return Array.from({ length: steps }, (_, j) => radius + (next - radius) * j / steps)
  })
  buildGroundBand(meshes, 'Beach and seabed', angles, beachRings, meshes.paintSurface('sand'), finish.wear, true)
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
const grassMaxCoastRadius = 0.91
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
    if (onBeachTowel(point) || coastRadius(point) > grassMaxCoastRadius || distance(point, harbor) < grassHarborClearance || distance(point, town) < grassTownClearance
      || distance(point, lookout) < grassLookoutClearance || distanceToRoads(point) < grassRoadClearance || inFerryYard(point, grassYardClearance)
      || footpaths.some(({ points, width }) => distanceToRoute(point, points) < width / halves + grassPathClearance)
      || walkways.some(({ points, width }) => distanceToRoute(point, points) < width / halves + grassPathClearance)
      || buildings.some((entry) => Math.abs(entry.x - x) < entry.w / halves + grassBuildingClearance && Math.abs(entry.z - z) < entry.d / halves + grassBuildingClearance)) continue
    if (groundHeight(point) > waterLevel + grassWaterClearance) points.push(point)
  }
  return createMeadowBlades(meshes, points, groundHeight, grassModelSeed)
}
