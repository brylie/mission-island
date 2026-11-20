import { distance, offset, type Point } from './world.ts'

type HabitatPatch = Point & { kind: string; angle: number }
const maxStep = .66 // metres
const clearingRadius = 7.85

export function habitatObstacles(patches: readonly HabitatPatch[]) {
  return patches.flatMap(p => {
    const pose = { x: p.x, z: p.z, heading: p.angle }
    if (p.kind === 'logs') return [{ ...pose, kind: p.kind, width: 2.4, depth: .52, height: .46 }]
    if (p.kind === 'trees') return [{ ...pose, kind: p.kind, width: .53, depth: .53, height: (2.7 + p.angle * .24) / 2 }]
    if (p.kind === 'stones') {
      const size = .8 + .13 * p.angle
      return [{ ...pose, kind: p.kind, width: size, depth: size * 1.1, height: size * .51 }]
    }
    return []
  })
}

export function habitatNavigation(patches: readonly HabitatPatch[]) {
  const obstacles = habitatObstacles(patches).map(o => ({
    ...o, cos: Math.cos(o.heading), sin: Math.sin(o.heading), low: o.height <= maxStep,
    halfX: o.width / 2 + .15, halfZ: o.depth / 2 + .15,
  }))

  type Obstacle = typeof obstacles[number]
  function local(p: Point, o: Obstacle) {
    const dx = p.x - o.x, dz = p.z - o.z
    return { x: dx * o.cos - dz * o.sin, z: dx * o.sin + dz * o.cos }
  }

  // Clip the segment against the animal-sized footprint in the prop's local axes.
  function crosses(from: Point, to: Point, o: Obstacle, length: number) {
    const a = local(from, o), b = local(to, o)
    let enter = 0, exit = 1
    for (const [start, end, half] of [[a.x, b.x, o.halfX], [a.z, b.z, o.halfZ]]) {
      const delta = end - start
      if (Math.abs(delta) < 1e-8) {
        if (Math.abs(start) >= half) return false
      } else {
        const first = (-half - start) / delta, last = (half - start) / delta
        enter = Math.max(enter, Math.min(first, last))
        exit = Math.min(exit, Math.max(first, last))
        if (enter >= exit) return false
      }
    }
    // An overlapping spawn in an edited recipe can still walk out.
    if (enter === 0 && exit < 1) return false
    return !o.low || (o.kind === 'logs' && (exit - enter) * length > 1.45)
  }

  function clear(from: Point, to: Point) {
    if (Math.hypot(to.x, to.z) > clearingRadius) return false
    const length = distance(from, to)
    return !obstacles.some(o => crosses(from, to, o, length))
  }

  function open(p: Point) {
    return Math.hypot(p.x, p.z) <= clearingRadius && !obstacles.some(o => {
      const q = local(p, o)
      return !o.low && Math.abs(q.x) < o.halfX && Math.abs(q.z) < o.halfZ
    })
  }
  const corners = obstacles.filter(o => !o.low || o.kind === 'logs').flatMap(o =>
    [-1, 1].flatMap(x => [-1, 1].map(z => offset(o, x * (o.halfX + .08), z * (o.halfZ + .08)))))
    .filter(open)
  let edges: { to: number; cost: number }[][] | undefined

  function waypoint(from: Point, goal: Point): Point | undefined {
    if (clear(from, goal)) return goal
    if (!open(goal)) return
    // Build once per layout, only if an animal actually needs a detour.
    edges ??= corners.map((p, i) => corners.flatMap((q, j) =>
      i !== j && clear(p, q) ? [{ to: j, cost: distance(p, q) }] : []))
    const cost = corners.map(p => distance(from, p) > .02 && clear(from, p) ? distance(from, p) : Infinity)
    const first = corners.map((_, i) => i)
    const visited = new Set<number>()
    while (true) {
      let best = Infinity, next = -1
      for (let i = 0; i < corners.length; i++) {
        const estimate = cost[i] + distance(corners[i], goal)
        if (!visited.has(i) && estimate < best) { next = i; best = estimate }
      }
      if (next < 0) return
      if (clear(corners[next], goal)) return corners[first[next]]
      visited.add(next)
      for (const edge of edges[next]) {
        const via = cost[next] + edge.cost
        if (via < cost[edge.to]) { cost[edge.to] = via; first[edge.to] = first[next] }
      }
    }
  }

  // Feet rise as they reach the near edge, pass over the crown, and settle on the far side.
  function lift(point: Point) {
    let height = 0
    for (const o of obstacles) {
      if (!o.low) continue
      const p = local(point, o)
      const across = Math.abs(2 * p.z / o.depth)
      const radial = o.kind === 'stones' ? Math.hypot(2 * p.x / o.width, across) : across
      const outside = o.kind === 'stones' ? Math.max(0, radial - 1) * o.width / 2 :
        Math.hypot(Math.max(0, Math.abs(p.x) - o.width / 2), Math.max(0, Math.abs(p.z) - o.depth / 2))
      const reach = Math.max(0, 1 - outside / .32)
      if (!reach) continue
      const crown = Math.sqrt(Math.max(0, 1 - radial * radial))
      const branch = o.kind === 'logs' ? .21 * Math.max(0, 1 - Math.hypot(p.x + .45, p.z - .09) / .36) : 0
      height = Math.max(height, (o.height * (.55 + .45 * crown) + branch) * reach * reach * (3 - 2 * reach))
    }
    return height
  }
  return { clear, waypoint, lift, open }
}
