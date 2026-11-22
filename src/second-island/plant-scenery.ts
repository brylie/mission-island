import { Matrix } from '@babylonjs/core/Maths/math.vector'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import '@babylonjs/core/Meshes/thinInstanceMesh'
import { longAcreCropBed, saltwindPlantModels } from '../assets/geometry/saltwind-plants'
import type { MeshFactory } from '../island-meshes'
import { distanceToRoute } from '../routes'
import { seededRandom } from '../seeded-random'
import { alderCrownGroves, longAcreRows, saltwindPlantDistribution } from '../worlds/saltwind/layout/scenery'
import { villageWalks } from './footways'
import { habitatAt } from './habitats'
import { clearAirfield } from './landscape'
import { islandBuildings } from './lots'
import { discoveryWalks, sites } from './sites'
import type { MapPoint } from './sites'
import { groundHeight, nearestRoad, siteDistance, waterHeight } from './terrain'
import type { ScenerySolids } from './walking'

const half = 0.5
const fullTurn = Math.PI + Math.PI
const sides = [-1, 1] as const

const plantKinds = ['fir', 'alder', 'reed', 'flower', 'shore', 'crop', 'fern', 'heather'] as const
type Plant = typeof plantKinds[number]
interface PlantTile { x: number, z: number, matrices: Map<Plant, number[]> }

const plantTileSize = 92
const plantDetailRange = 155
const plantDetailRangeSquared = plantDetailRange * plantDetailRange
const matrixStride = 16
const landscapePlantAttempts = 5600
const grovePlantAttempts = 75
const groveWaterClearance = 1
const groveFirProbability = 0.83

const dampGroundTolerance = 0.05
const slopeProbeDistance = 1
const maxProbeHeightChange = 1.8
const roadPlantClearance = 10
const sitePlantClearance = 3
const villageWalkSearchRange = 65
const villageWalkPlantClearance = 1.6
const discoveryTrailPlantClearance = 2.2
const discoveryStopPlantClearance = 3.5
const lookoutTreeClearance = 3
const cottagePlantClearance = 7
const plantScaleMin = 0.68
const plantScaleSpread = 0.68
const plantBreadthMin = 0.82
const plantBreadthSpread = 0.42
const groveScaleMin = 0.85
const groveScaleSpread = 0.7
const cropScaleMin = 0.72
const cropScaleSpread = 0.36
const marshCover = 0.81
const reedShare = 0.57
const woodlandCover = 0.95
const firShare = 0.62
const meadowFlowerChance = 0.73

function plantSiteIsClear(x: number, y: number, z: number, water: number) {
  const probe = slopeProbeDistance
  return y >= water - dampGroundTolerance
    && Math.abs(groundHeight(x + probe, z) - groundHeight(x - probe, z)) < maxProbeHeightChange
    && Math.abs(groundHeight(x, z + probe) - groundHeight(x, z - probe)) < maxProbeHeightChange && !clearAirfield(x, z)
    && nearestRoad(x, z).distance >= roadPlantClearance && !sites.some((site) => siteDistance(x, z, site) < sitePlantClearance)
    && !villageWalks.some(({ points }) => points.length && Math.abs(points[0].x - x) < villageWalkSearchRange
      && Math.abs(points[0].z - z) < villageWalkSearchRange && distanceToRoute({ x, z }, points) < villageWalkPlantClearance)
    && discoveryWalks.every((walk) => distanceToRoute({ x, z }, walk.path) > discoveryTrailPlantClearance
      && Math.hypot(x - walk.x, z - walk.z) > discoveryStopPlantClearance)
    && !islandBuildings.some((building) => building.kind === 'cottage' && Math.hypot(x - building.x, z - building.z) < cottagePlantClearance)
}

