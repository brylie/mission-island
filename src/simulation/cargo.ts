import { starterSolids } from '../worlds/starter/colliders.ts'
import { Body, Box, Heightfield, SAPBroadphase, Sphere, Vec3, World } from 'cannon-es'
import type { Input, Item, Snapshot } from '../protocol.ts'
import { barrierSolids, deckSolids, deckTop, ferryServiceRestored } from '../ferry-repair.ts'
import { gateBlockers } from '../gate-repair.ts'
import { buildings, chestSize, crateSize, crateStarts, crewHomes, dockEndZ, harborDock, truckBed } from '../world.ts'
import type { Point, Pose } from '../world.ts'
import { barrowSolids } from '../barrow.ts'
import { truckPoint, truckSurface } from '../truck-pose.ts'
import type { Truck, TruckPose } from '../truck-pose.ts'
import { islandRocks, islandTrees, northernProps, treeTrunkRadius } from '../scenery.ts'
import { coastBounds, groundHeight, maxWadeDepth, shoreProfile, walkingHeight, waterDepth, waterLevel } from '../terrain.ts'
import { createTruckPhysics } from './truck.ts'

// The garden gate leaf moves with host state, so crates meet it where players see it.
function gateLeafBody(world: World) {
  const [leaf] = gateBlockers({ gate: { open: false, closePending: false }, gateRepair: { stage: 'sagging', pinHolder: null } })
  const body = new Body({ position: new Vec3(leaf.x, (leaf.top + leaf.floor) / 2, leaf.z),
    shape: new Box(new Vec3(leaf.halfWidth, (leaf.top - leaf.floor) / 2, leaf.halfDepth)) })
  world.addBody(body)
  return (state: Pick<Snapshot, 'gate' | 'gateRepair'>) => {
    const [solid] = gateBlockers(state)
    body.position.set(solid.x, (solid.top + solid.floor) / 2, solid.z)
    body.quaternion.setFromEuler(0, solid.heading, 0)
    body.aabbNeedsUpdate = true
  }
}

type Solid = typeof starterSolids[number]

