import { starterSolids } from '../worlds/starter/colliders.ts'
import { Body, Box, Heightfield, SAPBroadphase, Sphere, Vec3, World } from 'cannon-es'
import { islandRockGeometry, islandTreeGeometry, northernRockGeometry, northernTreeGeometry } from '../assets/geometry/starter-scenery.ts'
import type { Input, Item, Snapshot } from '../protocol.ts'
import { barrierSolids, deckSolids, deckTop, ferryServiceRestored } from '../ferry-repair.ts'
import { gateBlockers } from '../gate-repair.ts'
import { buildings, chestSize, crateSize, crateStarts, crewHomes, dockEndZ, harborDock, truckBed } from '../world.ts'
import type { Point, Pose } from '../world.ts'
import { barrowSolids } from '../barrow.ts'
import { truckPoint, truckSurface } from '../truck-pose.ts'
import type { Truck, TruckPose } from '../truck-pose.ts'
import { islandRocks, islandTrees, northernProps } from '../scenery.ts'
import { coastBounds, groundHeight, maxWadeDepth, shoreProfile, walkingHeight, waterDepth, waterLevel } from '../terrain.ts'
import { createTruckPhysics } from './truck.ts'
import { watchCrateImpacts } from './cargo-impacts.ts'

const half = 0.5
const heightfieldMarginMetres = 2

const cargoGravity = -9.82
const contactFriction = 0.4
const contactRestitution = 0.14
const cargoSubsteps = 2

const crateMass = 5
const crateLinearDamping = 0.14
const crateAngularDamping = 0.24
const releaseClearance = 0.025
const loadClearance = 0.035
const cargoRecoveryDepth = -4

const throwBaseSpeed = 2.2
const throwSpeedGain = 6.4
const throwBaseLift = 3.4
const throwLiftGain = 1.1
const throwPitchSpin = 0.16
const throwBaseYawSpin = 0.32
const throwYawSpinGain = 0.52
const throwRollSpin = 0.18

const bedMinClearance = 0.22
const bedMaxClearance = 0.76
const bedMaxRelativeVerticalSpeed = 1.9
const bedSideOverhang = 0.24
const bedEndOverhang = 0.22

// The garden gate leaf moves with host state, so crates meet it where players see it.
function gateLeafBody(world: World) {
  const [leaf] = gateBlockers({ gate: { open: false, closePending: false }, gateRepair: { stage: 'sagging', pinHolder: null } })
  const body = new Body({ position: new Vec3(leaf.x, (leaf.top + leaf.floor) * half, leaf.z), shape: new Box(new Vec3(leaf.halfWidth, (leaf.top - leaf.floor) * half, leaf.halfDepth)) })
  world.addBody(body)
  return (state: Pick<Snapshot, 'gate' | 'gateRepair'>) => {
    const [solid] = gateBlockers(state)
    body.position.set(solid.x, (solid.top + solid.floor) * half, solid.z)
    body.quaternion.setFromEuler(0, solid.heading, 0)
    body.aabbNeedsUpdate = true
  }
}

type Solid = typeof starterSolids[number]

function solidBody(solid: Solid) {
  const body = new Body({
    position: new Vec3(solid.x, (solid.top + solid.floor) * half, solid.z),
    shape: new Box(new Vec3(solid.halfWidth, (solid.top - solid.floor) * half, solid.halfDepth)),
  })
  body.quaternion.setFromEuler(0, solid.heading, 0)
  return body
}

// The ferry barrier closes the lane until the repair is finished. Then the barrier comes out and the deck goes in.
function ferryBodies(world: World) {
  const barrier = barrierSolids.map(solidBody)
  const deck = deckSolids.map(solidBody)
  let open: boolean | undefined
  const place = (state: Pick<Snapshot, 'ferryRepair'>) => {
    const restored = ferryServiceRestored(state)
    if (restored === open) return
    open = restored
    for (const body of restored ? barrier : deck) if (body.world) world.removeBody(body)
    for (const body of restored ? deck : barrier) world.addBody(body)
  }
  return { isOpen: () => open === true, place }
}

