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
  // Signed distance to the formation the road's own ribbon covers, before any junction's
  // rounding; past its ends, to the square end of the strip its ribbon covers.
  ribbon: number
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

// A branch's samples without those inside its host's formation, which the host's surface owns.
function trimmed(samples: readonly RoadSample[], hosts: readonly ({ end: 'start' | 'end', host: GradedRoad } | undefined)[]) {
  let from = 0, to = samples.length
  const inside = (sample: RoadSample, host: GradedRoad) => nearest(host.profile, sample).distance < host.halfFormation
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
    const samples = kind.graded ? trimmed(road.samples, hosts) : road.samples
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
    graded.push({ id: road.id, name: road.name, kind: road.kind, layout: road.layout, profile, banks, halfWidth, halfFormation, graded: kind.graded })
  })
  return graded
}

function candidateAt(roads: readonly GradedRoad[], road: number, sample: number, point: Point, natural: GroundFunction): Candidate {
  const graded = roads[road], s = graded.profile[sample], kind = roadKinds[graded.kind]
  let along = (point.x - s.x) * s.dx + (point.z - s.z) * s.dz
  const side = (point.z - s.z) * s.dx - (point.x - s.x) * s.dz
  let across = Math.abs(side)
  // Past either end the road stops in a round cap at the end's height.
  const pastEnd = (sample === 0 && along < 0) || (sample === graded.profile.length - 1 && along > 0)
  // The ribbon stops square at the end row: past it, the distance to its covered strip is the
  // larger of how far beyond the row and how far outside the strip the point lies, so the field
  // stays continuous and a clip along it lands exactly on the row.
  const ribbon = pastEnd ? Math.max(Math.abs(along), across - graded.halfFormation) : across - graded.halfFormation
  if (pastEnd) {
    across = Math.hypot(point.x - s.x, point.z - s.z)
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
    ribbon,
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
    const radius = Math.max(...roads.map((road) => road.halfFormation + bankReach(road.banks)))
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
    // Whether a point lies under a graded road's own ribbon: its carriageway and shoulders.
    underRibbon: (point: Point) => {
      const { candidates } = get().evaluate(point)
      return candidates.some((c) => get().roads[c.road].graded && c.ribbon < 0)
    },
    // Metres from a point to the nearest graded road's formation edge (negative on the road).
    clearance: (point: Point) => {
      const { candidates } = get().evaluate(point)
      const { roads } = get()
      return Math.min(Infinity, ...candidates.filter((c) => roads[c.road].graded).map((c) => c.formation))
    },
    // Signed metres (negative inside) to the edges of the roads' carriageway and formation,
    // junction corners included; to the formation the roads' ribbons cover; and to the nearest
    // paved carriageway.
    carriagewayAt: (point: Point) => {
      const { candidates } = get().evaluate(point)
      const { roads } = get()
      let distance = Infinity, formation = Infinity, covered = Infinity, paved = Infinity
      for (const c of candidates) {
        distance = Math.min(distance, c.carriageway)
        formation = Math.min(formation, c.formation)
        covered = Math.min(covered, c.ribbon)
        if (!roads[c.road].graded) paved = Math.min(paved, c.carriageway)
      }
      return { distance, formation, covered, paved }
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
