import { roadKinds, roadNetwork } from './assets/geometry/road-kinds.ts'
import { roadBanks, type SampleBanks } from './road-banks.ts'
import { findCulverts, type Culvert } from './road-culverts.ts'
import { createSampleIndex } from './road-index.ts'
import { buildRoadNetwork, halfFormationOf, halfWidthOf, pavedRoads, type Junction, type NetworkRoad, type RoadNetwork } from './road-network.ts'
import { solveRoadProfile, type RoadProfileSample } from './road-profile.ts'
import type { RoadSample } from './road-shape.ts'
import type { Point } from './world.ts'
import type { StarterRoadLayout } from './worlds/starter/layout/roads.ts'
import { smoothstep } from './math/smoothstep.ts'

// Cuts and fills the island for its road network. Each graded road finds its height through
// the natural ground (road-profile.ts); a branch starts level with the road it joins. The
// ground near the roads is then worked out cell by cell from every road nearby:
// - inside a road's formation (carriageway and shoulders) the ground is that road's surface,
//   the earlier road first where two overlap;
// - at a junction the branch's mouth warps to meet the host and the two formations join in a
//   smooth union, which rounds the corners into a bell-mouth;
// - beyond the formations, every nearby road's banks bound the ground: no higher than any cut
//   bank, no lower than any fill. Taking the lowest cut and the highest fill keeps the ground
//   continuous between switchback legs and where banks meet.
// The result is a raster of height changes added to the natural ground.

type GroundFunction = (point: Point) => number

export interface GradedRoad {
  id: string
  name: string
  kind: NetworkRoad['kind']
  layout?: StarterRoadLayout
  profile: RoadProfileSample[]
  banks: SampleBanks[]
  halfWidth: number
  // Half the width plus the shoulder: the flat part of the cross-section.
  halfFormation: number
  graded: boolean
  // How far past each end the road's strip carries on square to reach the road it joins (its
  // host's centreline), or 0 at a free end.
  joins: { start: number, end: number }
}

// One road's say at a point.
interface Candidate {
  road: number
  sample: number
  along: number
  // Signed distance to the road's formation and carriageway edges (negative inside).
  formation: number
  carriageway: number
  across: number
  // The road surface level with the point, and its formation edge height for banks.
  surface: number
  edge: number
  cutSlope: number
  fillSlope: number
  // How far beyond the formation edge each bank reaches before it meets the ground.
  cutMeetsM: number
  fillMeetsM: number
}

interface RoadSurfacePoint { road: GradedRoad, carriageway: number, formation: number, across: number, along: number, surface: 'asphalt' | 'earth' }

const square = 2
// A raster node counts as moved by the grading when it changed by more than this.
const changeM = 1e-3
// Nodes this many cells from a moved node are looked at too.
const besideCells = 2
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
// Polynomial smooth minimum: a union of two distance fields with corners rounded over `k` metres.
function smoothMin(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k / (square + square)
}

// The furthest any of a road's banks reaches before meeting the ground.
const bankReach = (banks: readonly SampleBanks[]) => Math.max(0, ...banks.flatMap(({ left, right }) => [left.cutMeetsM, left.fillMeetsM, right.cutMeetsM, right.fillMeetsM]))

function nearest(samples: readonly Point[], point: Point) {
  let best = 0, bestDistance = Infinity
  samples.forEach((sample, i) => {
    const d = Math.hypot(sample.x - point.x, sample.z - point.z)
    if (d < bestDistance) [best, bestDistance] = [i, d]
  })
  return { index: best, distance: bestDistance }
}

// A road's surface height at a point near it, from its nearest sample.
function surfaceNear(road: GradedRoad, point: Point, natural: GroundFunction) {
  if (!road.graded) return natural(point)
  const sample = road.profile[nearest(road.profile, point).index]
  const off = (point.x - sample.x) * sample.dx + (point.z - sample.z) * sample.dz
  const across = Math.abs((point.x - sample.x) * sample.dz - (point.z - sample.z) * sample.dx)
  return sample.y + sample.grade * off - roadKinds[road.kind].crown * Math.min(1, (across / road.halfWidth) ** square)
}