function barrowBody(world: World) {
  const body = new Body({ type: Body.KINEMATIC })
  for (const { halfWidth, halfDepth, height, z } of barrowSolids) {
    const halfHeight = height * half
    body.addShape(new Box(new Vec3(halfWidth, halfHeight, halfDepth)), new Vec3(0, halfHeight, z))
  }
  return (cart: Pose | null) => {
    if (!cart) {
      if (body.world) world.removeBody(body)
      return
    }
    body.position.set(cart.x, walkingHeight(cart), cart.z)
    body.quaternion.setFromEuler(0, cart.heading, 0)
    body.aabbNeedsUpdate = true
    if (!body.world) world.addBody(body)
  }
}

// Terrain and every fixed collider cargo can strike or rest on.
function addIslandColliders(world: World) {
  // Cover the whole island, including the wading shelf and a margin for falling cargo.
  const outerRadius = shoreProfile[shoreProfile.length - 1].radius
  const coast = coastBounds(outerRadius)
  const west = Math.floor(coast.west) - heightfieldMarginMetres
  const east = Math.ceil(coast.east) + heightfieldMarginMetres
  const north = Math.ceil(coast.north) + heightfieldMarginMetres
  const south = Math.floor(coast.south) - heightfieldMarginMetres
  const heights = Array.from({ length: east - west + 1 }, (_, i) =>
    Array.from({ length: north - south + 1 }, (_, j) => groundHeight({ x: west + i, z: north - j })))
  const ground = new Body({ position: new Vec3(west, 0, north), shape: new Heightfield(heights, { elementSize: 1 }) })
  ground.quaternion.setFromEuler(-Math.PI * half, 0, 0)
  world.addBody(ground)
  for (const solid of starterSolids) world.addBody(solidBody(solid))
  for (const building of buildings) {
    world.addBody(new Body({
      position: new Vec3(building.x, building.h * half, building.z),
      shape: new Box(new Vec3(building.w * half, building.h * half, building.d * half)),
    }))
  }
  for (const { chest } of crewHomes) {
    world.addBody(new Body({
      position: new Vec3(chest.x, groundHeight(chest) + chestSize.height * half, chest.z),
      shape: new Box(new Vec3(chestSize.width * half, chestSize.height * half, chestSize.depth * half)),
    }))
  }
  const plankHalfThickness = harborDock.plankThickness * half
  world.addBody(new Body({
    position: new Vec3(harborDock.x, harborDock.top - plankHalfThickness, (harborDock.firstZ + dockEndZ) * half),
    shape: new Box(new Vec3(harborDock.width * half, plankHalfThickness, (harborDock.firstZ - dockEndZ + harborDock.plankDepth) * half)),
  }))

  for (const tree of islandTrees) {
    const halfHeight = tree.height * islandTreeGeometry.trunkHeightRatio * half
    world.addBody(new Body({
      position: new Vec3(tree.x, groundHeight(tree) + halfHeight, tree.z),
      shape: new Box(new Vec3(islandTreeGeometry.trunkRadius, halfHeight, islandTreeGeometry.trunkRadius)),
    }))
  }
  for (const rock of islandRocks) {
    world.addBody(new Body({
      position: new Vec3(rock.x, rock.ground + rock.size * islandRockGeometry.centerHeightRatio, rock.z),
      shape: new Sphere(rock.size * islandRockGeometry.cargoRadiusRatio),
    }))
  }
  for (const { x, y, z, size, angle, tree } of northernProps) {
    const { cargoHalfWidth, cargoHalfDepth, trunkHeightRatio } = northernTreeGeometry
    const { centerHeightRatio, cargoHalfExtents } = northernRockGeometry
    const trunkHalfHeight = size * trunkHeightRatio * half
    const body = new Body({
      position: new Vec3(x, y + (tree ? trunkHalfHeight : size * centerHeightRatio), z),
      shape: new Box(tree
        ? new Vec3(cargoHalfWidth, trunkHalfHeight, cargoHalfDepth)
        : new Vec3(size * cargoHalfExtents.widthRatio, size * cargoHalfExtents.heightRatio, size * cargoHalfExtents.depthRatio)),
    })
    if (!tree) body.quaternion.setFromEuler(0, angle, 0)
    world.addBody(body)
  }
}