function buildPlantModel(meshes: MeshFactory, kind: Plant) {
  const root = new TransformNode(`${kind} template`, meshes.scene)
  const { leafSegments, trunk, fir, alder, fern, heather, stalk } = saltwindPlantModels
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: string) =>
    meshes.box(x, y, z, w, h, d, color, root, false)
  const sphere = (x: number, y: number, z: number, w: number, h: number, d: number, color: string) =>
    meshes.sphere(x, y, z, w, h, d, color, root, false, leafSegments)
  if (kind === 'fir' || kind === 'alder') {
    box(0, trunk.centerY, 0, trunk.width, trunk.height, trunk.depth, trunk.color)
    if (kind === 'fir') for (let i = 0; i < fir.tierCount; i++) {
      const width = fir.firstBaseDiameter - i * fir.baseTaper
      const tier = meshes.cylinder(
        0,
        fir.firstY + i * fir.tierRise,
        0,
        fir.tipDiameter,
        width,
        fir.tierHeight,
        fir.tierSides,
        fir.tierColors[i % fir.tierColors.length],
        root,
      )
      meshes.shadows.removeShadowCaster(tier)
    }
    else for (const crown of alder) sphere(...crown)
  }
  else if (kind === 'fern') {
    for (const side of sides) for (let i = 0; i < fern.frondsPerSide; i++) {
      const x = side * (fern.firstX + i * fern.xSpacing)
      const y = fern.firstY - i * fern.dropPerFrond
      const layer = fern.layers[i % fern.layers.length]
      sphere(x, y, layer.z, ...fern.size, layer.color).rotation.z = side * fern.tilt
    }
  }
  else if (kind === 'heather') {
    const { foliage, bloom } = heather
    for (const side of [-1, 0, 1]) {
      sphere(side * foliage.xSpacing, foliage.y, 0, ...foliage.size, foliage.color)
      sphere(side * bloom.xSpacing, bloom.centerY + Math.abs(side) * bloom.edgeRise, side * bloom.zSpacing, ...bloom.size, bloom.color)
    }
  }
  else {
    const { leaf, head } = stalk
    const plant = stalk.family[kind]
    for (const [index, side] of sides.entries()) {
      box(side * leaf.x, plant.height * leaf.centerHeightRatio, 0, leaf.width, plant.height, leaf.depth, plant.leaf).rotation.z = -side * leaf.tilt
      sphere(side * head.x, plant.height * head.centerHeightRatio, 0, head.width, plant.headHeight, head.depth, plant.head[index])
    }
  }
  return root
}

