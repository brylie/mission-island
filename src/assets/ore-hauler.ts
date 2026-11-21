import type { Material } from '@babylonjs/core/Materials/material'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'

export const haulerSpec = { name: 'Ore truck', width: 2.55, length: 8.8, height: 3.4, track: 2.04,
  axles: [-2.97, -1.72, 2.8], wheel: .54, cargo: { width: 2.17, length: 5.28, height: 1.36, floor: 1.25, z: -1.29 } } as const

const ochre = '#e5a648', roof = '#f1dfb3', glass = '#426976', frame = '#344944', rubber = '#283933'
const bedPaint = '#4d696c', ribPaint = '#73908e', liner = '#55635e', silver = '#a6b2a4'
type Profile = [z: number, y: number][]

// Extrude a convex side elevation across the chassis. Duplicate face vertices
// for crisp folded edges. A flared sidewall moves outboard as it rises.
function bodywork(meshes: MeshFactory, root: TransformNode) {
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: string | Material) =>
    meshes.box(x, y, z, w, h, d, color, root)
  function panel(name: string, left: number, right: number, profile: Profile, color: string, flare = 0) {
    const positions: number[] = [], indices: number[] = [], uvs: number[] = []
    const edge = (width: number) => profile.map(([z, y]) => [width + flare * (y - haulerSpec.cargo.floor), y, z])
    const a = edge(left), b = edge(right)
    function face(points: number[][], cap: boolean) {
      const start = positions.length / 3
      for (const [x, y, z] of points) { positions.push(x, y, z); uvs.push(cap ? z : x, y) }
      for (let i = 2; i < points.length; i++) indices.push(start, start + i - 1, start + i)
    }
    face(b, true)
    for (let i = 0; i < a.length; i++) {
      const j = (i + 1) % a.length
      face([a[i], a[j], b[j], b[i]], false)
    }
    face(a.reverse(), true)
    const mesh = meshes.surface(name, positions, indices, color, root, uvs)
    meshes.shadows.addShadowCaster(mesh, false)
  }
  return { box, panel }
}

function buildCab({ box, panel }: ReturnType<typeof bodywork>, tread: Material) {
  panel('Cab sill and short bonnet', -1.15, 1.15, [[1.58, 1.10],[4.07, 1.10],[4.24, 1.24],[4.24, 1.57],[3.94, 1.86],[1.58, 1.86]], ochre)
  panel('Raked cab', -1.09, 1.09, [[1.64, 1.83],[3.94, 1.83],[3.65, 2.96],[1.77, 2.96]], ochre)
  panel('Folded cream roof', -1.16, 1.16, [[1.66, 2.93],[3.72, 2.93],[3.81, 2.99],[3.62, 3.09],[1.79, 3.09],[1.66, 3.03]], roof)
  for (const side of [-1, 1]) {
    // The divided windshield follows the same rake as the front pillars.
    box(side * .505, 2.46, 3.79, .96, .86, .035, glass).rotation.x = -.25
    box(side * .51, 2.16, 3.89, .65, .037, .035, frame).rotation.set(-.25, 0, -.13)
    const sideGlass: Profile = [[1.84, 2.05],[3.68, 2.05],[3.48, 2.86],[1.93, 2.86]]
    panel('Cab door glass', side * 1.094 - .009, side * 1.094 + .009, sideGlass, '#557b83')
    box(side * 1.11, 2.48, 2.34, .026, .80, .055, frame)
    box(side * 1.154, 1.70, 1.93, .036, .065, .24, frame)
    box(side * 1.155, 1.39, 2.42, .034, .065, 1.4, roof)
    const door = side * 1.158
    panel('Slatecliff peak', door - .008, door + .008, [[2.69, 1.51],[3.09, 1.51],[2.90, 1.73]], roof)
    panel('Slatecliff ridge', door - .008, door + .008, [[3.04, 1.51],[3.29, 1.51],[3.17, 1.65]], roof)
    box(side * 1.15, 2.04, 3.52, .18, .065, .065, frame)
    box(side * 1.20, 2.21, 3.54, .13, .35, .18, frame)
    box(side * 1.20, 2.22, 3.44, .103, .26, .019, silver)
    box(side * 1.07, .84, 1.78, .32, .13, .53, tread)
    box(side * 1.02, .63, 1.71, .40, .11, .48, frame)
    box(side * .86, 1.39, 4.25, .45, .24, .08, frame)
    box(side * .86, 1.40, 4.297, .32, .15, .027, '#fff4c1')
    box(side * 1.08, 1.39, 4.25, .09, .14, .055, '#d77d3f')
    box(side * .73, 3.108, 3.39, .14, .06, .12, '#daa051')
  }
  box(0, 1.43, 4.25, 1.12, .33, .055, frame)
  for (const y of [1.34, 1.43, 1.52]) box(0, y, 4.29, .98, .024, .026, silver)
  box(0, .92, 4.22, 2.41, .26, .32, '#71857f')
  box(0, 2.49, 1.69, 1.29, .40, .046, glass).rotation.x = .115
}

