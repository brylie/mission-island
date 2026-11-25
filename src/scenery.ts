import { highwoodSolidTop } from './highwood-solids.ts'
import { islandRockGeometry, islandTreeGeometry, northernRockGeometry, northernTreeGeometry } from './assets/geometry/starter-scenery.ts'
import { seededRandom } from './seeded-random.ts'
import { ridgeViewpoint } from './worlds/starter/sites.ts'
import { starterPropTop } from './worlds/starter/colliders.ts'
import { nearFireWatch } from './fire-watch.ts'
import { distanceToRoads, distanceToRoute, footpaths, shellglassPoint, splitstone } from './routes.ts'
import { inFerryYard } from './worlds/starter/ferry-terminal.ts'
import { northernScatter, starterScatter } from './worlds/starter/layout/scenery.ts'
import { coastRadius, falls, grove, groundHeight, headland, originalCoastRadius, pool, roadClearance, waterDepth } from './terrain.ts'
import { beach, distance, forest, harbor, island, lookout, town } from './world.ts'
import type { Point } from './world.ts'

const half = 0.5
const square = 2
const fullTurn = Math.PI + Math.PI
const northernCollisionStartZ = 40
const northernMaxCoastRadius = 0.94
const northernMaxWaterDepth = 0.05
const fernfallBankClearance = 5
const treeMaxCoastRadius = 0.89
const lookoutTreeClearance = 7
const roadTreeClearance = 5.2
const ferryTreeClearance = 1.5
const pathTreeClearance = 2.2
const harborRockClearance = 8
const townRockClearance = 13
const beachRockClearance = 12
const lookoutRockClearance = 6
const roadRockClearance = 4.2
const pathRockRadiusRatio = 0.56
const pathRockClearance = 0.5
const islandRockHalfDepthRatio = islandRockGeometry.depthRatio * half
const islandRockHalfHeightRatio = islandRockGeometry.heightRatio * half
const northernRockHalfWidthRatio = northernRockGeometry.widthRatio * half
const northernRockHalfDepthRatio = northernRockGeometry.depthRatio * half

export { seededRandom }

const northernRandom = seededRandom(northernScatter.seed)
const { juniper, fernfall, pool: wetland, ridge } = northernScatter.regions
export const northernRegions = [
  { ...juniper, at: grove },
  { ...fernfall, at: falls },
  { ...wetland, at: pool },
  { ...ridge, at: headland },
].map((region) => {
  const props = []
  for (let index = 0; index < region.count; index++) {
    const angle = northernRandom() * fullTurn
    const radius = Math.sqrt(northernRandom()) * region.spread
    const point = { x: region.at.x + Math.cos(angle) * radius, z: region.at.z + Math.sin(angle) * radius }
    if (coastRadius(point) > northernMaxCoastRadius || waterDepth(point) > northernMaxWaterDepth
      || (region.id === 'fernfall' && Math.abs(point.x - falls.x) < fernfallBankClearance)) continue
    const size = northernScatter.scale.min + northernRandom() * northernScatter.scale.span
    // Drawn before the road check, so a prop kept off a graded road leaves the others where they were.
    if (roadClearance(point) < roadTreeClearance) continue
    props.push({ ...point, y: groundHeight(point), size, angle, index, tree: region.trees })
  }
  const discovery = northernScatter.discoveries
  const site = region.id === 'ridge' ? ridgeViewpoint : { x: region.at.x + (region.id === 'pool' ? discovery.poolX : discovery.x), z: region.at.z + discovery.z }
  return { ...region, props, site }
})

export const northernProps = northernRegions.flatMap(({ props }) => props)

export const starterDiscoveries = [
  ...northernRegions,
  { id: 'shellglass', name: 'Shellglass Tide Pool', site: shellglassPoint },
  { id: 'splitstone', name: 'Splitstone Narrows', site: splitstone },
]

const random = seededRandom(starterScatter.seed)
const { trees, rocks, ledgeStones } = starterScatter
export const islandTrees = Array.from({ length: trees.count }, (_, variant) => {
  const inForest = variant < trees.forest.count
  const from = inForest ? forest : { x: 0, z: 0 }
  const spread = inForest ? trees.forest : trees.island
  const x = from.x + (random() - half) * spread.width
  const z = from.z + (random() - half) * spread.depth
  const height = trees.height.min + random() * trees.height.span
  return { x, z, height, variant }
}).filter((tree) => {
  const { x, z } = tree
  // The old island's scatter stays on the old island; Highwood gets its own stands.
  return originalCoastRadius(tree) <= treeMaxCoastRadius && !(x < trees.harborClear.x && z < trees.harborClear.z)
    && !(x > trees.townClear.x && z > trees.townClear.z) && !(x > trees.beachClear.x && z < trees.beachClear.z)
    && distance(tree, lookout) >= lookoutTreeClearance && !nearFireWatch(tree) && distanceToRoads(tree) >= roadTreeClearance && roadClearance(tree) >= roadTreeClearance && !inFerryYard(tree, ferryTreeClearance)
    && footpaths.every(({ points }) => distanceToRoute(tree, points) >= pathTreeClearance)
})

