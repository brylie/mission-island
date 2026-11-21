import type { Material } from '@babylonjs/core/Materials/material'
import { meadowGroundTone } from './surface-patterns'
import { surfaceRecipe } from './surface-recipes'
import { dressStrand } from './assets/strand'
import { juniperCenter } from './juniper-habitat'
import { onBeachTowel } from './worlds/starter/sites'
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { CreateLineSystem } from '@babylonjs/core/Meshes/Builders/linesBuilder'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { seededRandom } from './scenery'
import { distanceToRoute, footpaths, road, walkways } from './routes'
import { coastPoint, coastRadius, coastSegments, falls, fernfallProfile, fernfallSection, grove, groundHeight, headland, meadowHill, pool, shoreProfile, streamX, tidePool, waterLevel } from './terrain'
import { buildings, distance, harbor, island, lookout, town } from './world'
import type { MeshFactory } from './island-meshes'
import { createOceanMaterial } from './ocean'
import { createMeadowBlades, createMeadowSurface } from './meadow-shaders'
import { shoreDefaults, type ShoreSettings } from './shader-studies'

export function createIslandTerrain(meshes: MeshFactory, finish: { material: Material; wear: number } = {
  material: meshes.paintRecipe('meadow-turf'),
  wear: surfaceRecipe('meadow-turf').wear.amount,
}) {
  const meadow = createMeadowSurface(finish.material)
  // Refine around the stream and Shellglass. Share the angles at the joined rings.
  const angleStep = 2 * Math.PI / coastSegments
  const angles = Array.from({ length: coastSegments }, (_, j) => {
    const angle = j * angleStep
    const steps = angle > 1.38 && angle < 1.52 ? 6 : angle > 5.23 && angle < 5.60 ? 3 : 1
    return Array.from({ length: steps }, (_, k) => angle + k / steps * angleStep)
  }).flat()
  angles.push(2 * Math.PI)
  const segments = angles.length - 1
  function band(name: string, rings: readonly number[], sand: boolean) {
    const positions: number[] = []
    const uvs: number[] = []
    const colors: number[] = []
    const indices: number[] = []
    for (const [i, ring] of rings.entries()) {
      for (let j = 0; j <= segments; j++) {
        const angle = angles[j]
        const { x, z } = coastPoint(angle, ring)
        const height = groundHeight({ x, z })
        positions.push(x, height, z)
        if (sand) {
          uvs.push(angle / (Math.PI * 2) * 96, (ring - 0.905) * 32)
          const bed = Math.max(0, 1 - Math.hypot((x - tidePool.x) / 4.2, (z - tidePool.z) / 3.5) ** 3)
          const seam = .86 + .14 * Math.sin(x * 3.2 + z * 2.1)
          const wet = Math.max(0, Math.min(1, (waterLevel - height) / .65))
          colors.push((1 - .60 * bed * seam) * (1 - wet * .43), (1 - .39 * bed * seam) * (1 - wet * .11),
            (1 - .36 * bed) * (1 + wet * .24), 1)
        } else {
          uvs.push(x, z)
          const point = { x, z }
          const influence = (at: typeof point, range: number) => Math.max(0, 1 - distance(point, at) / range) ** 1.4
          const duff = influence(juniperCenter, 10)
          const forest = influence(grove, 50)
          const ridge = influence(headland, 41)
          const wetland = influence(pool, 31)
          const bank = z > 80 && z < 94 ? Math.max(0, Math.min(1, z - 80, (94 - z) / 2,
            (fernfallSection(z).halfWidth + 1.6 - Math.abs(x - streamX(z))) / 1.5)) : 0
          const dry = meadowGroundTone(x, z, finish.wear)
          const grass = 1 - dry
          colors.push(1 + bank * .13 - forest * 0.42 + ridge * 0.44 + .22 * dry - .08 * grass,
            1 - duff * .48 - bank * .29 - forest * 0.27 - ridge * 0.30 - .20 * dry + .17 * grass,
            1 - duff * .44 + bank * .16 - forest * 0.12 - ridge * 0.32 + wetland * 0.19 - .39 * dry, 1)
        }
        if (i === 0 || j === segments) continue
        const a = (i - 1) * (segments + 1) + j
        const b = a + segments + 1
        if (rings[i - 1] > 0) indices.push(a, b + 1, a + 1)
        indices.push(a, b, b + 1)
      }
    }
    const material = sand ? meshes.paintSurface('sand') : finish.material
    const mesh = meshes.surface(name, positions, indices, material, undefined, uvs)
    mesh.setVerticesData(VertexBuffer.ColorKind, colors)
    return mesh.freezeWorldMatrix()
  }
  const meadowRings = Array.from({ length: 89 }, (_, i) => {
    const ring = i / 88 * shoreProfile[1].radius
    const steps = ring > .42 && ring < .57 ? 7 : 1
    return Array.from({ length: steps }, (_, k) => (i + k / steps) / 88 * shoreProfile[1].radius)
  }).flat()
  band('Textured meadow', [...meadowRings, shoreProfile[2].radius], false)
  const beachRings = shoreProfile.slice(2).flatMap(({ radius }, i, rings) => {
    const next = rings[i + 1]?.radius
    if (!next || radius >= 1.048) return [radius]
    const steps = Math.ceil((next - radius) / .006)
    return Array.from({ length: steps }, (_, j) => radius + (next - radius) * j / steps)
  })
  band('Beach and seabed', beachRings, true)
  const banks = [5.10, 5.18, 5.26, 5.36, 5.44, 5.53, 5.62].map((a, i) => coastPoint(a, i % 2 ? .972 : 1.012))
  dressStrand(meshes, 'Driftwood', banks, 3125, groundHeight, (p, y) =>
    coastRadius(p) > .935 && y > waterLevel - .55 && !onBeachTowel(p))
  const water = createOceanMaterial(meshes.scene)
  const y = waterLevel
  const ocean = meshes.surface('Ocean', [-850, y, -850, 850, y, -850, 850, y, 850, -850, y, 850],
    [0, 1, 2, 0, 2, 3], water.material)
  ocean.alphaIndex = 0
  ocean.freezeWorldMatrix()
  const sheet = meshes.paint('#e2f3ea')
  sheet.alpha = .9
  sheet.backFaceCulling = false
  const spill: number[] = [], spillIndices: number[] = [], colors: number[] = []
  const start = fernfallProfile[0].z, end = fernfallProfile[fernfallProfile.length - 1].z
  const rows = 96, columns = 10
  for (let i = 0; i <= rows; i++) {
    const z = start + (end - start) * i / rows
    const { y, halfWidth } = fernfallSection(z)
    const drop = Math.min(1, (y - fernfallSection(z + .1).y) * 8)
    for (let j = 0; j <= columns; j++) {
      const lane = 2 * j / columns - 1
      const x = streamX(z) + lane * halfWidth
      spill.push(x, y + .014 * Math.cos(lane * 5 + z * 2) * (1 - lane * lane), z)
      const froth = drop * (.42 + .34 * Math.cos(lane * 15 + Math.sin(z * 1.8)))
      const opacity = Math.min(1, (end - z) / 2.8) * (1 - .55 * Math.abs(lane) ** 5)
      colors.push(.39 + froth * .74, .66 + froth * .37, .65 + froth * .43, opacity)
      if (i && j) {
        const d = i * (columns + 1) + j, b = d - columns - 1
        spillIndices.push(b - 1, b, d, b - 1, d, d - 1)
      }
    }
  }
  const stream = meshes.surface('Fernfall spring and cascade', spill, spillIndices, sheet)
  stream.setVerticesData(VertexBuffer.ColorKind, colors)
  stream.hasVertexAlpha = true
  stream.alphaIndex = 1
  stream.freezeWorldMatrix()
  const streaks = Array.from({ length: 34 }, () => [Vector3.Zero(), Vector3.Zero(), Vector3.Zero()])
  const cascade = CreateLineSystem('Cascade foam', { lines: streaks, updatable: true }, meshes.scene)
  cascade.color = Color3.FromHexString('#dcffff')
  cascade.alpha = 0.55
  cascade.isPickable = false
  cascade.alwaysSelectAsActiveMesh = true
  return {
    meadow,
    pose(time: number, light: number, rain: number, shore: ShoreSettings = shoreDefaults, localWaterLevel = waterLevel) {
      water.pose(time, light, rain, shore, localWaterLevel)
      const eye = meshes.scene.activeCamera?.position
      cascade.setEnabled(Boolean(eye && Math.hypot(eye.x - falls.x, eye.z - falls.z) < 52 && eye.y < 55))
      if (!cascade.isEnabled()) return
      streaks.forEach((streak, i) => {
        const phase = (time * (.29 + (i % 5) * .013) + i * .418) % 1
        const z = start + .7 + phase * phase * 7.8
        const lane = Math.sin(i * 2.7) * .82
        for (const [index, point] of streak.entries()) {
          const along = z + index * (.035 + phase * .21)
          const section = fernfallSection(along)
          const x = streamX(along) + section.halfWidth * (lane + .038 * Math.sin(along * 1.8 + i))
          point.set(x, section.y + .027, along)
        }
      })
      CreateLineSystem('Cascade foam', { lines: streaks, instance: cascade }, meshes.scene)
    },
  }
}
export function createGrassTufts(meshes: MeshFactory) {
  const random = seededRandom(82489)
  const points: { x: number; z: number }[] = []
  for (let i = 0; i < 2290; i++) {
    const extent = i < 1900 ? island : { width: 29, length: 25 }
    const center = i < 1900 ? { x: 0, z: 0 } : meadowHill
    const x = center.x + (random() - .5) * extent.width
    const z = center.z + (random() - .5) * extent.length
    const point = { x, z }
    if (onBeachTowel(point) || coastRadius(point) > 0.91 || distance(point, harbor) < 5 || distance(point, town) < 8 ||
      distance(point, lookout) < 5.5 || distanceToRoute(point, road) < 4.2 ||
      footpaths.some(({ points, width }) => distanceToRoute(point, points) < width / 2 + 0.3) ||
      walkways.some(({ points, width }) => distanceToRoute(point, points) < width / 2 + 0.3) ||
      buildings.some((entry) => Math.abs(entry.x - x) < entry.w / 2 + 0.15 && Math.abs(entry.z - z) < entry.d / 2 + 0.15)) continue
    if (groundHeight(point) > waterLevel + .06) points.push(point)
  }
  return createMeadowBlades(meshes, points, groundHeight, 82490)
}
