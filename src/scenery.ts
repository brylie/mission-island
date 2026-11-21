import { seededRandom } from './seeded-random.ts'
import { ridgeViewpoint } from './worlds/starter/sites.ts'
import { starterPropTop } from './worlds/starter/colliders.ts'
import { distanceToRoads, distanceToRoute, footpaths, shellglassPoint, splitstone } from './routes.ts'
import { inFerryYard } from './worlds/starter/ferry-terminal.ts'
import { coastRadius, falls, grove, groundHeight, headland, pool, waterDepth } from './terrain.ts'
import { beach, distance, forest, harbor, island, lookout, town } from './world.ts'
import type { Point } from './world.ts'

export const treeTrunkRadius = 0.265

export { seededRandom }

const northernRandom = seededRandom(41132)
export const northernRegions = [
  { id: 'juniper', name: 'Juniper Hollow', biome: 'Pine forest', at: grove, spread: 28, color: '#37675a', count: 38, trees: true },
  { id: 'fernfall', name: 'Fernfall', biome: 'Stream valley', at: falls, spread: 17, color: '#548a58', count: 24, trees: true },
  { id: 'pool', name: 'Mirror Pool', biome: 'Wetlands', at: pool, spread: 22, color: '#6d8e58', count: 28, trees: true },
  { id: 'ridge', name: 'Windstone Ridge', biome: 'Rocky ridge', at: headland, spread: 27, color: '#958878', count: 36, trees: false },
].map((region) => {
  const props = []
  for (let index = 0; index < region.count; index++) {
    const angle = northernRandom() * Math.PI * 2
    const radius = Math.sqrt(northernRandom()) * region.spread
    const point = { x: region.at.x + Math.cos(angle) * radius, z: region.at.z + Math.sin(angle) * radius }
    if (coastRadius(point) > 0.94 || waterDepth(point) > 0.05
      || (region.id === 'fernfall' && Math.abs(point.x - falls.x) < 5)) continue
    props.push({ ...point, y: groundHeight(point), size: 0.8 + northernRandom() * 1.35, angle, index, tree: region.trees })
  }
  const site = region.id === 'ridge' ? ridgeViewpoint : { x: region.at.x + (region.id === 'pool' ? 21 : -5), z: region.at.z - 6 }
  return { ...region, props, site }
})

export const northernProps = northernRegions.flatMap(({ props }) => props)

export const starterDiscoveries = [
  ...northernRegions,
  { id: 'shellglass', name: 'Shellglass Tide Pool', site: shellglassPoint },
  { id: 'splitstone', name: 'Splitstone Narrows', site: splitstone },
]

const random = seededRandom(14757)
export const islandTrees = Array.from({ length: 92 }, (_, variant) => {
  const from = variant < 48 ? forest : { x: 0, z: 0 }
  const x = from.x + (random() - 0.5) * (variant < 48 ? 44 : 129)
  const z = from.z + (random() - 0.5) * (variant < 48 ? 34 : 83)
  const height = 3.2 + random() * 4.6
  return { x, z, height, variant }
}).filter((tree) => {
  const { x, z } = tree
  return coastRadius(tree) <= 0.89 && !(x < -34 && z < 0) && !(x > 18 && z > -1)
    && !(x > 2 && z < -10) && distance(tree, lookout) >= 7 && distanceToRoads(tree) >= 5.2 && !inFerryYard(tree, 1.5)
    && footpaths.every(({ points }) => distanceToRoute(tree, points) >= 2.2)
})