// A branch's samples without those whose row across the road touches its host's formation, which
// the host's surface owns. Testing the whole row, not just the centre, keeps an angled branch's
// formation clear of its host's where it starts; the strip carried back to the host fills the
// mouth between them.
function trimmed(samples: readonly RoadSample[], hosts: readonly ({ end: 'start' | 'end', host: GradedRoad } | undefined)[], halfFormation: number) {
  let from = 0, to = samples.length
  const inside = (sample: RoadSample, host: GradedRoad) => [-halfFormation, 0, halfFormation].some((t) =>
    nearest(host.profile, { x: sample.x - sample.dz * t, z: sample.z + sample.dx * t }).distance < host.halfFormation)
  const [start, end] = hosts
  if (start) while (from < to - square && inside(samples[from], start.host)) from++
  if (end) while (to - square > from && inside(samples[to - 1], end.host)) to--
  return samples.slice(from, to)
}

function gradeNetwork(network: RoadNetwork, natural: GroundFunction): GradedRoad[] {
  const graded: GradedRoad[] = []
  network.roads.forEach((road, index) => {
    const kind = roadKinds[road.kind]
    const halfWidth = halfWidthOf(road), halfFormation = halfFormationOf(road)
    const hostAt = (end: 'start' | 'end') => {
      const junction = network.junctions.find((join) => join.branch === index && join.end === end)
      return junction && { end, host: graded[junction.host] }
    }
    const hosts = [hostAt('start'), hostAt('end')]
    const samples = kind.graded ? trimmed(road.samples, hosts, halfFormation) : road.samples
    // A joining end starts level with its host; a free end takes the road's own benched ground.
    const pin = (sample: RoadSample, host: GradedRoad | undefined) => host && surfaceNear(host, sample, natural)
    const profile = kind.graded
      ? solveRoadProfile(samples, {
          groundAt: natural,
          halfWidth: halfFormation,
          maxGrade: (sample) => road.layout?.maxGrade?.[sample.stretch] ?? kind.maxGrade,
          start: pin(samples[0], hosts[0]?.host),
          end: pin(samples[samples.length - 1], hosts[1]?.host),
          benchSideSlope: roadNetwork.benchSideSlope,
        })
      : samples.map((sample) => ({ ...sample, y: natural(sample), ground: natural(sample), grade: 0, cut: 0 }))
    const banks = kind.graded ? roadBanks(road.kind, profile, halfFormation, kind.crown, natural) : []
    const reach = (sample: RoadSample | undefined, host: GradedRoad | undefined) => (sample && host ? nearest(host.profile, sample).distance : 0)
    const joins = { start: reach(profile[0], hosts[0]?.host), end: reach(profile[profile.length - 1], hosts[1]?.host) }
    graded.push({ id: road.id, name: road.name, kind: road.kind, layout: road.layout, profile, banks, halfWidth, halfFormation, graded: kind.graded, joins })
  })
  return graded
}

// A paved road's free ends stop square: a box whose distance counts from the end row on both
// sides of it, so the field has no kink there for a mesh to trace badly. Returns how far across the
// road a point must be taken to be, and which samples are square ends.
function squareEnd(graded: GradedRoad, s: RoadProfileSample, point: Point) {
  const ends = graded.graded ? [] : [graded.joins.start === 0 ? 0 : -1, graded.joins.end === 0 ? graded.profile.length - 1 : -1].filter((end) => end >= 0)
  let across = 0
  for (const end of ends) {
    const e = graded.profile[end], outward = end === 0 ? -1 : 1
    // Only for the samples near that end; further along, the road may bend back past its plane.
    if (Math.abs(s.along - e.along) > graded.halfFormation + graded.halfFormation) continue
    across = Math.max(across, graded.halfFormation + ((point.x - e.x) * e.dx + (point.z - e.z) * e.dz) * outward)
  }
  return { across, ends }
}

