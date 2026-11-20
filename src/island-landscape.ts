import { juniperCenter } from './juniper-habitat'
import { onBeachTowel } from './starter-sites'
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { CreateLineSystem } from '@babylonjs/core/Meshes/Builders/linesBuilder'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { seededRandom } from './scenery'
import { distanceToRoute, footpaths, road, walkways } from './routes'
import { coastPoint, coastRadius, falls, fernfallProfile, fernfallSection, grove, groundHeight, headland, pool, shoreProfile, streamX, tidePool, waterLevel } from './terrain'
import { buildings, distance, harbor, island, lookout, town } from './world'
import type { MeshFactory } from './island-meshes'
import { createOceanMaterial } from './ocean'

export function createIslandTerrain(meshes: MeshFactory) {
  function band(name: string, rings: readonly number[], sand: boolean) {
    // Refine the angular sector around the narrow stream without tessellating every beach.
    const angles = Array.from({ length: 256 }, (_, j) => {
      const a = j * Math.PI / 128
      const steps = a > 1.39 && a < 1.51 ? 12 : sand && a > 5.24 && a < 5.59 ? 5 : 1
      return Array.from({ length: steps }, (_, k) => a + k / steps * Math.PI / 128)
    }).flat()
    angles.push(2 * Math.PI)
    const segments = angles.length - 1
    const positions: number[] = []
    const uvs: number[] = []
    const colors: number[] = []
    const indices: number[] = []
    for (const [i, ring] of rings.entries()) {
      for (let j = 0; j <= segments; j++) {
        const angle = angles[j]
        const { x, z } = coastPoint(angle, ring)
        positions.push(x, groundHeight({ x, z }), z)
        if (sand) {
          uvs.push(angle / (Math.PI * 2) * 96, (ring - 0.905) * 32)
          const bed = Math.max(0, 1 - Math.hypot((x - tidePool.x) / 4.2, (z - tidePool.z) / 3.5) ** 3)
          const seam = .86 + .14 * Math.sin(x * 3.2 + z * 2.1)
          colors.push(1 - .60 * bed * seam, 1 - .39 * bed * seam, 1 - .36 * bed, 1)
        } else {
          uvs.push(x / 4.5, z / 4.5)
          const point = { x, z }
          const influence = (at: typeof point, range: number) => Math.max(0, 1 - distance(point, at) / range) ** 1.4
          const duff = influence(juniperCenter, 10)
          const forest = influence(grove, 50)
          const ridge = influence(headland, 41)
          const wetland = influence(pool, 31)
          const bank = z > 80 && z < 94 ? Math.max(0, Math.min(1, z - 80, (94 - z) / 2,
            (fernfallSection(z).halfWidth + 1.6 - Math.abs(x - streamX(z))) / 1.5)) : 0
          colors.push(1 + bank * .13 - forest * 0.42 + ridge * 0.44, 1 - duff * .48 - bank * .29 - forest * 0.27 - ridge * 0.30,
            1 - duff * .44 + bank * .16 - forest * 0.12 - ridge * 0.32 + wetland * 0.19, 1)
        }
        if (i === 0 || j === segments) continue
        const a = (i - 1) * (segments + 1) + j
        const b = a + segments + 1
        if (rings[i - 1] > 0) indices.push(a, b + 1, a + 1)
        indices.push(a, b, b + 1)
      }
    }
    const mesh = meshes.surface(name, positions, indices, meshes.paintSurface(sand ? 'sand' : 'grass'), undefined, uvs)
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
    pose(time: number, light: number, rain: number) {
      water.pose(time, light, rain)
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
  const positions: number[] = []
  const indices: number[] = []
  for (let i = 0; i < 1900; i++) {
    const x = (random() - 0.5) * island.width
    const z = (random() - 0.5) * island.length
    const point = { x, z }
    if (onBeachTowel(point) || coastRadius(point) > 0.91 || distance(point, harbor) < 5 || distance(point, town) < 8 ||
      distance(point, lookout) < 5.5 || distanceToRoute(point, road) < 4.2 ||
      footpaths.some(({ points, width }) => distanceToRoute(point, points) < width / 2 + 0.3) ||
      walkways.some(({ points, width }) => distanceToRoute(point, points) < width / 2 + 0.3) ||
      buildings.some((entry) => Math.abs(entry.x - x) < entry.w / 2 + 0.15 && Math.abs(entry.z - z) < entry.d / 2 + 0.15)) continue
    const y = groundHeight(point)
    const angle = random() * Math.PI
    for (let k = 0; k < 3; k++) {
      const theta = angle + k * Math.PI / 3
      const width = 0.065 + random() * 0.07
      const height = 0.13 + random() * 0.29
      const dx = Math.cos(theta) * width
      const dz = Math.sin(theta) * width
      const base = positions.length / 3
      positions.push(x - dx, y, z - dz, x + dx, y, z + dz, x + dx * 2.6, y + height, z + dz * 2.6)
      indices.push(base, base + 1, base + 2)
    }
  }
  const green = meshes.paint('#618752')
  green.backFaceCulling = false
  meshes.surface('Grass tufts', positions, indices, green).freezeWorldMatrix()
}
