import { createGullFlock } from './gull-flock'
import { starterGullPerches } from './gull-sites'
import { createCoastalFish } from './school-fish'
import { driftwoodShallows, type DriftwoodFrame } from './simulation/driftwood-school'
import { onBeachTowel } from './worlds/starter/sites'
import type { Point } from './world'
import type { MeshFactory } from './island-meshes'
import { distanceToRoads, distanceToRoute, footpaths } from './routes'
import { islandTrees, seededRandom } from './scenery'
import { coastPoint, coastRadius, groundHeight, grove, pool, waterDepth, waterLevel } from './terrain'
import { createFlocks, createSchools } from './wildlife'
import type { WildlifeFrame } from './wildlife'

export function createWildflowers(meshes: MeshFactory) {
  const random = seededRandom(64286)
  const stems: number[] = []
  const blooms: number[] = []
  const centers: number[] = []
  function face(target: number[], x: number, y: number, z: number, angle: number, height: number, span: number) {
    const dx = Math.cos(angle) * span
    const dz = Math.sin(angle) * span
    target.push(x - dx, y, z - dz, x + dx, y, z + dz, x + dx * 1.25, y + height, z + dz * 1.25)
  }
  for (const [x, z] of [[-31, 18], [-17, 29], [28, -25], [37, -23]]) {
    for (let i = 0; i < 23; i++) {
      const point = { x: x + (random() - 0.5) * 11, z: z + (random() - 0.5) * 7 }
      if (coastRadius(point) > 0.93 || onBeachTowel(point)) continue
      const y = groundHeight(point)
      const angle = random() * Math.PI
      const height = 0.19 + random() * 0.28
      face(stems, point.x, y - 0.015, point.z, angle, height, 0.052)
      face(stems, point.x, y - 0.015, point.z, angle + Math.PI / 2, height * 0.76, 0.045)
      for (let petal = 0; petal < 3; petal++) {
        face(blooms, point.x, y + height - 0.06, point.z, angle + 0.27 + petal * Math.PI / 3, 0.093, 0.08)
      }
      face(centers, point.x, y + height - 0.043, point.z, angle + 0.43, 0.069, 0.03)
    }
  }
  for (const [name, vertices, color] of [
    ['Wildflower stems', stems, '#527f57'], ['Wildflower petals', blooms, '#f1dda6'], ['Wildflower centers', centers, '#e3a348'],
  ] as const) {
    const paint = meshes.paint(color)
    paint.backFaceCulling = false
    meshes.surface(name, vertices, Array.from({ length: vertices.length / 3 }, (_, i) => i), paint).freezeWorldMatrix()
  }
}

export function createUnderstory(meshes: MeshFactory) {
  const ferns: Point[] = []
  for (const habitat of [
    { name: 'Juniper fern fans', x: grove.x + 2, z: grove.z + 1, radius: 12, height: .53, bend: .5, color: '#72925d', seed: 1632 },
    { name: 'Mirror Pool rushes', x: pool.x, z: pool.z, radius: 16, height: 1.25, bend: .17, color: '#7b9362', seed: 2833 },
    { name: 'Driftwood marram', x: 37, z: -32, radius: 4.4, height: .45, bend: .24, color: '#a3a677', seed: 3301 },
  ]) {
    const random = seededRandom(habitat.seed)
    const positions: number[] = []
    for (let i = 0; i < 105; i++) {
      const angle = random() * Math.PI * 2
      const radius = habitat.radius * (.68 + random() * .5)
      const point = { x: habitat.x + radius * Math.cos(angle), z: habitat.z + radius * Math.sin(angle) }
      if (onBeachTowel(point) || waterDepth(point) > .04 || distanceToRoads(point) < 4.3 ||
        footpaths.some(({ points, width }) => distanceToRoute(point, points) < width / 2 + .68)) continue
      if (habitat.seed === 1632) ferns.push(point)
      const y = groundHeight(point) - .025, scale = .66 + random() * .82
      for (let leaf = 0; leaf < 5; leaf++) {
        const theta = angle + leaf * 2.34 + random() * .26
        const height = habitat.height * scale * (.7 + random() * .4)
        const bend = habitat.bend * scale * (.6 + random() * .6)
        const x = Math.cos(theta) * bend, z = Math.sin(theta) * bend
        const wide = .03 + bend * .1
        const wx = Math.sin(theta) * wide, wz = -Math.cos(theta) * wide
        const root = [point.x + x * .07, y, point.z + z * .07]
        const left = [point.x + x * .42 - wx, y + height * .63, point.z + z * .42 - wz]
        const right = [point.x + x * .42 + wx, y + height * .63, point.z + z * .42 + wz]
        const tip = [point.x + x, y + height, point.z + z]
        positions.push(...root, ...left, ...right, ...left, ...tip, ...right)
      }
    }
    const paint = meshes.paint(habitat.color)
    paint.backFaceCulling = false
    meshes.surface(habitat.name, positions, Array.from({ length: positions.length / 3 }, (_, i) => i), paint).freezeWorldMatrix()
  }
  return ferns
}

export function createStarterWildlife(meshes: MeshFactory) {
  const driftwood = createCoastalFish(meshes, driftwoodShallows, waterLevel)
  const schools = createSchools(meshes, [-2.17, 1.19].map((angle) => {
    const off = coastPoint(angle)
    const length = Math.hypot(off.x, off.z)
    return {
      swim(time: number) {
        const phase = time * .18 + angle
        return coastPoint(angle + .115 * Math.sin(phase), 1.042 + .007 * Math.cos(phase))
      },
      deep: { x: off.x / length, z: off.z / length },
      level: waterLevel,
      isWater: (point) => waterDepth(point) > .36,
    }
  }))
  const tree = islandTrees.find(({ variant, x, z }) => variant % 3 === 0 && x > -14 && x < -5 && z > 13)
  const roost = tree ? { x: tree.x, z: tree.z, y: groundHeight(tree) + tree.height * 1.025 } : { x: -9, y: 1, z: 20 }
  const gulls = createGullFlock(meshes, starterGullPerches)
  const flocks = createFlocks(meshes, [
    { center: { x: -13, y: 5, z: 24 }, landing: roost, roost, range: 9, color: '#6f677e', count: 3, bat: true },
  ])
  return (frame: WildlifeFrame, school: DriftwoodFrame | undefined) => {
    driftwood(frame, school)
    schools(frame)
    flocks(frame)
    gulls(frame)
  }
}