function solidBody(solid: Solid) {
  const body = new Body({
    position: new Vec3(solid.x, (solid.top + solid.floor) / 2, solid.z),
    shape: new Box(new Vec3(solid.halfWidth, (solid.top - solid.floor) / 2, solid.halfDepth)),
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
    body.addShape(new Box(new Vec3(halfWidth, height / 2, halfDepth)), new Vec3(0, height / 2, z))
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

export function createCargoPhysics() {
  const world = new World({ gravity: new Vec3(0, -9.82, 0) })
  world.broadphase = new SAPBroadphase(world)
  world.defaultContactMaterial.friction = 0.4
  world.defaultContactMaterial.restitution = 0.14

  // Cover the whole island, including the wading shelf and a margin for falling cargo.
  const outerRadius = shoreProfile[shoreProfile.length - 1].radius
  const coast = coastBounds(outerRadius)
  const west = Math.floor(coast.west) - 2
  const east = Math.ceil(coast.east) + 2
  const north = Math.ceil(coast.north) + 2
  const south = Math.floor(coast.south) - 2
  const heights = Array.from({ length: east - west + 1 }, (_, i) =>
    Array.from({ length: north - south + 1 }, (_, j) => groundHeight({ x: west + i, z: north - j })))
  const ground = new Body({ position: new Vec3(west, 0, north), shape: new Heightfield(heights, { elementSize: 1 }) })
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
  world.addBody(ground)
  for (const solid of starterSolids) world.addBody(solidBody(solid))
  for (const building of buildings) {
    world.addBody(new Body({
      position: new Vec3(building.x, building.h / 2, building.z),
      shape: new Box(new Vec3(building.w / 2, building.h / 2, building.d / 2)),
    }))
  }
  for (const { chest } of crewHomes) {
    world.addBody(new Body({
      position: new Vec3(chest.x, groundHeight(chest) + chestSize.height / 2, chest.z),
      shape: new Box(new Vec3(chestSize.width / 2, chestSize.height / 2, chestSize.depth / 2)),
    }))
  }
  world.addBody(new Body({
    position: new Vec3(harborDock.x, harborDock.top - 0.1, (harborDock.firstZ + dockEndZ) / 2),
    shape: new Box(new Vec3(harborDock.width / 2, 0.1, (harborDock.firstZ - dockEndZ + harborDock.plankDepth) / 2)),
  }))

  for (const tree of islandTrees) {
    const halfHeight = tree.height / 4
    world.addBody(new Body({
      position: new Vec3(tree.x, groundHeight(tree) + halfHeight, tree.z),
      shape: new Box(new Vec3(treeTrunkRadius, halfHeight, treeTrunkRadius)),
    }))
  }
  for (const rock of islandRocks) {
    world.addBody(new Body({
      position: new Vec3(rock.x, rock.ground + rock.size * 0.12, rock.z),
      shape: new Sphere(rock.size * 0.43),
    }))
  }
  for (const { x, y, z, size, angle, tree } of northernProps) {
    const body = new Body({
      position: new Vec3(x, y + size * (tree ? 1 : 0.27), z),
      shape: new Box(tree ? new Vec3(0.12, size, 0.13) : new Vec3(size * 0.84, size * 0.4, size * 0.62)),
    })
    if (!tree) body.quaternion.setFromEuler(0, angle, 0)
    world.addBody(body)
  }

  const ferry = ferryBodies(world)
  // The flatbed's shore check reads the restored deck as solid ground, so it can drive out to the berth.
  const truck = createTruckPhysics(world, (point) => ferry.isOpen() ? Math.max(groundHeight(point), deckTop(point)) : groundHeight(point))

  const half = crateSize / 2
  const crates = crateStarts.map(() => new Body({
    mass: 5,
    shape: new Box(new Vec3(half, half, half)),
    linearDamping: 0.14,
    angularDamping: 0.24,
  }))

  function remove(item: Item) {
    if (item.kind !== 'crate') return
    const body = crates[item.id]
    if (body.world) world.removeBody(body)
    item.onBed = false
  }

  function release(item: Item, point: Point, y = groundHeight(point) + half + 0.025, onBed = false) {
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
    const speed = 2.2 + power * 6.4
    body.velocity.set(Math.sin(item.heading) * speed, 3.4 + power * 1.1, Math.cos(item.heading) * speed)
    body.angularVelocity.set(0.16, 0.32 + power * 0.52, 0.18)
  }

  function load(item: Item, pose: TruckPose, slot: number) {
    const point = truckPoint(pose, 0, truckBed.top + half + 0.035, slot)
    item.heading = pose.heading
    release(item, point, point.y, true)
    const body = crates[item.id]
    body.quaternion.setFromEuler(pose.pitch, pose.heading, pose.roll, 'YXZ')
    const { x, y, z, w } = body.quaternion
    item.rotation = { x, y, z, w }
    truck.matchBedMotion(body)
  }

  function restore(item: Item) {
    if (item.kind !== 'crate' || item.holder !== null || item.delivered) return
    const rotation = item.rotation
    release(item, item, item.y, item.onBed)
    if (rotation) {
      crates[item.id].quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
      item.rotation = rotation
    }
  }

  function step(items: Item[], before: Truck, input: Input, dt: number) {
    truck.applyInput(input, dt)
    world.step(dt / 2)
    world.step(dt / 2)
    const after = truck.finishStep(before)

    for (const item of items) {
      if (item.kind !== 'crate' || item.holder !== null || item.delivered) continue
      const { position, quaternion, velocity } = crates[item.id]
      if ((waterDepth(position) > maxWadeDepth && position.y < waterLevel) || position.y < -4) {
        release(item, crateStarts[item.id])
        continue
      }
      const relative = truckSurface(after, position, truckBed.top)
      const bedClearance = position.y - relative.y
      const onBed = bedClearance > 0.22 && bedClearance < 0.76 &&
        Math.abs(velocity.y - (after.y - before.y) / dt) < 1.9 &&
        Math.abs(relative.x) < truckBed.width / 2 + 0.24 &&
        Math.abs(relative.z - truckBed.center) < truckBed.length / 2 + 0.22
      const { x, y, z, w } = quaternion
      Object.assign(item, position, { onBed, rotation: { x, y, z, w } })
    }
    return after
  }

  return { release, launch, load, remove, restore, step, placeBarrow: barrowBody(world), placeGateLeaf: gateLeafBody(world),
    placeFerry: ferry.place, parkTruck: truck.park }
}
