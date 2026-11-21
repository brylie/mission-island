import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { createLookoutFire } from './fire-effect'
import type { MeshFactory } from './island-meshes'
import { lookoutRecoveryAt, recoveryBeds, type LookoutRecovery } from './lookout-recovery'
import { createIslandMaterial } from './materials'
import type { Snapshot } from './protocol'
import { distanceToRoute, footpaths } from './routes'
import { seededRandom } from './seeded-random'
import { groundHeight } from './terrain'
import { lookout, type Point } from './world'

const trail = footpaths.find(({ name }) => name === 'Lookout trail')!
const verge = (point: Point) => distanceToRoute(point, trail.points) - trail.width / 2
const clamp = (n: number) => Math.max(0, Math.min(1, n))

function buildAsh(meshes: MeshFactory) {
  const vertices: number[] = [], indices: number[] = [], colors: number[] = []
  const steps = 16
  for (const [index, bed] of recoveryBeds.entries()) {
    const start = vertices.length / 3
    for (let j = 0; j <= steps; j++) for (let i = 0; i <= steps; i++) {
      const u = 2 * i / steps - 1, v = 2 * j / steps - 1
      const point = { x: bed.x + u * bed.rx, z: bed.z + v * bed.rz }
      const edge = Math.hypot(u, v) + .089 * Math.sin(u * 13 + v * 7 + index) * Math.sin(v * 10)
      const dust = (.77 + .16 * Math.sin(u * 47 + v * 11) * Math.cos(v * 46)) * clamp((1 - edge) * 6) * clamp(verge(point) * 5)
      const soot = .62 + .28 * Math.sin(u * 9 + v * 6.5) ** 2 + .09 * Math.cos(u * 51 - v * 18)
      vertices.push(point.x, groundHeight(point) + .017, point.z)
      colors.push(soot, soot * .98, soot, dust)
      if (i && j) {
        const a = start + j * (steps + 1) + i
        indices.push(a - steps - 2, a - steps - 1, a, a - steps - 2, a, a - 1)
      }
    }
  }
  const paint = createIslandMaterial(meshes.scene, 'Lookout ash and wet soil', '#645951')
  paint.backFaceCulling = false
  const mesh = meshes.surface('Lookout scorched verge', vertices, indices, paint)
  mesh.setVerticesData(VertexBuffer.ColorKind, colors)
  mesh.hasVertexAlpha = true
  mesh.alphaIndex = 1
  mesh.freezeWorldMatrix()
  return { mesh, paint }
}

function addBlade(vertices: number[], point: Point, angle: number, height: number, bend: number, width: number, lift = 0) {
  const y = groundHeight(point) + .021 + lift
  const dx = Math.cos(angle), dz = Math.sin(angle)
  const a = [point.x - dz * width, y, point.z + dx * width]
  const b = [point.x + dz * width, y, point.z - dx * width]
  const middle = [point.x + dx * bend * .42, y + height * .66, point.z + dz * bend * .42]
  const tip = [point.x + dx * bend, y + height, point.z + dz * bend]
  vertices.push(...a, ...b, ...middle, ...middle, ...b, ...tip)
}

function paintBlades(meshes: MeshFactory, vertices: number[], name: string, color: string) {
  const material = meshes.paint(color)
  material.backFaceCulling = false
  return meshes.surface(name, vertices, Array.from({ length: vertices.length / 3 }, (_, i) => i), material).freezeWorldMatrix()
}

function buildVerge(meshes: MeshFactory, stage: 'ash' | 'shoots' | 'established') {
  const random = seededRandom(4623)
  const blades: number[] = [], lights: number[] = [], petals: number[] = []
  for (const bed of recoveryBeds) for (let i = 0; i < 43; i++) {
    const angle = random() * Math.PI * 2, scatter = random()
    const radius = .15 + scatter * .84
    const point = { x: bed.x + Math.cos(angle) * radius * bed.rx, z: bed.z + Math.sin(angle) * radius * bed.rz }
    const scale = .58 + random() * .75, sway = random() * Math.PI * 2
    // First-dawn shoots are a subset of the same rooted clumps seen on later visits.
    if (verge(point) < .29 || (stage === 'shoots' && (radius < .59 || i % 5 === 0))) continue
    const height = (stage === 'ash' ? .04 : stage === 'shoots' ? .21 : .37) * scale
    const spread = (stage === 'ash' ? .29 : stage === 'shoots' ? .105 : .16) * scale
    for (let leaf = 0; leaf < 5; leaf++) {
      addBlade(leaf % 3 ? blades : lights, point, sway + leaf * (.64 + scatter * .4),
        height * (1 - .075 * leaf), spread * (1 + leaf * .08), .026 + .008 * scale)
    }
    if (stage === 'established' && i % 6 === 0) {
      for (let lobe = 0; lobe < 5; lobe++) {
        addBlade(petals, point, lobe * Math.PI * .4 + sway, .034, .075, .025, height * .92)
      }
    }
  }
  const colors = {
    ash: ['#695746', '#8b7150'],
    shoots: ['#668849', '#9caa58'],
    established: ['#5e804c', '#82965a'],
  }[stage]
  const group = [paintBlades(meshes, blades, stage + ' verge grass', colors[0]), paintBlades(meshes, lights, stage + ' pale tips', colors[1])]
  if (petals.length) group.push(paintBlades(meshes, petals, 'Lookout recovery meadow flowers', '#efd190'))
  return group
}

function buildCharredTwigs(meshes: MeshFactory) {
  const root = new TransformNode('Fallen charred twigs', meshes.scene)
  for (const [x, z, length, heading] of [[4.77, 28.58, .67, .69], [4.38, 28.94, .31, -.48], [5.38, 29.74, .51, 1.41], [7.25, 31.23, .56, -.21]]) {
    const y = groundHeight({ x, z })
    const stick = meshes.box(x, y + .046, z, .087, .075, length, '#493c35', root, false)
    stick.rotation.y = heading
    const freshEnd = meshes.box(x + Math.sin(heading) * length / 2, y + .044, z + Math.cos(heading) * length / 2,
      .077, .057, .023, '#b48c63', root, false)
    freshEnd.rotation.y = heading
  }
  return root
}

const soil = {
  ash: { tint: Color3.FromHexString('#625b58'), opacity: 1 },
  shoots: { tint: Color3.FromHexString('#807461'), opacity: .8 },
  established: { tint: Color3.FromHexString('#8a7f5a'), opacity: .35 },
}

function createLookoutRecovery(meshes: MeshFactory) {
  const ash = buildAsh(meshes)
  const twigs = buildCharredTwigs(meshes)
  const grass = { ash: buildVerge(meshes, 'ash'), shoots: buildVerge(meshes, 'shoots'), established: buildVerge(meshes, 'established') }
  function show(stage: LookoutRecovery) {
    ash.mesh.setEnabled(stage !== 'undisturbed')
    twigs.setEnabled(stage !== 'undisturbed')
    for (const [id, group] of Object.entries(grass)) for (const mesh of group) mesh.setEnabled(stage === id)
    if (stage === 'undisturbed') return
    const { tint, opacity } = soil[stage]
    ash.paint.diffuseColor.copyFrom(tint)
    ash.paint.alpha = opacity
  }
  let current: LookoutRecovery = 'undisturbed'
  show(current)
  return (stage: LookoutRecovery) => {
    if (stage === current) return
    current = stage
    show(stage)
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