function buildTipper({ box, panel }: ReturnType<typeof bodywork>, metal: Material) {
  const { width, length, floor, height, z } = haulerSpec.cargo
  const rear = z - length / 2, front = z + length / 2, lip = floor + height
  box(0, floor - .075, z + .09, width - .17, .15, length - .26, liner)
  for (const side of [-1, 1]) {
    const flare = side * .13, wall = side * (width / 2 - .10)
    const skin: Profile = [[rear + .28,floor - .07],[front - .13,floor - .07],[front,lip],[rear,lip]]
    panel('Flared tipper side', wall - .075, wall + .075, skin, bedPaint, flare)
    for (const rib of [-3.30, -2.15, -1.00, .15, 1.00]) {
      const x = wall + side * .085
      panel('Pressed side rib', x - .027, x + .027, [[rib + .11,floor + .06],[rib + .24,floor + .06],
        [rib + .04,lip - .06],[rib - .12,lip - .06]], ribPaint, flare)
    }
    box(side * 1.16, lip, z, .17, .115, length + .05, ribPaint)
    box(side * .99, floor - .01, z + .08, .18, .14, length - .29, frame)
    box(side * .67, floor + .01, z + .08, .075, .034, length - .44, '#78837a')
    // A fixed mudguard bridges the tandem wheels beneath the tipping body.
    const fender = side * 1.02
    box(fender, 1.17, -2.345, .44, .105, 2.03, frame)
    box(fender, 1.045, -3.46, .44, .105, .35, frame).rotation.x = -.70
    box(fender, 1.045, -1.23, .44, .105, .35, frame).rotation.x = .70
    box(fender, .69, -3.58, .40, .57, .06, rubber)
    box(fender, 1.135, 2.80, .43, .10, 1.08, ochre)
  }
  box(0, floor + height / 2, rear + .155, width - .10, height, .12, bedPaint).rotation.x = -.17
  box(0, lip, rear - .012, width - .02, .12, .14, ribPaint)
  for (const side of [-1, 1]) {
    box(side * .80, 1.91, rear + .122, .105, 1.10, .10, ribPaint).rotation.x = -.17
    box(side * .81, lip + .015, rear - .07, .34, .15, .17, frame)
    box(side * .88, 1.32, rear + .16, .18, .27, .16, metal)
    box(side * .89, .78, -4.16, .45, .20, .12, frame)
    box(side * .92, .79, -4.23, .24, .105, .035, '#c45446')
    box(side * .73, .79, -4.23, .10, .105, .035, '#e6a654')
  }
  // Pale quarry chevrons also identify the truck from the chase camera.
  for (const side of [-1, 1]) {
    const stripe = box(side * .19, 1.97, rear + .053, .48, .085, .025, roof)
    stripe.rotation.set(-.17, 0, side * .40)
  }
  box(0, 1.52, rear + .14, 1.98, .11, .10, ribPaint).rotation.x = -.17
  box(0, .77, -4.14, 2.19, .18, .14, frame)
  for (const x of [-.64, .64]) box(x, .64, -4.16, .095, .31, .12, frame)
  box(0, .51, -4.19, 2.18, .14, .22, '#71857f')
  box(0, 2.25, front - .025, 2.19, 1.99, .13, bedPaint)
  panel('Cab guard canopy', -1.22, 1.22, [[front - .10, 3.23],[2.22, 3.23],[2.30, 3.33],[front - .09, 3.37]], ribPaint)
  for (const side of [-1, 1]) panel('Guard gusset', side * 1.10 - .05, side * 1.10 + .05,
    [[front + .03, 2.70],[2.11, 3.23],[front + .03, 3.23]], bedPaint)
}

