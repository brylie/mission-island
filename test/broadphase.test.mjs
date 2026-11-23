import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Body, Box, Sphere, Vec3, World, SAPBroadphase } from 'cannon-es'
import { SettledSweepBroadphase, SparseCollisionMatrix, useSparseCollisions } from '../src/simulation/broadphase.ts'

// A field of static colliders under a few moving bodies, like the island around its cargo.
function scene(sparse) {
  const world = new World({ gravity: new Vec3(0, -9.82, 0) })
  world.allowSleep = true
  if (sparse) useSparseCollisions(world)
  else world.broadphase = new SAPBroadphase(world)
  world.addBody(new Body({ position: new Vec3(0, -0.5, 0), shape: new Box(new Vec3(40, 0.5, 40)) }))
  for (let x = -18; x <= 18; x += 2) {
    for (let z = -18; z <= 18; z += 3) {
      world.addBody(new Body({ position: new Vec3(x, 0.6, z), shape: new Box(new Vec3(0.3, 0.6, 0.3)) }))
    }
  }
  const moving = []
  for (let i = 0; i < 8; i++) {
    const body = new Body({
      mass: 5,
      position: new Vec3(-16 + i * 4.1, 2 + i * 0.3, -15 + i * 3.7),
      shape: i % 2 ? new Sphere(0.4) : new Box(new Vec3(0.35, 0.35, 0.35)),
      velocity: new Vec3(i % 3 - 1, 0, 2 - i % 4),
    })
    world.addBody(body)
    moving.push(body)
  }
  // A body that only meets bodies in the second collision group.
  world.addBody(new Body({ mass: 3, position: new Vec3(4, 1.5, 4), shape: new Sphere(0.4), collisionFilterGroup: 2, collisionFilterMask: 2 }))
  const sweeper = new Body({ type: Body.KINEMATIC, position: new Vec3(-20, 0.5, 0), shape: new Box(new Vec3(0.5, 0.5, 3)), velocity: new Vec3(3, 0, 0) })
  world.addBody(sweeper)
  return { world, moving }
}

function record(world) {
  const pairs = [], contacts = []
  const stock = world.broadphase.collisionPairs.bind(world.broadphase)
  world.broadphase.collisionPairs = (w, p1, p2) => {
    stock(w, p1, p2)
    pairs.push(p1.map((body, i) => `${body.index}:${p2[i].index}`).join(' '))
  }
  for (const body of world.bodies) body.addEventListener('collide', ({ body: other }) => contacts.push(`${body.index}>${other.index}`))
  return { pairs, contacts }
}

function run(sparse) {
  const { world, moving } = scene(sparse)
  const log = record(world)
  const poses = []
  for (let step = 0; step < 900; step++) {
    if (step === 300) world.removeBody(moving[2])
    if (step === 450) world.addBody(new Body({ mass: 2, position: new Vec3(1, 3, 1), shape: new Sphere(0.5) }))
    if (step === 600) moving[0].applyImpulse(new Vec3(8, 6, 0))
    // Removing the highest-index body while it rests forgets its contacts, so its return is a first contact again.
    const last = world.bodies.at(-1)
    if (step === 700) world.removeBody(last)
    if (step === 701) world.addBody(last)
    if (step === 800) world.removeBody(last)
    if (step === 801) world.addBody(new Body({ mass: 2, position: new Vec3(-2, 0.5, -2), shape: new Sphere(0.5) }))
    world.step(1 / 60)
    poses.push(world.bodies.filter((body) => body.type !== Body.STATIC).map(({ position: p, quaternion: q }) => [p.x, p.y, p.z, q.x, q.y, q.z, q.w]))
  }
  return { ...log, poses, sleeping: world.bodies.filter((body) => body.sleepState === Body.SLEEPING).length }
}

test('the settled sweep and sparse contacts reproduce the stock physics step for step', () => {
  const stock = run(false), sparse = run(true)
  assert.ok(stock.sleeping > 0, 'the scene lets some moving bodies fall asleep')
  assert.ok(stock.contacts.length > 0, 'the scene produces first-contact events')
  assert.deepEqual(sparse.pairs, stock.pairs)
  assert.deepEqual(sparse.contacts, stock.contacts)
  assert.deepEqual(sparse.poses, stock.poses)
})

test('the settled sweep skips static pairs that the stock sweep scans', () => {
  for (const Broadphase of [SAPBroadphase, SettledSweepBroadphase]) {
    const { world } = scene(false)
    world.broadphase = new Broadphase(world)
    let checks = 0
    const filter = world.broadphase.needBroadphaseCollision.bind(world.broadphase)
    world.broadphase.needBroadphaseCollision = (a, b) => {
      checks++
      return filter(a, b)
    }
    world.step(1 / 60)
    if (Broadphase === SAPBroadphase) assert.ok(checks > 5000, `stock sweep checked ${checks} pairs`)
    else assert.ok(checks < 1000, `settled sweep checked ${checks} pairs`)
  }
})

test('sparse contact memory forgets every pair on reset', () => {
  const matrix = new SparseCollisionMatrix()
  const a = new Body(), b = new Body(), c = new Body()
  a.index = 0
  b.index = 5
  c.index = 9
  matrix.setNumObjects(10)
  matrix.set(b, a, true)
  assert.equal(matrix.get(a, b), 1)
  assert.equal(matrix.get(a, c), 0)
  matrix.set(a, b, false)
  assert.equal(matrix.get(b, a), 0)
  matrix.set(c, b, true)
  matrix.reset()
  assert.equal(matrix.get(b, c), 0)
})