function candidateAt(roads: readonly GradedRoad[], road: number, sample: number, point: Point, natural: GroundFunction): Candidate {
  const graded = roads[road], s = graded.profile[sample], kind = roadKinds[graded.kind]
  let along = (point.x - s.x) * s.dx + (point.z - s.z) * s.dz
  const side = (point.z - s.z) * s.dx - (point.x - s.x) * s.dz
  let across = Math.abs(side)
  // Past either end the road stops in a round cap at the end's height.
  const pastEnd = (sample === 0 && along < 0) || (sample === graded.profile.length - 1 && along > 0)
  // Past an end the road stops in a round cap. A joined end's strip first carries on back toward
  // its host, so an angled mouth has no wedge outside both roads' formations, and its cap is at the
  // strip's far end: the shape is a capsule, so its edge never jumps.
  const joinReach = sample === 0 ? graded.joins.start : graded.joins.end
  // A paved road's free end, as at the ferry ramp, stops square instead.
  const box = squareEnd(graded, s, point)
  across = Math.max(across, box.across)
  if (pastEnd && box.ends.includes(sample)) along = 0
  else if (pastEnd) {
    across = Math.hypot(Math.max(0, Math.abs(along) - joinReach), across)
    along = 0
  }
  const centre = s.y + s.grade * along
  const surface = graded.graded ? centre - kind.crown * Math.min(1, (across / graded.halfWidth) ** square) : natural(point)
  const banks = graded.banks[sample]?.[side >= 0 ? 'left' : 'right']
  return {
    road,
    sample,
    along: s.along + along,
    across,
    formation: across - graded.halfFormation,
    carriageway: across - graded.halfWidth,
    surface,
    edge: graded.graded ? centre - kind.crown : surface,
    cutSlope: banks?.cut ?? kind.cutSlope,
    fillSlope: banks?.fill ?? kind.fillSlope,
    cutMeetsM: banks?.cutMeetsM ?? 0,
    fillMeetsM: banks?.fillMeetsM ?? 0,
  }
}

// Joins a branch's mouth to its host: the branch's surface warps to the host's near the host,
// and their formations join in a smooth union.
function joinMouths(candidates: Candidate[], junctions: readonly Junction[], roads: readonly GradedRoad[]) {
  for (const junction of junctions) {
    const host = candidates.filter((c) => c.road === junction.host).sort((a, b) => a.formation - b.formation)[0]
    const profile = roads[junction.branch].profile
    const endAlong = (junction.end === 'start' ? profile[0] : profile[profile.length - 1]).along
    const branch = candidates.find((c) => c.road === junction.branch && Math.abs(profile[c.sample].along - endAlong) <= roadNetwork.filletM + roadNetwork.mouthBlendM)
    if (!host || !branch) continue
    const t = smoothstep(clamp01(Math.max(0, host.formation) / roadNetwork.mouthBlendM))
    branch.surface = host.surface + (branch.surface - host.surface) * t
    branch.edge = host.surface + (branch.edge - host.surface) * t
    branch.formation = smoothMin(host.formation, branch.formation, roadNetwork.filletM)
    branch.carriageway = smoothMin(host.carriageway, branch.carriageway, roadNetwork.filletM)
  }
}