export const islandRocks = Array.from({ length: 82 }, (_, index) => {
  const angle = random() * Math.PI * 2
  const factor = index < 49 ? 0.955 + random() * 0.082 : 0.26 + random() * 0.63
  const x = Math.cos(angle) * island.width / 2 * factor
  const z = Math.sin(angle) * island.length / 2 * factor
  const size = 0.65 + random() * (index < 49 ? 2.7 : 1.2)
  const ground = groundHeight({ x, z })
  return { x, z, size, angle, light: index % 3 === 0, ground }
}).filter((rock) =>
  distance(rock, harbor) >= 8 && distance(rock, town) >= 13 && distance(rock, beach) >= 12
  && distance(rock, lookout) >= 6 && distanceToRoads(rock) >= 4.2 + rock.size * 0.55
  && !inFerryYard(rock, 1 + rock.size * 0.5)
  && footpaths.every(({ points, width }) => distanceToRoute(rock, points) >= width / 2 + rock.size * 0.56 + 0.5))

// Embedded stones flank the spring outlet, ledges and plunge pool.
for (const [x, z, size, angle] of [[9.7, 80.7, 1.65, 0.8], [9.2, 82.6, 1.45, -0.5], [12.55, 83.8, 1.9, 0.3], [10.63, 85.2, 1.25, 1.5], [14.06, 86.6, 1.7, 0.75], [12.16, 88.3, 1.15, -0.8], [16.8, 90.2, 1.06, 0.8]]) {
  islandRocks.push({ x, z, size, angle, light: false, ground: groundHeight({ x, z }) - size * 0.08 })
}

export function overlapsProp(point: Point, padding: number) {
  if (starterPropTop(point, padding) > -Infinity) return true
  const trunk = treeTrunkRadius + padding
  if (islandTrees.some((tree) => (point.x - tree.x) ** 2 + (point.z - tree.z) ** 2 < trunk ** 2)) return true
  if (point.z > 40 && northernProps.some((prop) => {
    const radius = (prop.tree ? 0.14 : prop.size * 0.9) + padding
    return (point.x - prop.x) ** 2 + (point.z - prop.z) ** 2 < radius ** 2
  })) return true

  return islandRocks.some((rock) => {
    const dx = point.x - rock.x
    const dz = point.z - rock.z
    if (dx * dx + dz * dz > (rock.size * 0.55 + padding) ** 2) return false
    const x = dx * Math.cos(rock.angle) - dz * Math.sin(rock.angle)
    const z = dx * Math.sin(rock.angle) + dz * Math.cos(rock.angle)
    return (x / (rock.size * 0.48 + padding)) ** 2 + (z / (rock.size * 0.53 + padding)) ** 2 < 1
  })
}

function rockTop(point: Point, rock: Point, angle: number, width: number, depth: number, centerY: number, height: number, padding: number) {
  const dx = point.x - rock.x
  const dz = point.z - rock.z
  const x = dx * Math.cos(angle) - dz * Math.sin(angle)
  const z = dx * Math.sin(angle) + dz * Math.cos(angle)
  const radial = (x / (width + padding)) ** 2 + (z / (depth + padding)) ** 2
  return radial < 1 ? centerY + height * Math.sqrt(1 - radial) : -Infinity
}

export function propTop(point: Point, padding: number) {
  let top = starterPropTop(point, padding)
  for (const tree of islandTrees) {
    if (distance(point, tree) < treeTrunkRadius + padding) top = Math.max(top, groundHeight(tree) + tree.height / 2)
  }
  for (const rock of islandRocks) {
    if (distance(point, rock) > rock.size * 0.55 + padding) continue
    top = Math.max(top, rockTop(point, rock, rock.angle, rock.size * 0.5, rock.size * 0.55, rock.ground + rock.size * 0.12, rock.size * 0.39, padding))
  }
  if (point.z > 40) {
    for (const prop of northernProps) {
      if (prop.tree) {
        if (distance(point, prop) < 0.14 + padding) top = Math.max(top, prop.y + prop.size * 2)
      }
      else if (distance(point, prop) <= prop.size * 1.15 + padding) {
        top = Math.max(top, rockTop(point, prop, prop.angle, prop.size * 1.15, prop.size * 0.8, prop.y + prop.size * 0.27, prop.size / 2, padding))
      }
    }
  }
  return top
}
