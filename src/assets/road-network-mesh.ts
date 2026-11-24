import { roadKinds, roadNetwork } from './geometry/road-kinds.ts'
import { roadSurfaceModel } from './geometry/route-profiles.ts'
import { smoothstep } from '../math/smoothstep.ts'
import type { RoadNetwork } from '../road-network.ts'
import type { Point } from '../world.ts'

// The road network's surface as one mesh: every road's formation, paved and graded, junction mouths
// and all, traced from the grading's own fields on one grid. Neighbouring cells share their
// vertices, so the surface has no seams, overlaps or cracks anywhere, by construction. Each vertex
// carries signed distances to the road's edges, which the road material turns into asphalt,
// shoulder, earth, verge and ruts; distances blend linearly across a triangle, so those edges stay
// smooth at any angle to the grid. A skirt hangs from every outer edge.

export interface RoadFields {
  // Signed metres, negative inside: any road's formation and carriageway, the paved carriageways,
  // and the graded formations.
  formation: number
  carriageway: number
  paved: number
  graded: number
  // How far across its nearest road a point lies, in that road's half-widths.
  lane: number
}

export interface RoadMeshSource {
  network: () => RoadNetwork
  fieldsAt: (point: Point) => RoadFields
}

interface RoadNetworkMesh {
  positions: number[]
  indices: number[]
  uvs: number[]
  // Per vertex: carriageway, paved, graded and lane (vec4), then rut strength (one float).
  fields: number[]
  ruts: number[]
  // How many of the indices are the road's own surface; the skirt's follow.
  surfaceIndices: number
}

const half = 0.5
const coordinates = 3
// Grid nodes pack into one number: column and row, each offset to be positive. The offset holds
// 8 km of half-metre cells either way.
const gridOffset = 16_384
const gridSpan = gridOffset + gridOffset
const nodeKey = (i: number, j: number) => (i + gridOffset) * gridSpan + j + gridOffset
const fieldsPerVertex = 4
const stampEvery = 2
// A crossing this close to a node, as a share of the cell, is the node.
const snapShare = 1e-6
const zOffset = 2
// Far beyond any road: a distance the shader treats as "not here".
const far = 1e3
const { cellM, lift, uvPerMetre, rutFadeM, skirtDropM, skirtOutM } = roadSurfaceModel
// Two triangles per cell, as the terrain splits them: from its lower corner to its upper one.
const cellTriangles = [[[0, 0], [1, 0], [1, 1]], [[0, 0], [1, 1], [0, 1]]] as const

const clamped = (value: number) => (Number.isFinite(value) ? Math.max(-far, Math.min(far, value)) : far)