// `paved` defaults to the village's roads; tests on made-up ground pass none.
export function createRoadGrading(layouts: readonly StarterRoadLayout[], natural: GroundFunction, paved: readonly NetworkRoad[] = pavedRoads()) {
  let built: ReturnType<typeof build> | undefined
  function build() {
    const network = buildRoadNetwork(layouts, paved)
    const roads = gradeNetwork(network, natural)
    const index = createSampleIndex(roads.map((road) => road.profile), roadNetwork.filletM)
    // Candidates reach past each road's banks by the most a junction's fillet can lower a
    // formation, so a point the blend pulls back within a bank's reach still has both roads, and
    // past its ends by the strip carried on to the road it joins.
    const filletDepth = roadNetwork.filletM / (square + square)
    const radius = Math.max(...roads.map((road) => road.halfFormation + bankReach(road.banks) + filletDepth + Math.max(road.joins.start, road.joins.end)))
    function evaluate(point: Point) {
      const ground = natural(point)
      const candidates = index.legsNear(point, radius).map(({ road, sample }) => candidateAt(roads, road, sample, point, natural))
      joinMouths(candidates, network.junctions, roads)
      const inside = candidates.filter((c) => c.formation <= 0).sort((a, b) => a.road - b.road)[0]
      if (inside) return { height: inside.surface, ground, owner: inside, candidates }
      let upper = Infinity, lower = -Infinity
      for (const c of candidates) {
        if (!roads[c.road].graded) continue
        // A bank has its say only out to where it meets the ground, so it ends without a step.
        if (c.formation <= c.cutMeetsM) upper = Math.min(upper, c.edge + c.formation / c.cutSlope)
        if (c.formation <= c.fillMeetsM) lower = Math.max(lower, c.edge - c.formation / c.fillSlope)
      }
      const owner = candidates.sort((a, b) => a.formation - b.formation)[0]
      return { height: Math.min(upper, Math.max(ground, lower)), ground, owner, candidates }
    }
    let built: ReturnType<typeof createRaster> | undefined
    // The raster is built on the first height lookup; profiles and banks alone don't need it.
    const raster = () => built ??= createRaster(roads, evaluate)
    return { network, roads, evaluate, raster, culverts: undefined as Culvert[] | undefined }
  }
  const get = () => built ??= build()
  return {
    // How far the roads raise (+) or lower (−) the natural ground at a point.
    delta: (point: Point) => get().raster().at(point),
    roads: () => get().roads.filter((road) => road.graded),
    // The culverts the graded roads need so no hollow they make holds water, found on first ask.
    culverts: () => {
      const built = get()
      const nearestRoad = (point: Point) => {
        const { owner } = built.evaluate(point)
        return { road: owner ? built.roads[owner.road].id : '', along: owner?.along ?? 0 }
      }
      built.culverts ??= findCulverts(built.raster().changed(), natural, (point) => natural(point) + built.raster().at(point), nearestRoad)
      return built.culverts
    },
    network: () => get().network,
    // Whether a point is near enough a graded road for its grading raster to cover it: a quick
    // test before asking anything dearer.
    near: (point: Point) => get().raster().near(point),
    // Metres from a point to the nearest graded road's formation edge (negative on the road).
    clearance: (point: Point) => {
      const { candidates } = get().evaluate(point)
      const { roads } = get()
      return Math.min(Infinity, ...candidates.filter((c) => roads[c.road].graded).map((c) => c.formation))
    },
    // Signed metres (negative inside) to the edges of the roads' carriageway and formation,
    // junction corners included, and to the nearest paved carriageway.
    carriagewayAt: (point: Point) => {
      const { candidates } = get().evaluate(point)
      const { roads } = get()
      let distance = Infinity, formation = Infinity, paved = Infinity
      for (const c of candidates) {
        distance = Math.min(distance, c.carriageway)
        formation = Math.min(formation, c.formation)
        if (!roads[c.road].graded) paved = Math.min(paved, c.carriageway)
      }
      return { distance, formation, paved }
    },
    // Everything the road surface's mesh needs at a point, from one evaluation: signed metres
    // (negative inside) to any road's formation and carriageway, to the paved carriageways, and
    // to the graded formations; and how far across its nearest road the point lies, in that
    // road's half-widths.
    fieldsAt: (point: Point) => {
      const { candidates } = get().evaluate(point)
      const { roads } = get()
      let formation = Infinity, carriageway = Infinity, paved = Infinity, graded = Infinity, lane = Infinity
      for (const c of candidates) {
        formation = Math.min(formation, c.formation)
        if (c.carriageway < carriageway) [carriageway, lane] = [c.carriageway, c.across / roads[c.road].halfWidth]
        if (roads[c.road].graded) graded = Math.min(graded, c.formation)
        else paved = Math.min(paved, c.carriageway)
      }
      return { formation, carriageway, paved, graded, lane }
    },
    // Which road's surface a point is on or beside, if any.
    surfaceAt: (point: Point): RoadSurfacePoint | undefined => {
      const { owner } = get().evaluate(point)
      if (!owner) return undefined
      const road = get().roads[owner.road]
      return { road, carriageway: owner.carriageway, formation: owner.formation, across: owner.across, along: owner.along, surface: roadKinds[road.kind].surface }
    },
  }
}

