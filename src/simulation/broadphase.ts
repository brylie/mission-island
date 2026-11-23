import { ArrayCollisionMatrix, Body, SAPBroadphase, type World } from 'cannon-es'

// The island world holds hundreds of static colliders and only a handful of moving bodies.
// cannon-es pays for that mix twice on every substep, each time in proportion to bodies squared.
// The two classes below remove that cost without changing which pairs reach the narrowphase or their order.
// They lean on cannon-es 0.20 internals; test/broadphase.test.mjs compares them with the stock step, so rerun it after an upgrade.

// A static or sleeping body can only collide with a body that is neither.
function settled(body: Body) {
  return (body.type & Body.STATIC) !== 0 || body.sleepState === Body.SLEEPING
}

// Sweep and prune that skips settled–settled pairs without scanning them.
// The stock sweep tests the pair filter before the axis bound, so a run of static bodies never ends the scan early.
// Here a settled body only scans the moving bodies after it in the sorted list.
// Each pair it tests, and the order of those tests, match the stock loop.
export class SettledSweepBroadphase extends SAPBroadphase {
  private readonly moving: number[] = []

  override collisionPairs(_world: World, p1: Body[], p2: Body[]) {
    const bodies = this.axisList
    if (this.dirty) {
      this.sortList()
      this.dirty = false
    }
    const moving = this.moving
    moving.length = 0
    for (let i = 0; i < bodies.length; i++) if (!settled(bodies[i])) moving.push(i)
    let next = 0
    for (let i = 0; i < bodies.length; i++) {
      while (next < moving.length && moving[next] <= i) next++
      if (settled(bodies[i])) this.sweepMoving(i, next, p1, p2)
      else this.sweepAll(i, p1, p2)
    }
  }

  private sweepAll(i: number, p1: Body[], p2: Body[]) {
    const bodies = this.axisList, bi = bodies[i]
    for (let j = i + 1; j < bodies.length; j++) {
      const bj = bodies[j]
      if (!this.needBroadphaseCollision(bi, bj)) continue
      if (!SAPBroadphase.checkBounds(bi, bj, this.axisIndex)) break
      this.intersectionTest(bi, bj, p1, p2)
    }
  }

  private sweepMoving(i: number, from: number, p1: Body[], p2: Body[]) {
    const bodies = this.axisList, bi = bodies[i], moving = this.moving
    for (let k = from; k < moving.length; k++) {
      const bj = bodies[moving[k]]
      if (!this.needBroadphaseCollision(bi, bj)) continue
      if (!SAPBroadphase.checkBounds(bi, bj, this.axisIndex)) break
      this.intersectionTest(bi, bj, p1, p2)
    }
  }
}

// Contact memory that stores only the pairs touching this step.
// The stock matrix keeps one slot per possible pair and zeroes every slot on every substep.
// Pairs use the stock slot for their body indices, and removing a body forgets the same slots,
// so first-contact (`collide`) events fire exactly as before.
export class SparseCollisionMatrix extends ArrayCollisionMatrix {
  private readonly touching = new Set<number>()

  private static key(bi: Body, bj: Body) {
    const [low, high] = bi.index < bj.index ? [bi.index, bj.index] : [bj.index, bi.index]
    return ((high * (high + 1)) >> 1) + low - 1
  }

  override get(bi: Body, bj: Body) {
    return this.touching.has(SparseCollisionMatrix.key(bi, bj)) ? 1 : 0
  }

  override set(bi: Body, bj: Body, value: boolean) {
    if (value) this.touching.add(SparseCollisionMatrix.key(bi, bj))
    else this.touching.delete(SparseCollisionMatrix.key(bi, bj))
  }

  override reset() {
    this.touching.clear()
  }

  // The stock matrix truncates to n(n-1)/2 slots, which drops the contacts of the highest indices.
  override setNumObjects(n: number) {
    const slots = (n * (n - 1)) >> 1
    for (const key of this.touching) if (key >= slots) this.touching.delete(key)
  }
}

export function useSparseCollisions(world: World) {
  world.broadphase = new SettledSweepBroadphase(world)
  world.collisionMatrix = new SparseCollisionMatrix()
  world.collisionMatrixPrevious = new SparseCollisionMatrix()
}