export const islandRocks = Array.from({ length: rocks.count }, (_, index) => {
  const angle = random() * fullTurn
  const band = index < rocks.coast.count ? rocks.coast : rocks.inland
  const factor = band.firstRadius + random() * band.radiusRange
  const x = Math.cos(angle) * island.width * half * factor
  const z = Math.sin(angle) * island.length * half * factor
  const size = rocks.minSize + random() * band.sizeRange
  const ground = groundHeight({ x, z })
  return { x, z, size, angle, light: index % rocks.lightEvery === 0, ground }
}).filter((rock) =>
  distance(rock, harbor) >= harborRockClearance && distance(rock, town) >= townRockClearance && distance(rock, beach) >= beachRockClearance
  && distance(rock, lookout) >= lookoutRockClearance && !nearFireWatch(rock) && distanceToRoads(rock) >= roadRockClearance + rock.size * islandRockHalfDepthRatio
  && roadClearance(rock) >= roadRockClearance + rock.size * islandRockHalfDepthRatio
  && !inFerryYard(rock, 1 + rock.size * half)
  && footpaths.every(({ points, width }) => distanceToRoute(rock, points) >= width * half + rock.size * pathRockRadiusRatio + pathRockClearance))

for (const [x, z, size, angle] of ledgeStones.placements) {
  islandRocks.push({ x, z, size, angle, light: false, ground: groundHeight({ x, z }) - size * ledgeStones.embedRatio })
}

export function overlapsProp(point: Point, padding: number) {
  if (starterPropTop(point, padding) > -Infinity || highwoodSolidTop(point, padding) > -Infinity) return true
  const trunk = islandTreeGeometry.trunkRadius + padding
  if (islandTrees.some((tree) => (point.x - tree.x) ** square + (point.z - tree.z) ** square < trunk ** square)) return true
  if (point.z > northernCollisionStartZ && northernProps.some((prop) => {
    const radius = (prop.tree ? northernTreeGeometry.walkingRadius : prop.size * northernRockGeometry.walkingRadiusRatio) + padding
    return (point.x - prop.x) ** square + (point.z - prop.z) ** square < radius ** square
  })) return true

  return islandRocks.some((rock) => {
    const dx = point.x - rock.x
    const dz = point.z - rock.z
    if (dx * dx + dz * dz > (rock.size * islandRockHalfDepthRatio + padding) ** square) return false
    const x = dx * Math.cos(rock.angle) - dz * Math.sin(rock.angle)
    const z = dx * Math.sin(rock.angle) + dz * Math.cos(rock.angle)
    const { halfWidthRatio, halfDepthRatio } = islandRockGeometry.walkingFootprint
    return (x / (rock.size * halfWidthRatio + padding)) ** square + (z / (rock.size * halfDepthRatio + padding)) ** square < 1
  })
}

function rockTop(point: Point, rock: Point, angle: number, width: number, depth: number, centerY: number, height: number, padding: number) {
  const dx = point.x - rock.x
  const dz = point.z - rock.z
  const x = dx * Math.cos(angle) - dz * Math.sin(angle)
  const z = dx * Math.sin(angle) + dz * Math.cos(angle)
  const radial = (x / (width + padding)) ** square + (z / (depth + padding)) ** square
  return radial < 1 ? centerY + height * Math.sqrt(1 - radial) : -Infinity
}

export function propTop(point: Point, padding: number) {
  let top = Math.max(starterPropTop(point, padding), highwoodSolidTop(point, padding))
  for (const tree of islandTrees) {
    if (distance(point, tree) < islandTreeGeometry.trunkRadius + padding) top = Math.max(top, groundHeight(tree) + tree.height * islandTreeGeometry.trunkHeightRatio)
  }
  for (const rock of islandRocks) {
    if (distance(point, rock) > rock.size * islandRockHalfDepthRatio + padding) continue
    const centerY = rock.ground + rock.size * islandRockGeometry.centerHeightRatio
    top = Math.max(top, rockTop(point, rock, rock.angle, rock.size * half, rock.size * islandRockHalfDepthRatio, centerY, rock.size * islandRockHalfHeightRatio, padding))
  }
  if (point.z > northernCollisionStartZ) {
    for (const prop of northernProps) {
      if (prop.tree) {
        if (distance(point, prop) < northernTreeGeometry.walkingRadius + padding) top = Math.max(top, prop.y + prop.size * northernTreeGeometry.trunkHeightRatio)
      }
      else if (distance(point, prop) <= prop.size * northernRockHalfWidthRatio + padding) {
        const centerY = prop.y + prop.size * northernRockGeometry.centerHeightRatio
        top = Math.max(top, rockTop(point, prop, prop.angle, prop.size * northernRockHalfWidthRatio, prop.size * northernRockHalfDepthRatio, centerY, prop.size * half, padding))
      }
    }
  }
  return top
}
