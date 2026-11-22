import { islandTreeGeometry } from './assets/geometry/starter-scenery'
import { driftwoodMarram, mirrorPoolRushes } from './assets/geometry/understory'
import { wildflowerMeadowGeometry } from './assets/geometry/wildflower-meadow'
import { juniperFern, sampleUnderstoryBlade, understoryBladeCount, understoryGroundOffset } from './assets/understory'
import { createGullFlock, createThermalGulls } from './gull-flock'
import { starterGullPerches } from './gull-sites'
import { createCoastalFish } from './school-fish'
import { driftwoodShallows, type DriftwoodFrame } from './simulation/driftwood-school'
import { starterBatFlock, starterOffshoreSchools, starterUnderstorySites, starterWildflowerMeadows } from './worlds/starter/layout/wildlife'
import { onBeachTowel } from './worlds/starter/sites'
import { liftSites } from './worlds/starter/lift'
import type { Point } from './world'
import type { MeshFactory } from './island-meshes'
import { distanceToRoads, distanceToRoute, footpaths } from './routes'
import { islandTrees, seededRandom } from './scenery'
import { coastPoint, coastRadius, groundHeight, grove, pool, waterDepth, waterLevel } from './terrain'
import { createFlocks, createSchools } from './wildlife'
import type { WildlifeFrame } from './wildlife'

const half = 0.5
const quarterTurn = Math.PI * half
const fullTurn = Math.PI + Math.PI
const coordinatesPerVertex = 3

export function createWildflowers(meshes: MeshFactory) {
  const { seed, patches, samplesPerPatch, patchWidthM, patchDepthM, inlandLimit } = starterWildflowerMeadows
  const { height: stemHeight, tipLeanRatio, stem, petals, eye } = wildflowerMeadowGeometry
  const random = seededRandom(seed)
  const stems: number[] = []
  const blooms: number[] = []
  const centers: number[] = []
  function face(target: number[], x: number, y: number, z: number, angle: number, height: number, span: number) {
    const dx = Math.cos(angle) * span
    const dz = Math.sin(angle) * span
    target.push(x - dx, y, z - dz, x + dx, y, z + dz, x + dx * tipLeanRatio, y + height, z + dz * tipLeanRatio)
  }
  for (const [x, z] of patches) {
    for (let i = 0; i < samplesPerPatch; i++) {
      const point = { x: x + (random() - half) * patchWidthM, z: z + (random() - half) * patchDepthM }
      if (coastRadius(point) > inlandLimit || onBeachTowel(point)) continue
      const y = groundHeight(point)
      const angle = random() * Math.PI
      const height = stemHeight.minimum + random() * stemHeight.variation
      face(stems, point.x, y - stem.belowGroundM, point.z, angle, height, stem.faceHalfWidthM)
      face(stems, point.x, y - stem.belowGroundM, point.z, angle + quarterTurn, height * stem.crossingHeightRatio, stem.crossingHalfWidthM)
      for (let petal = 0; petal < petals.count; petal++) {
        face(blooms, point.x, y + height - petals.belowTipM, point.z, angle + petals.rotationRad + petal * Math.PI / petals.count, petals.heightM, petals.halfWidthM)
      }
      face(centers, point.x, y + height - eye.belowTipM, point.z, angle + eye.rotationRad, eye.heightM, eye.halfWidthM)
    }
  }
  for (const [name, vertices, color] of [
    ['Wildflower stems', stems, stem.color],
    ['Wildflower petals', blooms, petals.color],
    ['Wildflower centers', centers, eye.color],
  ] as const) {
    const paint = meshes.paint(color)
    paint.backFaceCulling = false
    meshes.surface(name, vertices, Array.from({ length: vertices.length / coordinatesPerVertex }, (_, i) => i), paint).freezeWorldMatrix()
  }
}

const maximumPlantWaterDepthM = 0.04
const roadClearanceM = 4.3
const pathEdgeClearanceM = 0.68
const plantMinimumScale = 0.66
const plantScaleSpread = 0.82