function buildWheel(meshes: MeshFactory, root: TransformNode, side: number, z: number) {
  const axle = new TransformNode('Hauler wheel steering', meshes.scene)
  axle.parent = root
  axle.position.set(side * haulerSpec.track / 2, haulerSpec.wheel, z)
  const wheel = new TransformNode('Hauler wheel spin', meshes.scene)
  wheel.parent = axle
  function ring(x: number, outer: number, inner: number, depth: number, color: string) {
    meshes.cylinder(side * x, 0, 0, outer, inner, depth, 16, color, wheel).rotation.z = -side * Math.PI / 2
  }
  ring(0, 1.08, 1.08, .33, rubber)
  ring(.185, .95, 1.08, .055, rubber)
  ring(.215, .61, .67, .035, silver)
  ring(.236, .46, .51, .03, frame)
  ring(.253, .22, .29, .036, silver)
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3
    meshes.box(side * .256, .173 * Math.cos(angle), .173 * Math.sin(angle), .028, .053, .056, silver, wheel)
  }
  return { axle, wheel, steers: z === haulerSpec.axles[2] }
}

// Combine rigid details by finish while their local pivot is still at the origin.
// Each wheel keeps its own pivot. The parked scene retains individual part colliders.
function batchMovingParts(meshes: MeshFactory, parent: TransformNode) {
  const groups = new Map<Material, Mesh[]>()
  for (const mesh of parent.getChildMeshes(true)) {
    if (!(mesh instanceof Mesh) || !mesh.material) continue
    const group = groups.get(mesh.material) ?? []
    group.push(mesh)
    groups.set(mesh.material, group)
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue
    for (const mesh of group) { mesh.parent = null; meshes.shadows.removeShadowCaster(mesh, false) }
    const batch = Mesh.MergeMeshes(group, true, true)!
    batch.parent = parent
    batch.receiveShadows = true
    meshes.shadows.addShadowCaster(batch, false)
  }
}

export function createOreHauler(meshes: MeshFactory, moving = false) {
  const root = new TransformNode(haulerSpec.name, meshes.scene)
  const body = bodywork(meshes, root)
  const metal = meshes.paintSurface('metal', '#84948d')
  body.box(0, .78, .04, 1.43, .32, 8.33, frame)
  // The tank and its retaining straps sit between the cab steps and tandem bogie.
  for (const side of [-1, 1]) {
    const x = side * .85
    meshes.cylinder(x, .81, .20, .51, .51, 1.24, 12, '#798c82', root).rotation.x = Math.PI / 2
    for (const z of [-.18, .58]) meshes.cylinder(x, .81, z, .53, .53, .095, 12, frame, root).rotation.x = Math.PI / 2
  }
  buildCab(body, metal)
  buildTipper(body, metal)
  const wheels = haulerSpec.axles.flatMap(z => [-1, 1].map(side => buildWheel(meshes, root, side, z)))
  if (moving) {
    batchMovingParts(meshes, root)
    for (const { wheel } of wheels) batchMovingParts(meshes, wheel)
  }
  function roll(distance: number, steering: number) {
    for (const { axle, wheel, steers } of wheels) {
      wheel.rotation.x += distance / haulerSpec.wheel
      if (steers) axle.rotation.y = steering
    }
  }
  return { root, roll }
}