const { tileKeyStride } = roadNetwork

// The height changes over the ground near the graded roads, in square tiles of cells, sampled
// between nodes. Tiles far from any graded road are never built and read as no change.
function createRaster(roads: readonly GradedRoad[], evaluate: (point: Point) => { height: number, ground: number }) {
  const { cellM, tileCells } = roadNetwork
  const tileM = cellM * tileCells, nodes = tileCells + 1
  const keyOf = (tx: number, tz: number) => tx * tileKeyStride + tz
  const tiles = new Map<number, Float32Array>()
  const buildTile = (tx: number, tz: number) => {
    const delta = new Float32Array(nodes * nodes)
    for (let j = 0; j < nodes; j++) {
      for (let i = 0; i < nodes; i++) {
        const { height, ground } = evaluate({ x: tx * tileM + i * cellM, z: tz * tileM + j * cellM })
        delta[j * nodes + i] = height - ground
      }
    }
    tiles.set(keyOf(tx, tz), delta)
  }
  for (const road of roads.filter((graded) => graded.graded)) {
    road.profile.forEach((sample, i) => {
      // Each sample marks the tiles its formation and banks reach, and its mouth if it has one.
      const reach = road.halfFormation + bankReach(road.banks.slice(i, i + 1)) + roadNetwork.filletM * Number(i === 0 || i === road.profile.length - 1) + cellM
      for (let tz = Math.floor((sample.z - reach) / tileM); tz <= Math.floor((sample.z + reach) / tileM); tz++) {
        for (let tx = Math.floor((sample.x - reach) / tileM); tx <= Math.floor((sample.x + reach) / tileM); tx++) {
          if (!tiles.has(keyOf(tx, tz))) buildTile(tx, tz)
        }
      }
    })
  }
  // Every raster node the grading moved, and those beside them, where a fill's toe can dam
  // the natural ground: the places to look for the hollows grading makes.
  const changed = () => [...tiles].flatMap(([key, delta]) => {
    const tx = Math.round(key / tileKeyStride), tz = key - tx * tileKeyStride
    const moved = (i: number, j: number) => i >= 0 && j >= 0 && i < nodes && j < nodes && Math.abs(delta[j * nodes + i]) > changeM
    const near = (i: number, j: number) => {
      for (let dj = -besideCells; dj <= besideCells; dj++) for (let di = -besideCells; di <= besideCells; di++) if (moved(i + di, j + dj)) return true
      return false
    }
    return [...delta.keys()].filter((at) => near(at % nodes, Math.floor(at / nodes))).map((at) => ({ x: tx * tileM + (at % nodes) * cellM, z: tz * tileM + Math.floor(at / nodes) * cellM }))
  })
  const at = ({ x, z }: Point) => {
    const tx = Math.floor(x / tileM), tz = Math.floor(z / tileM)
    const delta = tiles.get(keyOf(tx, tz))
    if (!delta) return 0
    const gx = (x - tx * tileM) / cellM, gz = (z - tz * tileM) / cellM
    const i = Math.min(tileCells - 1, Math.floor(gx)), j = Math.min(tileCells - 1, Math.floor(gz)), fx = gx - i, fz = gz - j
    const node = j * nodes + i
    return (delta[node] * (1 - fx) + delta[node + 1] * fx) * (1 - fz) + (delta[node + nodes] * (1 - fx) + delta[node + nodes + 1] * fx) * fz
  }
  // Whether a point lies in a tile the grading built, near some graded road.
  const near = ({ x, z }: Point) => tiles.has(keyOf(Math.floor(x / tileM), Math.floor(z / tileM)))
  return { at, changed, near }
}
