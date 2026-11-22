import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { lookoutAshMesh, lookoutTwig, lookoutVergeBlade } from './assets/geometry/lookout-recovery'
import { lookoutVergeGrowth, lookoutVergeStages } from './assets/recipes/lookout-recovery'
import { createLookoutFire } from './fire-effect'
import type { MeshFactory } from './island-meshes'
import { lookoutRecoveryAt, recoveryBeds, type LookoutRecovery } from './lookout-recovery'
import { createIslandMaterial } from './materials'
import type { Snapshot } from './protocol'
import { distanceToRoute, footpaths } from './routes'
import { seededRandom } from './seeded-random'
import { groundHeight } from './terrain'
import { lookout, type Point } from './world'
import { lookoutCharredTwigs } from './worlds/starter/layout/scenery'

const half = 0.5
const dimensions = 3
const normalizedGridSpan = 2
const piRadiansPerTurn = 2
const sootStripePower = 2
const trail = footpaths.find(({ name }) => name === 'Lookout trail')!
// Distance from a point to the edge of the nearest of these paths.
const vergeOf = (paths: readonly { points: readonly Point[], width: number }[]) => (point: Point) =>
  Math.min(...paths.map(({ points, width }) => distanceToRoute(point, points) - width * half))
const verge = vergeOf([trail])
const clamp = (n: number) => Math.max(0, Math.min(1, n))

const worldOrigin = { x: 0, y: 0, z: 0 }

// An oval of burnt ground. `keep` returns how much of a point survives, for trimming ash back from a trail.
export interface RecoveryBed extends Point {
  rx: number
  rz: number
}
// How much ash survives at a point, and whether regrowth may root there.
interface Keep {
  ash(point: Point): number
  grows(point: Point): boolean
}
// Ash fades out at a path's edge and nothing regrows on the path itself.
function pathKeep(edge: (point: Point) => number): Keep {
  return {
    ash: (point) => clamp(edge(point) * lookoutAshMesh.edge.trailFade),
    grows: (point) => edge(point) >= lookoutVergeGrowth.scatter.trailSetback,
  }
}
const lookoutKeep = pathKeep(verge)
// Wildfire scars stay off every island footpath.
const footpathKeep = pathKeep(vergeOf(footpaths))

export function createLookoutAsh(meshes: MeshFactory, origin = worldOrigin) {
  return createRecoveryAsh(meshes, recoveryBeds, lookoutKeep, origin)
}

function createRecoveryAsh(meshes: MeshFactory, beds: readonly RecoveryBed[], keep: Keep, origin = worldOrigin, name = 'Lookout ash and wet soil') {
  const vertices: number[] = [], indices: number[] = [], colors: number[] = []
  const { grid: { steps, raised }, edge, dust, soot, finish } = lookoutAshMesh
  const row = steps + 1
  for (const [index, bed] of beds.entries()) {
    const start = vertices.length / dimensions
    for (let j = 0; j <= steps; j++) for (let i = 0; i <= steps; i++) {
      const u = normalizedGridSpan * i / steps - 1, v = normalizedGridSpan * j / steps - 1
      const point = { x: bed.x + u * bed.rx, z: bed.z + v * bed.rz }
      const roughEdge = Math.hypot(u, v) + edge.ripple * Math.sin(u * edge.uFrequency + v * edge.vFrequency + index) * Math.sin(v * edge.crossFrequency)
      const opacity = (dust.opacity + dust.variation * Math.sin(u * dust.uFrequency + v * dust.vFrequency) * Math.cos(v * dust.crossFrequency)) * clamp((1 - roughEdge) * edge.fade) * keep.ash(point)
      const value = soot.base + soot.stripes * Math.sin(u * soot.uFrequency + v * soot.vFrequency) ** sootStripePower + soot.flecks * Math.cos(u * soot.fleckU - v * soot.fleckV)
      vertices.push(point.x - origin.x, groundHeight(point) + raised - origin.y, point.z - origin.z)
      colors.push(value, value * soot.greenScale, value, opacity)
      if (i && j) {
        const a = start + j * row + i
        const opposite = a - row - 1
        indices.push(opposite, a - row, a, opposite, a, a - 1)
      }
    }
  }
  const paint = createIslandMaterial(meshes.scene, name, finish)
  paint.backFaceCulling = false
  const mesh = meshes.surface('Lookout scorched verge', vertices, indices, paint)
  mesh.setVerticesData(VertexBuffer.ColorKind, colors)
  mesh.hasVertexAlpha = true
  mesh.alphaIndex = 1
  mesh.freezeWorldMatrix()
  return { mesh, paint }
}

function addBlade(vertices: number[], point: Point, angle: number, height: number, bend: number, width: number, lift = 0) {
  const { raised, bendAtJoint, heightAtJoint } = lookoutVergeBlade
  const y = groundHeight(point) + raised + lift
  const dx = Math.cos(angle), dz = Math.sin(angle)
  const a = [point.x - dz * width, y, point.z + dx * width]
  const b = [point.x + dz * width, y, point.z - dx * width]
  const middle = [point.x + dx * bend * bendAtJoint, y + height * heightAtJoint, point.z + dz * bend * bendAtJoint]
  const tip = [point.x + dx * bend, y + height, point.z + dz * bend]
  vertices.push(...a, ...b, ...middle, ...middle, ...b, ...tip)
}

function paintBlades(meshes: MeshFactory, vertices: number[], name: string, color: string) {
  const material = meshes.paint(color)
  material.backFaceCulling = false
  return meshes.surface(name, vertices, Array.from({ length: vertices.length / dimensions }, (_, i) => i), material).freezeWorldMatrix()
}

