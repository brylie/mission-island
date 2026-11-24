import assert from 'node:assert/strict'
import { test } from 'node:test'
import { roadNetwork } from '../src/assets/geometry/road-kinds.ts'
import { buildRoadNetworkMesh } from '../src/assets/road-network-mesh.ts'
import { gradedRoads, groundHeight, roadSurfaceSource } from '../src/terrain.ts'

const mesh = buildRoadNetworkMesh(roadSurfaceSource, groundHeight)
const coordinates = 3
const at = (v) => ({ x: mesh.positions[v * coordinates], z: mesh.positions[v * coordinates + 2] })
const edgeKey = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`)
const surfaceEdges = () => {
  const uses = new Map()
  for (let i = 0; i < mesh.surfaceIndices; i += 3) {
    const [a, b, c] = mesh.indices.slice(i, i + 3)
    for (const [p, q] of [[a, b], [b, c], [c, a]]) uses.set(edgeKey(p, q), (uses.get(edgeKey(p, q)) ?? 0) + 1)
  }
  return uses
}

test('the road network is one surface: no edge is shared by more than two triangles, so nothing overlaps', () => {
  assert.ok(mesh.surfaceIndices > 0)
  const overlapping = [...surfaceEdges().entries()].filter(([, uses]) => uses > 2)
  assert.deepEqual(overlapping.slice(0, 5), [])
})

test('every junction mouth is covered: no gap between the roads that meet there', () => {
  // Triangles filed by the metre squares their bounds touch.
  const buckets = new Map()
  for (let i = 0; i < mesh.surfaceIndices; i += 3) {
    const corners = mesh.indices.slice(i, i + 3).map(at)
    const xs = corners.map((p) => p.x), zs = corners.map((p) => p.z)
    for (let x = Math.floor(Math.min(...xs)); x <= Math.floor(Math.max(...xs)); x++) {
      for (let z = Math.floor(Math.min(...zs)); z <= Math.floor(Math.max(...zs)); z++) buckets.set(`${x},${z}`, [...(buckets.get(`${x},${z}`) ?? []), corners])
    }
  }
  const sign = (p, a, b) => (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x)
  const inside = (p, [a, b, c]) => {
    const s1 = sign(p, a, b), s2 = sign(p, b, c), s3 = sign(p, c, a)
    return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)
  }
  const { roads, junctions } = roadSurfaceSource.network()
  const gaps = []
  for (const { host, hostSample } of junctions) {
    const centre = roads[host].samples[hostSample]
    const reach = roadNetwork.filletM + roadNetwork.mouthBlendM
    for (let dz = -reach; dz <= reach; dz += 0.25) {
      for (let dx = -reach; dx <= reach; dx += 0.25) {
        const p = { x: centre.x + dx, z: centre.z + dz }
        // Well inside the formation, clear of the outline's last cell.
        if (roadSurfaceSource.fieldsAt(p).formation > -0.5) continue
        if (!(buckets.get(`${Math.floor(p.x)},${Math.floor(p.z)}`) ?? []).some((tri) => inside(p, tri))) gaps.push(`(${p.x.toFixed(2)}, ${p.z.toFixed(2)})`)
      }
    }
  }
  assert.deepEqual(gaps.slice(0, 5), [])
})

test('a skirt hangs from every outline edge, so the road never shows its underside', () => {
  const outline = [...surfaceEdges().values()].filter((uses) => uses === 1).length
  assert.ok(outline > 0)
  // Two triangles of skirt for each outline edge.
  assert.equal((mesh.indices.length - mesh.surfaceIndices) / 6, outline)
})

test('the trailhead is asphalt from the harbor road into the fire road\'s apron, and earth beyond it', () => {
  const fireRoad = gradedRoads().find((road) => road.id === 'fire-road')
  const harbor = roadSurfaceSource.fieldsAt({ x: 12.5, z: 11.3 })
  assert.ok(harbor.paved <= 0, 'the harbor road at the junction is paved carriageway')
  const apron = roadSurfaceSource.fieldsAt(fireRoad.profile[0])
  assert.ok(apron.paved < roadNetwork.apronM && apron.graded < 0, 'the fire road starts in its apron')
  const inland = roadSurfaceSource.fieldsAt(fireRoad.profile.find((s) => s.along - fireRoad.profile[0].along > 20))
  assert.ok(inland.paved > roadNetwork.apronM && inland.carriageway < 0, 'further in it is earth carriageway')
})