export function buildRoadNetworkMesh(source: RoadMeshSource, heightAt: (point: Point) => number): RoadNetworkMesh {
  const network = source.network()
  // Where the roads join: their rounded mouths reach further, and rut traffic spreads out.
  const mouths = network.junctions.map(({ host, hostSample }) => network.roads[host].samples[hostSample])
  const mouthReach = roadNetwork.filletM + roadNetwork.mouthBlendM
  // Grid nodes near any road: each road's samples stamp a disc as wide as its formation, or near a
  // junction as wide as the mouth's rounded corners could reach.
  const near = new Set<number>()
  for (const road of network.roads) {
    const formationM = roadKinds[road.kind].width * half + roadKinds[road.kind].shoulderWidth + cellM + cellM
    // Every other sample: the discs, metres wide, still overlap along the road.
    for (const sample of road.samples.filter((_, k) => k % stampEvery === 0 || k === road.samples.length - 1)) {
      const atMouth = mouths.some((m) => Math.hypot(m.x - sample.x, m.z - sample.z) < mouthReach + formationM)
      const reach = Math.ceil((atMouth ? formationM + roadNetwork.filletM : formationM) / cellM)
      const i0 = Math.round(sample.x / cellM), j0 = Math.round(sample.z / cellM)
      for (let dj = -reach; dj <= reach; dj++) {
        const span = Math.floor(Math.sqrt(reach * reach - dj * dj))
        for (let di = -span; di <= span; di++) near.add(nodeKey(i0 + di, j0 + dj))
      }
    }
  }
  // Each node's fields, evaluated once: the outline and the vertex both read them.
  const nodeFields = new Map<number, RoadFields>()
  const fieldsOf = (i: number, j: number) => {
    const key = nodeKey(i, j)
    let value = nodeFields.get(key)
    if (value === undefined) nodeFields.set(key, value = source.fieldsAt({ x: i * cellM, z: j * cellM }))
    return value
  }
  const field = (i: number, j: number) => (near.has(nodeKey(i, j)) ? fieldsOf(i, j).formation : Infinity)
  const rutAt = (point: Point) => smoothstep((Math.min(Infinity, ...mouths.map((m) => Math.hypot(m.x - point.x, m.z - point.z))) - rutFadeM[0]) / (rutFadeM[1] - rutFadeM[0]))

  const mesh: RoadNetworkMesh = { positions: [], indices: [], uvs: [], fields: [], ruts: [], surfaceIndices: 0 }
  // Node vertices by their node's key; edge crossings by both nodes' keys, as a string.
  const vertexOf = new Map<number | string, number>()
  const addVertex = (point: Point, known?: RoadFields, drop = 0, out?: Point) => {
    const at = out ? { x: point.x + out.x * skirtOutM, z: point.z + out.z * skirtOutM } : point
    const f = known ?? source.fieldsAt(point)
    mesh.positions.push(at.x, heightAt(point) + lift - drop, at.z)
    mesh.uvs.push(at.x * uvPerMetre, (at.z - drop) * uvPerMetre)
    mesh.fields.push(clamped(f.carriageway), clamped(f.paved), clamped(f.graded), clamped(f.lane))
    mesh.ruts.push(rutAt(point))
    return mesh.positions.length / coordinates - 1
  }
  const shared = (key: number | string, point: () => Point, known?: RoadFields) => {
    let index = vertexOf.get(key)
    if (index === undefined) vertexOf.set(key, index = addVertex(point(), known))
    return index
  }
  const node = (i: number, j: number) => shared(nodeKey(i, j), () => ({ x: i * cellM, z: j * cellM }), fieldsOf(i, j))
  // Where the road's edge crosses a grid edge, shared by the cells either side.
  const crossing = (a: readonly [number, number], b: readonly [number, number]) => {
    const [p, q] = nodeKey(a[0], a[1]) < nodeKey(b[0], b[1]) ? [a, b] : [b, a]
    const fp = field(p[0], p[1]), fq = field(q[0], q[1])
    const t = fp / (fp - fq)
    // An outline through or right beside a node is that node, so no edge comes out with no length.
    if (t < snapShare) return node(p[0], p[1])
    if (t > 1 - snapShare) return node(q[0], q[1])
    return shared(`${nodeKey(p[0], p[1])}:${nodeKey(q[0], q[1])}`, () => {
      return { x: (p[0] + (q[0] - p[0]) * t) * cellM, z: (p[1] + (q[1] - p[1]) * t) * cellM }
    })
  }
  // Each edge and how many triangles use it, with the third corner of one of them: an edge used
  // once is the road's outline, and its third corner shows which side is the road.
  const edgeUse = new Map<string, Edge>()
  const useEdge = (a: number, b: number, c: number) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`
    const entry = edgeUse.get(key)
    if (entry) entry.count++
    else edgeUse.set(key, { a, b, c, count: 1 })
  }
  for (const key of near) {
    const i = Math.floor(key / gridSpan) - gridOffset, j = key % gridSpan - gridOffset
    for (const triangle of cellTriangles) {
      const corners = triangle.map(([di, dj]) => [i + di, j + dj] as const)
      const values = corners.map(([ci, cj]) => field(ci, cj))
      if (values.every((value) => value > 0)) continue
      // The triangle clipped to the road: its inside corners, and where its edges cross the edge.
      const polygon: number[] = []
      corners.forEach((corner, k) => {
        const next = (k + 1) % corners.length
        if (values[k] <= 0) polygon.push(node(corner[0], corner[1]))
        if ((values[k] <= 0) !== (values[next] <= 0) && Number.isFinite(values[k]) && Number.isFinite(values[next])) polygon.push(crossing(corner, corners[next]))
      })
      // A crossing snapped onto a node can repeat its neighbour; drop the repeats.
      const corners2 = polygon.filter((v, k) => v !== polygon[(k + polygon.length - 1) % polygon.length])
      polygon.splice(0, polygon.length, ...corners2)
      for (let k = 1; k < polygon.length - 1; k++) {
        mesh.indices.push(polygon[0], polygon[k], polygon[k + 1])
        useEdge(polygon[0], polygon[k], polygon[k + 1])
        useEdge(polygon[k], polygon[k + 1], polygon[0])
        useEdge(polygon[k + 1], polygon[0], polygon[k])
      }
    }
  }
  mesh.surfaceIndices = mesh.indices.length
  addSkirt(mesh, edgeUse, addVertex)
  return mesh
}

interface Edge { a: number, b: number, c: number, count: number }

// A strip hanging from every edge used by one triangle: the road's outline. Its top copies the
// edge's vertices, so the road's own normals aren't bent by it.
function addSkirt(mesh: RoadNetworkMesh, edgeUse: Map<string, Edge>, addVertex: (point: Point, known?: RoadFields, drop?: number, out?: Point) => number) {
  const fieldsAt = (v: number): RoadFields => {
    const [carriageway, paved, graded, lane] = mesh.fields.slice(v * fieldsPerVertex, (v + 1) * fieldsPerVertex)
    return { formation: 0, carriageway, paved, graded, lane }
  }
  const pointOf = (v: number) => ({ x: mesh.positions[v * coordinates], z: mesh.positions[v * coordinates + zOffset] })
  for (const { a, b, c, count } of edgeUse.values()) {
    if (count !== 1) continue
    const p = pointOf(a), q = pointOf(b), inside = pointOf(c)
    const length = Math.hypot(q.x - p.x, q.z - p.z)
    if (length < Number.EPSILON) continue
    // Outward is the side of a–b away from its triangle's third corner.
    const side = { x: (q.z - p.z) / length, z: -(q.x - p.x) / length }
    const towardInside = (inside.x - p.x) * side.x + (inside.z - p.z) * side.z
    const out = towardInside > 0 ? { x: -side.x, z: -side.z } : side
    const topA = addVertex(p, fieldsAt(a)), topB = addVertex(q, fieldsAt(b))
    const footA = addVertex(p, fieldsAt(a), skirtDropM, out), footB = addVertex(q, fieldsAt(b), skirtDropM, out)
    mesh.indices.push(topA, footA, footB, topA, footB, topB)
  }
}