function buildVerge(meshes: MeshFactory, stage: 'ash' | 'shoots' | 'established', beds: readonly RecoveryBed[], keep: Keep, seedOffset = 0) {
  const { seed, scatter: sites, shoots, leaves, flowers } = lookoutVergeGrowth
  const growth = lookoutVergeStages[stage]
  const random = seededRandom(seed + seedOffset)
  const blades: number[] = [], lights: number[] = [], petals: number[] = []
  for (const bed of beds) for (let i = 0; i < sites.perBed; i++) {
    const angle = random() * Math.PI * piRadiansPerTurn, scatter = random()
    const radius = sites.firstRadius + scatter * sites.radiusRange
    const point = { x: bed.x + Math.cos(angle) * radius * bed.rx, z: bed.z + Math.sin(angle) * radius * bed.rz }
    const scale = sites.minScale + random() * sites.scaleRange, sway = random() * Math.PI * piRadiansPerTurn
    // First-dawn shoots are a subset of the same rooted clumps seen on later visits.
    if (!keep.grows(point) || (stage === 'shoots' && (radius < shoots.firstRadius || i % shoots.skipEvery === 0))) continue
    const height = growth.height * scale
    const spread = growth.spread * scale
    for (let leaf = 0; leaf < leaves.count; leaf++) {
      addBlade(leaf % leaves.paleEvery ? blades : lights, point, sway + leaf * (leaves.spread + scatter * leaves.spreadVariation), height * (1 - leaves.heightStep * leaf), spread * (1 + leaf * leaves.bendStep), leaves.width + leaves.widthVariation * scale)
    }
    if (stage === 'established' && i % flowers.every === 0) {
      for (let lobe = 0; lobe < flowers.lobes; lobe++) {
        addBlade(petals, point, lobe * Math.PI * flowers.anglePi + sway, flowers.height, flowers.spread, flowers.width, height * flowers.crownScale)
      }
    }
  }
  const group = [paintBlades(meshes, blades, stage + ' verge grass', growth.blades), paintBlades(meshes, lights, stage + ' pale tips', growth.tips)]
  if (petals.length) group.push(paintBlades(meshes, petals, 'Lookout recovery meadow flowers', flowers.color))
  return group
}

function buildCharredTwigs(meshes: MeshFactory) {
  const root = new TransformNode('Fallen charred twigs', meshes.scene)
  const { bark, exposedEnd } = lookoutTwig
  for (const [x, z, length, heading] of lookoutCharredTwigs) {
    const y = groundHeight({ x, z })
    const stick = meshes.box(x, y + bark.y, z, bark.width, bark.height, length, bark.finish, root, false)
    stick.rotation.y = heading
    const freshEnd = meshes.box(x + Math.sin(heading) * length * half, y + exposedEnd.y, z + Math.cos(heading) * length * half, ...exposedEnd.size, exposedEnd.finish, root, false)
    freshEnd.rotation.y = heading
  }
  return root
}

const soilTint = {
  ash: Color3.FromHexString(lookoutVergeStages.ash.tint),
  shoots: Color3.FromHexString(lookoutVergeStages.shoots.tint),
  established: Color3.FromHexString(lookoutVergeStages.established.tint),
}

interface GroundLook {
  keep?: Keep
  ashTint?: string
  // Varies where the regrowth roots, so each scar grows back differently.
  seed?: number
  name?: string
}

// Ash, then shoots, then grass and flowers over the same beds, switched by the recovery stage.
export function createRecoveryGround(meshes: MeshFactory, beds: readonly RecoveryBed[], { keep = footpathKeep, ashTint, seed = 0, name }: GroundLook = {}) {
  const freshAsh = ashTint ? Color3.FromHexString(ashTint) : soilTint.ash
  const ash = createRecoveryAsh(meshes, beds, keep, worldOrigin, name)
  const grass = { ash: buildVerge(meshes, 'ash', beds, keep, seed), shoots: buildVerge(meshes, 'shoots', beds, keep, seed), established: buildVerge(meshes, 'established', beds, keep, seed) }
  function show(stage: LookoutRecovery) {
    ash.mesh.setEnabled(stage !== 'undisturbed')
    for (const [id, group] of Object.entries(grass)) for (const mesh of group) mesh.setEnabled(stage === id)
    if (stage === 'undisturbed') return
    ash.paint.diffuseColor.copyFrom(stage === 'ash' ? freshAsh : soilTint[stage])
    ash.paint.alpha = lookoutVergeStages[stage].opacity
  }
  let current: LookoutRecovery = 'undisturbed'
  show(current)
  return {
    show(stage: LookoutRecovery) {
      if (stage === current) return
      current = stage
      show(stage)
    },
    dispose() {
      ash.mesh.dispose()
      ash.paint.dispose()
      for (const group of Object.values(grass)) for (const mesh of group) mesh.dispose()
    },
  }
}

function createLookoutRecovery(meshes: MeshFactory) {
  const ground = createRecoveryGround(meshes, recoveryBeds, { keep: lookoutKeep })
  const twigs = buildCharredTwigs(meshes)
  return (stage: LookoutRecovery) => {
    twigs.setEnabled(stage !== 'undisturbed')
    ground.show(stage)
  }
}

export function createLookoutIncident(meshes: MeshFactory, visitPreview = false) {
  const fire = createLookoutFire(meshes.scene, lookout.x, lookout.z, visitPreview)
  const recovery = createLookoutRecovery(meshes)
  return (state: Pick<Snapshot, 'mission' | 'islandTime' | 'lookoutFireClearedAt' | 'fire'>, time: number) => {
    const stage = lookoutRecoveryAt(state)
    recovery(stage)
    fire.pose(time, state.mission === 'fire' ? state.fire : 0)
    return stage
  }
}
