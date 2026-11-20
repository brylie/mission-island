import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { CreateLineSystem } from '@babylonjs/core/Meshes/Builders/linesBuilder'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { seededRandom } from './scenery'
import { distanceToRoute, footpaths, road, walkways } from './routes'
import { coastPoint, coastRadius, falls, grove, groundHeight, headland, pool, shoreProfile, streamX, waterLevel } from './terrain'
import { buildings, distance, harbor, island, lookout, town } from './world'
import type { MeshFactory } from './island-meshes'
import { createOceanMaterial } from './ocean'

export function createIslandTerrain(meshes: MeshFactory) {
  function band(name: string, rings: readonly number[], sand: boolean) {
    const segments = 256
    const positions: number[] = []
    const uvs: number[] = []
    const colors: number[] = []
    const indices: number[] = []
    for (const [i, ring] of rings.entries()) {
      for (let j = 0; j <= segments; j++) {
        const angle = j / segments * Math.PI * 2
        const { x, z } = coastPoint(angle, ring)
        positions.push(x, groundHeight({ x, z }), z)
        if (sand) uvs.push(j / segments * 96, (ring - 0.905) * 32)
        else {
          uvs.push(x / 4.5, z / 4.5)
          const point = { x, z }
          const influence = (at: typeof point, range: number) => Math.max(0, 1 - distance(point, at) / range) ** 1.4
          const forest = influence(grove, 50)
          const ridge = influence(headland, 41)
          const wetland = influence(pool, 31)
          colors.push(1 - forest * 0.42 + ridge * 0.44, 1 - forest * 0.27 - ridge * 0.30,
            1 - forest * 0.12 - ridge * 0.32 + wetland * 0.19, 1)
        }
        if (i === 0 || j === segments) continue
        const a = (i - 1) * (segments + 1) + j
        const b = a + segments + 1
        if (rings[i - 1] > 0) indices.push(a, b + 1, a + 1)
        indices.push(a, b, b + 1)
      }
    }
    const mesh = meshes.surface(name, positions, indices, meshes.paintSurface(sand ? 'sand' : 'grass'), undefined, uvs)
    if (!sand) mesh.setVerticesData(VertexBuffer.ColorKind, colors)
    return mesh.freezeWorldMatrix()
  }
  const meadowRings = Array.from({ length: 89 }, (_, i) => i / 88 * shoreProfile[1].radius)
  band('Textured meadow', [...meadowRings, shoreProfile[2].radius], false)
  band('Beach and seabed', shoreProfile.slice(2).map((ring) => ring.radius), true)
  const water = createOceanMaterial(meshes.scene)
  const y = waterLevel
  const ocean = meshes.surface('Ocean', [-850, y, -850, 850, y, -850, 850, y, 850, -850, y, 850],
    [0, 1, 2, 0, 2, 3], water.material)
  ocean.alphaIndex = 0
  ocean.freezeWorldMatrix()
  const sheet = meshes.paint('#9ddce0')
  sheet.alpha = 0.83
  sheet.backFaceCulling = false
  const surfaceY = (x: number, z: number) => Math.max(waterLevel - 0.045, groundHeight({ x, z }) + 0.035)
  const spill: number[] = []
  const spillIndices: number[] = []
  for (let i = 0; i <= 16; i++) {
    const z = falls.z - 3 + i * 0.61
    const x = streamX(z)
    const width = 1.15 + i * 0.08
    spill.push(x - width, surfaceY(x - width, z), z, x, surfaceY(x, z), z, x + width, surfaceY(x + width, z), z)
    if (i > 0) {
      const a = (i - 1) * 3
      const b = i * 3
      spillIndices.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2)
    }
  }
  meshes.surface('Fernfall cascade', spill, spillIndices, sheet).freezeWorldMatrix()
  const streaks = Array.from({ length: 24 }, () => [Vector3.Zero(), Vector3.Zero()])
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
        const z = falls.z - 3 + ((time * (0.54 + (i % 5) * 0.022) + i * 0.418) % 1) * 8.8
        const lane = Math.sin(i * 2.7) * 0.98
        for (const [end, point] of streak.entries()) {
          const along = z + end * (0.22 + (i % 3) * 0.17)
          const x = streamX(along) + lane
          point.set(x, surfaceY(x, along) + 0.025, along)
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
    if (coastRadius(point) > 0.91 || distance(point, harbor) < 5 || distance(point, town) < 8 ||
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

export function createGulls(meshes: MeshFactory) {
  const plumage = meshes.paint('#e9ede6')
  plumage.backFaceCulling = false
  const birds = Array.from({ length: 5 }, () => {
    const root = new TransformNode('Gull', meshes.scene)
    const wings = [-1, 1].map((side) => meshes.surface('Gull wing',
      [0, 0, -0.13, side * 0.48, 0.035, 0.17, side * 1.03, -0.015, -0.17, side * 0.52, -0.015, -0.25],
      [0, 1, 2, 0, 2, 3], plumage, root))
    return { root, wings }
  })
  return (time: number) => {
    for (const [i, { root, wings }] of birds.entries()) {
      const t = time * 0.23 + i * 0.20
      root.position.set(-23 + Math.cos(t) * (37 + i), 8 + i * 0.45 + Math.sin(t * 2 + i) * 1.45,
        -22 + Math.sin(t) * 21)
      root.rotation.y = Math.atan2(-Math.sin(t) * (37 + i), Math.cos(t) * 21)
      const flap = Math.sin(time * 4.7 + i * 1.7) * (0.23 + 0.14 * Math.sin(time * 0.63 + i))
      wings[0].rotation.z = -flap
      wings[1].rotation.z = flap
    }
  }
}