export function createUnderstory(meshes: MeshFactory) {
  const { juniper, mirrorPool, driftwood, samplesPerSite, ring } = starterUnderstorySites
  const ferns: Point[] = []
  for (const habitat of [
    { ...juniperFern, x: grove.x + juniper.groveOffsetX, z: grove.z + juniper.groveOffsetZ, radius: juniper.radiusM },
    { ...mirrorPoolRushes, x: pool.x, z: pool.z, radius: mirrorPool.radiusM },
    { ...driftwoodMarram, x: driftwood.x, z: driftwood.z, radius: driftwood.radiusM },
  ]) {
    const random = seededRandom(habitat.seed)
    const positions: number[] = []
    for (let i = 0; i < samplesPerSite; i++) {
      const angle = random() * fullTurn
      const radius = habitat.radius * (ring.innerRatio + random() * ring.widthRatio)
      const point = { x: habitat.x + radius * Math.cos(angle), z: habitat.z + radius * Math.sin(angle) }
      if (onBeachTowel(point) || waterDepth(point) > maximumPlantWaterDepthM || distanceToRoads(point) < roadClearanceM
        || footpaths.some(({ points, width }) => distanceToRoute(point, points) < width * half + pathEdgeClearanceM)) continue
      if (habitat.seed === juniperFern.seed) ferns.push(point)
      const origin = { ...point, y: groundHeight(point) + understoryGroundOffset }
      const scale = plantMinimumScale + random() * plantScaleSpread
      for (let leaf = 0; leaf < understoryBladeCount; leaf++) {
        positions.push(...sampleUnderstoryBlade(habitat, origin, angle, leaf, scale, random).positions)
      }
    }
    const paint = meshes.paint(habitat.color)
    paint.backFaceCulling = false
    meshes.surface(habitat.name, positions, Array.from({ length: positions.length / coordinatesPerVertex }, (_, i) => i), paint).freezeWorldMatrix()
  }
  return ferns
}

export function createStarterWildlife(meshes: MeshFactory) {
  const driftwood = createCoastalFish(meshes, driftwoodShallows, waterLevel)
  const { bearingsRad, coastRelativeRadius, offshoreSwing, bearingSwingRad, patrolRadPerSecond, minimumDepthM } = starterOffshoreSchools
  const schools = createSchools(meshes, bearingsRad.map((angle) => {
    const off = coastPoint(angle)
    const length = Math.hypot(off.x, off.z)
    return {
      swim(time: number) {
        const phase = time * patrolRadPerSecond + angle
        return coastPoint(angle + bearingSwingRad * Math.sin(phase), coastRelativeRadius + offshoreSwing * Math.cos(phase))
      },
      deep: { x: off.x / length, z: off.z / length },
      level: waterLevel,
      isWater: (point) => waterDepth(point) > minimumDepthM,
    }
  }))
  const { center, range, count, color, treeHeightRatio, fallbackRoost, treeSearch } = starterBatFlock
  const tree = islandTrees.find(({ variant, x, z }) =>
    variant % islandTreeGeometry.canopy.broadleafEvery === 0 && x > treeSearch.westX && x < treeSearch.eastX && z > treeSearch.southZ)
  const roost = tree ? { x: tree.x, z: tree.z, y: groundHeight(tree) + tree.height * treeHeightRatio } : fallbackRoost
  const gulls = createGullFlock(meshes, starterGullPerches)
  const soaringGulls = createThermalGulls(meshes, liftSites, starterGullPerches.length)
  const flocks = createFlocks(meshes, [{ center, landing: roost, roost, range, color, count, bat: true }])
  return (frame: WildlifeFrame, school: DriftwoodFrame | undefined) => {
    driftwood(frame, school)
    schools(frame)
    flocks(frame)
    gulls(frame)
    soaringGulls(frame)
  }
}
