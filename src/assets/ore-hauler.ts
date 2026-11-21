import type { Material } from '@babylonjs/core/Materials/material'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { haulerSpec, oreHaulerCab, oreHaulerChassis, oreHaulerTipper, oreHaulerWheel } from './geometry/ore-hauler'
import type { HaulerBox, HaulerProfile, HaulerWheelRing } from './geometry/ore-hauler'

export { haulerSpec }

const ochre = '#e5a648', roof = '#f1dfb3', glass = '#426976', frame = '#344944', rubber = '#283933'
const bedPaint = '#4d696c', ribPaint = '#73908e', liner = '#55635e', silver = '#a6b2a4'
const sides = [-1, 1] as const
const half = 0.5
const quarterTurn = Math.PI * half
const fullTurn = Math.PI + Math.PI
const positionComponents = 3
const firstTriangleCorner = 2
const minBatchParts = 2

// Extrude a convex side elevation across the chassis. Duplicate face vertices
// for crisp folded edges. A flared sidewall moves outboard as it rises.
function bodywork(meshes: MeshFactory, root: TransformNode) {
  const box = ({ center: [x, y, z], size }: HaulerBox, color: string | Material, side = 1) =>
    meshes.box(side * x, y, z, ...size, color, root)
  function panel(name: string, halfWidth: number, profile: HaulerProfile, color: string, centerX = 0, flare = 0) {
    const positions: number[] = [], indices: number[] = [], uvs: number[] = []
    const edge = (width: number) => profile.map(([z, y]) => [width + flare * (y - haulerSpec.cargo.floor), y, z])
    const a = edge(centerX - halfWidth), b = edge(centerX + halfWidth)
    function face(points: number[][], cap: boolean) {
      const start = positions.length / positionComponents
      for (const [x, y, z] of points) {
        positions.push(x, y, z)
        uvs.push(cap ? z : x, y)
      }
      for (let i = firstTriangleCorner; i < points.length; i++) indices.push(start, start + i - 1, start + i)
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
  const cab = oreHaulerCab
  const { windows, door, mirror, steps, lights, grille } = cab
  panel('Cab sill and short bonnet', cab.sill.halfWidth, cab.sill.profile, ochre)
  panel('Raked cab', cab.envelope.halfWidth, cab.envelope.profile, ochre)
  panel('Folded cream roof', cab.roof.halfWidth, cab.roof.profile, roof)
  for (const side of sides) {
    // The divided windshield follows the same rake as the front pillars.
    box(windows.front, glass, side).rotation.x = windows.frontRake
    box(windows.wiper, frame, side).rotation.set(windows.frontRake, 0, windows.wiper.sweep)
    panel('Cab door glass', windows.door.halfWidth, windows.door.profile, '#557b83', side * windows.door.centerX)
    box(windows.divider, frame, side)
    box(door.handle, frame, side)
    box(door.trim, roof, side)
    const { centerX, halfWidth, peak, ridge } = door.emblem
    panel('Slatecliff peak', halfWidth, peak, roof, side * centerX)
    panel('Slatecliff ridge', halfWidth, ridge, roof, side * centerX)
    box(mirror.mount, frame, side)
    box(mirror.housing, frame, side)
    box(mirror.glass, silver, side)
    box(steps.top, tread, side)
    box(steps.bottom, frame, side)
    box(lights.headlightHousing, frame, side)
    box(lights.headlightLens, '#fff4c1', side)
    box(lights.indicator, '#d77d3f', side)
    box(lights.roofMarker, '#daa051', side)
  }
  box(grille.surround, frame)
  for (const y of grille.bar.heights) box({ center: [0, y, grille.bar.z], size: grille.bar.size }, silver)
  box(cab.bumper, '#71857f')
  box(windows.rear, glass).rotation.x = windows.rear.rake
}

function buildTipper({ box, panel }: ReturnType<typeof bodywork>, metal: Material) {
  const tipper = oreHaulerTipper
  const { side: walls, tailgate } = tipper
  const { fender, tailLights, rearCrossmember, rearBracket, rearBumper } = oreHaulerChassis
  box(tipper.liner, liner)
  for (const side of sides) {
    const flare = side * walls.flare, wall = side * walls.centerX
    panel('Flared tipper side', walls.halfWidth, walls.profile, bedPaint, wall, flare)
    for (const z of walls.rib.centers) {
      const profile: HaulerProfile = walls.rib.profile.map(([offsetZ, y]) => [z + offsetZ, y])
      panel('Pressed side rib', walls.rib.halfWidth, profile, ribPaint, wall + side * walls.rib.outboard, flare)
    }
    box(walls.lipRail, ribPaint, side)
    box(walls.sill, frame, side)
    box(walls.linerRunner, '#78837a', side)
    // A fixed mudguard bridges the tandem wheels beneath the tipping body.
    box(fender.tandem, frame, side)
    box(fender.rearWing, frame, side).rotation.x = fender.rearWing.rake
    box(fender.frontWing, frame, side).rotation.x = fender.frontWing.rake
    box(fender.mudFlap, rubber, side)
    box(fender.front, ochre, side)
  }
  box(tailgate.plate, bedPaint).rotation.x = tailgate.rake
  box(tailgate.cap, ribPaint)
  for (const side of sides) {
    box(tailgate.stiffener, ribPaint, side).rotation.x = tailgate.rake
    box(tailgate.hinge, frame, side)
    box(tailgate.latch, metal, side)
    box(tailLights.housing, frame, side)
    box(tailLights.redLens, '#c45446', side)
    box(tailLights.amberLens, '#e6a654', side)
  }
  // Pale quarry chevrons also identify the truck from the chase camera.
  for (const side of sides) box(tailgate.chevron, roof, side).rotation.set(tailgate.rake, 0, side * tailgate.chevron.slant)
  box(tailgate.crossbar, ribPaint).rotation.x = tailgate.rake
  box(rearCrossmember, frame)
  for (const side of sides) box(rearBracket, frame, side)
  box(rearBumper, '#71857f')
  box(tipper.headboard, bedPaint)
  const { canopy, gusset } = tipper
  panel('Cab guard canopy', canopy.halfWidth, canopy.profile, ribPaint)
  for (const side of sides) panel('Guard gusset', gusset.halfWidth, gusset.profile, bedPaint, side * gusset.centerX)
}

function buildWheel(meshes: MeshFactory, root: TransformNode, side: number, z: number) {
  const { halfTrack, steeringAxle, segments, tire, shoulder, rim, hub, cap, lug } = oreHaulerWheel
  const axle = new TransformNode('Hauler wheel steering', meshes.scene)
  axle.parent = root
  axle.position.set(side * halfTrack, haulerSpec.wheel, z)
  const wheel = new TransformNode('Hauler wheel spin', meshes.scene)
  wheel.parent = axle
  function ring({ offset, outerDiameter, innerDiameter, depth }: HaulerWheelRing, color: string) {
    meshes.cylinder(side * offset, 0, 0, outerDiameter, innerDiameter, depth, segments, color, wheel).rotation.z = -side * quarterTurn
  }
  ring(tire, rubber)
  ring(shoulder, rubber)
  ring(rim, silver)
  ring(hub, frame)
  ring(cap, silver)
  for (let i = 0; i < lug.count; i++) {
    const angle = i * fullTurn / lug.count
    meshes.box(side * lug.offset, lug.boltCircleRadius * Math.cos(angle), lug.boltCircleRadius * Math.sin(angle), ...lug.size, silver, wheel)
  }
  return { axle, wheel, steers: z === steeringAxle }
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
    if (group.length < minBatchParts) continue
    for (const mesh of group) {
      mesh.parent = null
      meshes.shadows.removeShadowCaster(mesh, false)
    }
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
  const { frame: frameBox, fuelTank } = oreHaulerChassis
  body.box(frameBox, frame)
  // The tank and its retaining straps sit between the cab steps and tandem bogie.
  for (const side of sides) {
    const [x, y, z] = fuelTank.center
    const { diameter, length, segments, straps } = fuelTank
    meshes.cylinder(side * x, y, z, diameter, diameter, length, segments, '#798c82', root).rotation.x = quarterTurn
    for (const z of straps.positionsZ) meshes.cylinder(side * x, y, z, straps.diameter, straps.diameter, straps.width, segments, frame, root).rotation.x = quarterTurn
  }
  buildCab(body, metal)
  buildTipper(body, metal)
  const wheels = haulerSpec.axles.flatMap((z) => sides.map((side) => buildWheel(meshes, root, side, z)))
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