export function createCargoPhysics() {
  const world = new World({ gravity: new Vec3(0, cargoGravity, 0) })
  world.broadphase = new SAPBroadphase(world)
  world.defaultContactMaterial.friction = contactFriction
  world.defaultContactMaterial.restitution = contactRestitution

  addIslandColliders(world)

  const ferry = ferryBodies(world)
  // The flatbed's shore check reads the restored deck as solid ground, so it can drive out to the berth.
  const truck = createTruckPhysics(world, (point) => ferry.isOpen() ? Math.max(groundHeight(point), deckTop(point)) : groundHeight(point))

  const crateHalfSize = crateSize * half
  const crates = crateStarts.map(() => new Body({
    mass: crateMass,
    shape: new Box(new Vec3(crateHalfSize, crateHalfSize, crateHalfSize)),
    linearDamping: crateLinearDamping,
    angularDamping: crateAngularDamping,
  }))
  const impacts = watchCrateImpacts(world, crates, truck.body, truck.bedShape)

  function remove(item: Item) {
    if (item.kind !== 'crate') return
    const body = crates[item.id]
    if (body.world) world.removeBody(body)
    item.onBed = false
  }

  function release(item: Item, point: Point, y = groundHeight(point) + crateHalfSize + releaseClearance, onBed = false) {
    if (item.kind !== 'crate') return
    const body = crates[item.id]
    body.position.set(point.x, y, point.z)
    body.quaternion.setFromEuler(0, item.heading, 0)
    body.velocity.setZero()
    body.angularVelocity.setZero()
    body.force.setZero()
    body.torque.setZero()
    body.aabbNeedsUpdate = true
    if (!body.world) world.addBody(body)
    Object.assign(item, { x: point.x, z: point.z, y, rotation: null, onBed })
  }

  function launch(item: Item, point: Point, y: number, power: number) {
    release(item, point, y)
    const body = crates[item.id]
    const speed = throwBaseSpeed + power * throwSpeedGain
    const lift = throwBaseLift + power * throwLiftGain
    const yawSpin = throwBaseYawSpin + power * throwYawSpinGain
    body.velocity.set(Math.sin(item.heading) * speed, lift, Math.cos(item.heading) * speed)
    body.angularVelocity.set(throwPitchSpin, yawSpin, throwRollSpin)
  }

  function load(item: Item, pose: TruckPose, slot: number) {
    const point = truckPoint(pose, 0, truckBed.top + crateHalfSize + loadClearance, slot)
    item.heading = pose.heading
    release(item, point, point.y, true)
    const body = crates[item.id]
    body.quaternion.setFromEuler(pose.pitch, pose.heading, pose.roll, 'YXZ')
    const { x, y, z, w } = body.quaternion
    item.rotation = { x, y, z, w }
    truck.matchBedMotion(body)
  }

  // Places a crate where the host stages it, such as an order's pickup point. Settling there is not an impact.
  function relocate(item: Item, point: Point) {
    release(item, point)
    if (item.kind === 'crate') impacts.quiet(item.id)
  }

  function restore(item: Item) {
    if (item.kind !== 'crate' || item.holder !== null || item.delivered) return
    const rotation = item.rotation
    release(item, item, item.y, item.onBed)
    if (rotation) {
      crates[item.id].quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
      item.rotation = rotation
    }
    impacts.quiet(item.id)
  }

  function step(items: Item[], before: Truck, input: Input, dt: number) {
    truck.applyInput(input, dt)
    const substep = dt / cargoSubsteps
    for (let step = 0; step < cargoSubsteps; step++) world.step(substep)
    const after = truck.finishStep(before)

    for (const item of items) {
      if (item.kind !== 'crate' || item.holder !== null || item.delivered) continue
      const { position, quaternion, velocity } = crates[item.id]
      if ((waterDepth(position) > maxWadeDepth && position.y < waterLevel) || position.y < cargoRecoveryDepth) {
        release(item, crateStarts[item.id])
        impacts.quiet(item.id)
        continue
      }
      const relative = truckSurface(after, position, truckBed.top)
      const bedClearance = position.y - relative.y
      const onBed = bedClearance > bedMinClearance && bedClearance < bedMaxClearance
        && Math.abs(velocity.y - (after.y - before.y) / dt) < bedMaxRelativeVerticalSpeed
        && Math.abs(relative.x) < truckBed.width * half + bedSideOverhang
        && Math.abs(relative.z - truckBed.center) < truckBed.length * half + bedEndOverhang
      const { x, y, z, w } = quaternion
      Object.assign(item, position, { onBed, rotation: { x, y, z, w } })
    }
    return after
  }

  return { release, relocate, launch, load, remove, restore, step, drainImpacts: () => impacts.drain(world.time), placeBarrow: barrowBody(world), placeGateLeaf: gateLeafBody(world), placeFerry: ferry.place, parkTruck: truck.park }
}