function populatePlantTiles(meshes: MeshFactory, solids: ScenerySolids) {
  const distribution = saltwindPlantDistribution
  const random = seededRandom(distribution.seed)
  const tiles = new Map<string, PlantTile>()
  const trunk = saltwindPlantModels.trunk
  function place(kind: Plant, x: number, y: number, z: number, scale: number) {
    const ix = Math.floor(x / plantTileSize), iz = Math.floor(z / plantTileSize)
    const key = `${ix},${iz}`
    const tile = tiles.get(key) ?? {
      x: ix * plantTileSize + plantTileSize * half,
      z: iz * plantTileSize + plantTileSize * half,
      matrices: new Map<Plant, number[]>(),
    }
    const matrices = tile.matrices.get(kind) ?? []
    const yaw = random() * fullTurn
    const breadth = scale * (plantBreadthMin + random() * plantBreadthSpread)
    if ((kind === 'fir' || kind === 'alder') && discoveryWalks.some((walk) =>
      distanceToRoute({ x, z }, [walk, walk.view]) < lookoutTreeClearance)) return
    if (kind === 'fir' || kind === 'alder') solids.add({
      x,
      z,
      heading: yaw,
      width: trunk.width * breadth,
      depth: trunk.depth * breadth,
      bottom: y - trunk.support.belowGround * scale,
      top: y + trunk.support.aboveGround * scale,
    })
    const transform = Matrix.Scaling(breadth, scale, breadth).multiply(Matrix.RotationY(yaw))
    transform.setTranslationFromFloats(x, y, z)
    matrices.push(...transform.m)
    tile.matrices.set(kind, matrices)
    tiles.set(key, tile)
  }
  for (let i = 0; i < landscapePlantAttempts; i++) {
    const x = random() * distribution.x.span + distribution.x.start
    const z = random() * distribution.z.span + distribution.z.start
    const y = groundHeight(x, z), water = waterHeight(x, z)
    if (!plantSiteIsClear(x, y, z, water)) continue
    const { coast, marsh, woods, bluff } = habitatAt(x, y, z)
    const r = random(), scale = plantScaleMin + random() * plantScaleSpread
    if (r < coast) place('shore', x, y, z, scale)
    else if (r < marsh * marshCover) place(r < marsh * reedShare ? 'reed' : 'alder', x, y, z, scale)
    else if (r < woods * woodlandCover) place(r < woods * firShare ? 'fir' : 'fern', x, y, z, scale)
    else if (r < bluff) place('heather', x, y, z, scale)
    else if (r < meadowFlowerChance) place('flower', x, y, z, scale)
  }
  for (const [cx, cz] of alderCrownGroves.centers) for (let i = 0; i < grovePlantAttempts; i++) {
    const angle = random() * fullTurn, range = Math.sqrt(random()) * alderCrownGroves.radius
    const x = cx + Math.cos(angle) * range, z = cz + Math.sin(angle) * range
    const y = groundHeight(x, z), water = waterHeight(x, z)
    if (y > water + groveWaterClearance && plantSiteIsClear(x, y, z, water)) {
      place(random() < groveFirProbability ? 'fir' : 'alder', x, y, z, groveScaleMin + random() * groveScaleSpread)
    }
  }
  const { plants, extraGap, bedCenter } = longAcreRows
  const rowZ = (row: number) => longAcreRows.firstZ + row * longAcreRows.spacing + Math.floor(row / extraGap.every) * extraGap.distance
  for (let row = 0; row < longAcreRows.count; row++) for (let column = 0; column < plants.columns; column++) {
    const x = plants.firstX + column * plants.spacing + random() * plants.xJitter, z = rowZ(row)
    place('crop', x, groundHeight(x, z), z, cropScaleMin + random() * cropScaleSpread)
  }
  for (let row = 0; row < longAcreRows.count; row++) {
    meshes.box(bedCenter.x, bedCenter.y, rowZ(row), ...longAcreCropBed.size, longAcreCropBed.color, undefined, false)
  }

  return tiles
}

export function createSaltwindPlants(meshes: MeshFactory, solids: ScenerySolids) {
  const tiles = populatePlantTiles(meshes, solids)
  const models = new Map<Plant, Mesh[]>()
  for (const kind of plantKinds) {
    const root = buildPlantModel(meshes, kind)
    models.set(kind, root.getChildMeshes().filter((mesh): mesh is Mesh => mesh instanceof Mesh))
    root.setEnabled(false)
  }
  const details: { x: number, z: number, batch: Mesh }[] = []
  for (const tile of tiles.values()) for (const [kind, matrices] of tile.matrices) {
    for (const part of models.get(kind) ?? []) {
      part.computeWorldMatrix(true)
      const batch = part.clone(`${kind} ${tile.x},${tile.z}`, null, true)
      // Each tile binds its own matrix buffer and must have a separate vertex array.
      batch.makeGeometryUnique()
      batch.parent = null
      batch.setEnabled(true)
      batch.position.setAll(0)
      batch.rotation.setAll(0)
      batch.scaling.setAll(1)
      const local = part.getWorldMatrix()
      const transforms = new Float32Array(matrices.length)
      for (let i = 0; i < matrices.length; i += matrixStride) local.multiply(Matrix.FromArray(matrices, i)).copyToArray(transforms, i)
      batch.thinInstanceSetBuffer('matrix', transforms, matrixStride, true)
      if (kind !== 'fir' && kind !== 'alder' && kind !== 'crop') details.push({ x: tile.x, z: tile.z, batch })
    }
  }
  for (const parts of models.values()) parts[0]?.parent?.dispose(false, false)
  return (camera: MapPoint, overview: boolean) => {
    for (const { x, z, batch } of details) {
      const dx = x - camera.x, dz = z - camera.z
      batch.setEnabled(!overview && dx * dx + dz * dz < plantDetailRangeSquared)
    }
  }
}
