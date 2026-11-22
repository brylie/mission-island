import { biomePatchGeometry } from './assets/geometry/biome-vegetation.ts'
import { sitePropGeometry } from './assets/geometry/site-props.ts'
import { distance, offset, type Point } from './world.ts'

type HabitatPatch = Point & { kind: string, angle: number }
const maxStep = 0.66 // metres
const clearingRadius = 7.85
const half = 0.5
const footprintMarginM = 0.15
const segmentAxisEpsilon = 1e-8
const longestLogCrossingM = 1.45
const detourCornerClearanceM = 0.08
const minimumCornerDistanceM = 0.02
const diameterRatio = 2
const liftReachM = 0.32
const branchLiftM = 0.21
const branchReachM = 0.36
const edgeLiftRatio = 0.55
const crownLiftRatio = 0.45
const easeBase = 3
const easeSlope = 2

export function biomeTreeHeight(angle: number) {
  const { baseHeightM, heightPerRadianM } = biomePatchGeometry.tree
  return baseHeightM + angle * heightPerRadianM
}

export function biomeRockSize(angle: number) {
  const { baseSizeM, sizePerRadianM } = biomePatchGeometry.rock
  return baseSizeM + sizePerRadianM * angle
}

export function habitatObstacles(patches: readonly HabitatPatch[]) {
  return patches.flatMap((p) => {
    const pose = { x: p.x, z: p.z, heading: p.angle }
    if (p.kind === 'logs') {
      const { trunk } = sitePropGeometry.log
      const [, depth, width] = trunk.size
      return [{ ...pose, kind: p.kind, width, depth, height: trunk.center[1] + depth * half }]
    }
    if (p.kind === 'trees') {
      const { supportWidthM } = biomePatchGeometry.tree
      return [{ ...pose, kind: p.kind, width: supportWidthM, depth: supportWidthM, height: biomeTreeHeight(p.angle) * half }]
    }
    if (p.kind === 'stones') {
      const size = biomeRockSize(p.angle)
      const { supportDepthRatio, supportHeightRatio } = biomePatchGeometry.rock
      return [{ ...pose, kind: p.kind, width: size, depth: size * supportDepthRatio, height: size * supportHeightRatio }]
    }
    return []
  })
}

export function habitatNavigation(patches: readonly HabitatPatch[]) {
  const obstacles = habitatObstacles(patches).map((o) => ({
    ...o,
    cos: Math.cos(o.heading),
    sin: Math.sin(o.heading),
    low: o.height <= maxStep,
    halfX: o.width * half + footprintMarginM,
    halfZ: o.depth * half + footprintMarginM,
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
      if (Math.abs(delta) < segmentAxisEpsilon) {
        if (Math.abs(start) >= half) return false
      }
      else {
        const first = (-half - start) / delta, last = (half - start) / delta
        enter = Math.max(enter, Math.min(first, last))
        exit = Math.min(exit, Math.max(first, last))
        if (enter >= exit) return false
      }
    }
    // An overlapping spawn in an edited recipe can still walk out.
    if (enter === 0 && exit < 1) return false
    return !o.low || (o.kind === 'logs' && (exit - enter) * length > longestLogCrossingM)
  }

  function clear(from: Point, to: Point) {
    if (Math.hypot(to.x, to.z) > clearingRadius) return false
    const length = distance(from, to)
    return !obstacles.some((o) => crosses(from, to, o, length))
  }

  function open(p: Point) {
    return Math.hypot(p.x, p.z) <= clearingRadius && !obstacles.some((o) => {
      const q = local(p, o)
      return !o.low && Math.abs(q.x) < o.halfX && Math.abs(q.z) < o.halfZ
    })
  }
  const corners = obstacles.filter((o) => !o.low || o.kind === 'logs').flatMap((o) =>
    [-1, 1].flatMap((x) => [-1, 1].map((z) => offset(o, x * (o.halfX + detourCornerClearanceM), z * (o.halfZ + detourCornerClearanceM)))))
    .filter(open)
  let edges: { to: number, cost: number }[][] | undefined

  function waypoint(from: Point, goal: Point): Point | undefined {
    if (clear(from, goal)) return goal
    if (!open(goal)) return
    // Build once per layout, only if an animal actually needs a detour.
    edges ??= corners.map((p, i) => corners.flatMap((q, j) =>
      i !== j && clear(p, q) ? [{ to: j, cost: distance(p, q) }] : []))
    const cost = corners.map((p) => distance(from, p) > minimumCornerDistanceM && clear(from, p) ? distance(from, p) : Infinity)
    const first = corners.map((_, i) => i)
    const visited = new Set<number>()
    while (true) {
      let best = Infinity, next = -1
      for (let i = 0; i < corners.length; i++) {
        const estimate = cost[i] + distance(corners[i], goal)
        if (!visited.has(i) && estimate < best) {
          next = i
          best = estimate
        }
      }
      if (next < 0) return
      if (clear(corners[next], goal)) return corners[first[next]]
      visited.add(next)
      for (const edge of edges[next]) {
        const via = cost[next] + edge.cost
        if (via < cost[edge.to]) {
          cost[edge.to] = via
          first[edge.to] = first[next]
        }
      }
    }
  }

  // Feet rise as they reach the near edge, pass over the crown, and settle on the far side.
  const [branchX, , branchZ] = sitePropGeometry.log.branch.center
  function lift(point: Point) {
    let height = 0
    for (const o of obstacles) {
      if (!o.low) continue
      const p = local(point, o)
      const across = Math.abs(diameterRatio * p.z / o.depth)
      const radial = o.kind === 'stones' ? Math.hypot(diameterRatio * p.x / o.width, across) : across
      const outside = o.kind === 'stones'
        ? Math.max(0, radial - 1) * o.width * half
        : Math.hypot(Math.max(0, Math.abs(p.x) - o.width * half), Math.max(0, Math.abs(p.z) - o.depth * half))
      const reach = Math.max(0, 1 - outside / liftReachM)
      if (!reach) continue
      const crown = Math.sqrt(Math.max(0, 1 - radial * radial))
      const branch = o.kind === 'logs' ? branchLiftM * Math.max(0, 1 - Math.hypot(p.x - branchX, p.z - branchZ) / branchReachM) : 0
      height = Math.max(height, (o.height * (edgeLiftRatio + crownLiftRatio * crown) + branch) * reach * reach * (easeBase - easeSlope * reach))
    }
    return height
  }
  return { clear, waypoint, lift, open }
}
