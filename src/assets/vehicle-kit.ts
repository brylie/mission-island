import type { Material } from '@babylonjs/core/Materials/material'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { fleetLampGlow, fleetPaint, fleetWheel, type VehiclePart, type VehicleProfile } from './geometry/vehicle-kit'

export { fleetPaint }
export type { VehiclePart, VehicleProfile }

const half = 0.5
const quarterTurn = Math.PI * half
const fullTurn = Math.PI + Math.PI
const diameterPerRadius = 2
const positionComponents = 3
const firstTriangleCorner = 2
const minBatchParts = 2

const ringPaint = {
  shoulder: fleetPaint.rubber,
  rim: fleetPaint.brightTrim,
  hub: fleetPaint.frame,
  cap: fleetPaint.brightTrim,
} as const satisfies Record<keyof typeof fleetWheel.rings, string>

// Boxes mirror across the centerline with `side`. Panels extrude a convex side
// elevation across the body and duplicate face vertices for crisp folded edges.
// A flared panel moves outboard as it rises above `flareBase`.
export function vehicleBodywork(meshes: MeshFactory, root: TransformNode, flareBase = 0) {
  const box = ({ center: [x, y, z], size }: VehiclePart, color: string | Material, side = 1) =>
    meshes.box(side * x, y, z, ...size, color, root)
  function panel(name: string, halfWidth: number, profile: VehicleProfile, color: string, centerX = 0, flare = 0) {
    const positions: number[] = [], indices: number[] = [], uvs: number[] = []
    const edge = (width: number) => profile.map(([z, y]) => [width + flare * (y - flareBase), y, z])
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
    return mesh
  }
  return { box, panel }
}

export type VehicleBodywork = ReturnType<typeof vehicleBodywork>

// Dress a wheel node with the fleet tire, rim, hub, cap and lug nuts. The node
// sits at the wheel center; `side` turns the trim outboard.
export function dressFleetWheel(meshes: MeshFactory, wheel: TransformNode, side: number, radius: number, tireDepth: number) {
  const { segments, rings, lug } = fleetWheel
  const diameter = radius * diameterPerRadius
  const face = tireDepth * half
  function ring(offset: number, outer: number, inner: number, depth: number, color: string) {
    meshes.cylinder(side * offset, 0, 0, outer, inner, depth, segments, color, wheel).rotation.z = -side * quarterTurn
  }
  ring(0, diameter, diameter, tireDepth, fleetPaint.rubber)
  for (const [name, { standoff, outer, inner, depth }] of Object.entries(rings)) {
    ring(face + standoff * radius, outer * diameter, inner * diameter, depth * radius, ringPaint[name as keyof typeof rings])
  }
  const boltCircle = lug.boltCircle * radius
  const lugX = side * (face + lug.standoff * radius)
  const [width, height, depth] = lug.size.map((ratio) => ratio * radius)
  for (let i = 0; i < lug.count; i++) {
    const angle = i * fullTurn / lug.count
    meshes.box(lugX, boltCircle * Math.cos(angle), boltCircle * Math.sin(angle), width, height, depth, fleetPaint.brightTrim, wheel)
  }
}

// Combine rigid details by finish while their local pivot is still at the
// origin. Each moving node (a wheel, a door) is batched on its own. Meshes in
// `keep`, such as lamps that swap materials, stay separate.
export function batchRigidParts(meshes: MeshFactory, parent: TransformNode, keep: ReadonlySet<Mesh> = new Set()) {
  const groups = new Map<Material, Mesh[]>()
  for (const mesh of parent.getChildMeshes(true)) {
    if (!(mesh instanceof Mesh) || !mesh.material || keep.has(mesh)) continue
    const group = groups.get(mesh.material) ?? []
    group.push(mesh)
    groups.set(mesh.material, group)
  }
  const casters = meshes.shadows.getShadowMap()?.renderList ?? []
  for (const group of groups.values()) {
    if (group.length < minBatchParts) continue
    // Parts built without shadows, such as deck seams, stay that way once merged.
    const casts = group.some((mesh) => casters.includes(mesh))
    for (const mesh of group) {
      mesh.parent = null
      meshes.shadows.removeShadowCaster(mesh, false)
    }
    const batch = Mesh.MergeMeshes(group, true, true)!
    batch.parent = parent
    batch.receiveShadows = true
    if (casts) meshes.shadows.addShadowCaster(batch, false)
  }
}

type LampPart = { x: number, y: number, z: number, size: readonly [number, number, number] }
type Lamp = { mesh: Mesh, unlit: Material, lit: Material, braking?: Material }
const lampLitThreshold = 0.04

// Head and tail lamps on both sides that swap to emissive paint when lit. Tail
// lamps brighten further while braking. Their meshes stay out of batching.
export function vehicleLamps(meshes: MeshFactory, root: TransformNode, head: LampPart, tail: LampPart) {
  const lamps: Lamp[] = []
  const headPaint = meshes.paint(fleetPaint.headlamp), tailPaint = meshes.paint(fleetPaint.tailRed)
  for (const side of [-1, 1]) {
    lamps.push(
      { mesh: meshes.box(side * head.x, head.y, head.z, ...head.size, headPaint, root), unlit: headPaint, lit: meshes.paint(fleetLampGlow.head, true) },
      {
        mesh: meshes.box(side * tail.x, tail.y, tail.z, ...tail.size, tailPaint, root),
        unlit: tailPaint,
        lit: meshes.paint(fleetLampGlow.tail, true),
        braking: meshes.paint(fleetLampGlow.braking, true),
      },
    )
  }
  return {
    meshes: new Set(lamps.map(({ mesh }) => mesh)),
    set: (strength: number, braking = false) => {
      const lit = strength > lampLitThreshold
      for (const lamp of lamps) lamp.mesh.material = braking && lamp.braking ? lamp.braking : lit ? lamp.lit : lamp.unlit
    },
  }
}

interface VehicleWheel {
  axle: TransformNode
  spin: TransformNode
  steering: boolean
  // A drawn wheel smaller than the physics wheel sits lower and spins faster.
  drop: number
  spinScale: number
}

// Hang a steering pivot and a spin node at a wheel position.
export function mountVehicleWheel(meshes: MeshFactory, root: TransformNode, x: number, y: number, z: number, steering: boolean, physicsRadius = y): VehicleWheel {
  const axle = new TransformNode('Wheel steering', meshes.scene)
  axle.parent = root
  axle.position.set(x, y, z)
  const spin = new TransformNode('Wheel spin', meshes.scene)
  spin.parent = axle
  return { axle, spin, steering, drop: physicsRadius - y, spinScale: physicsRadius / y }
}

// `suspension` holds each physics wheel's centre height in wheel order.
export function poseVehicleWheels(wheels: readonly VehicleWheel[], rotation: number, steering: number, restHeight: number, suspension?: readonly number[], blend = 1) {
  for (const [index, wheel] of wheels.entries()) {
    wheel.spin.rotation.x = rotation * wheel.spinScale
    wheel.axle.rotation.y = wheel.steering ? steering : 0
    const target = (suspension?.[index] ?? restHeight) - wheel.drop
    wheel.axle.position.y += (target - wheel.axle.position.y) * blend
  }
}
