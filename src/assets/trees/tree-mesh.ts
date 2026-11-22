// Pure mesh accumulation for the tree generator. Everything here is plain arrays,
// so the same geometry can be measured in tests and uploaded by the Babylon wrapper.
// Winding follows Babylon's ComputeNormals: cross(p1 - p2, p3 - p2) points outward.

export type Vec3 = readonly [number, number, number]
export type Rgb = readonly [number, number, number]

export interface MeshData {
  positions: number[]
  normals: number[]
  uvs: number[]
  colors: number[]
  indices: number[]
}

export interface SpinePoint { point: Vec3, radius: number }

const fullTurn = Math.PI + Math.PI
const half = 0.5
const opaque = 1
const vertexStride = 3
const zComponent = 2
const uvStride = 2
const colorStride = 4
// A frond strip has a left and a right vertex at every midrib point.
const frondRow = 2
const tinyLength = 1e-6
const helperAxisLimit = 0.9

export const emptyMesh = (): MeshData => ({ positions: [], normals: [], uvs: [], colors: [], indices: [] })
export const triangleCount = (mesh: MeshData) => mesh.indices.length / vertexStride

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
export function normalize(a: Vec3): Vec3 {
  const length = Math.hypot(...a)
  return length < tinyLength ? [0, 1, 0] : scale(a, 1 / length)
}

// Splits every triangle into its own corners with the face normal, for the island's
// faceted, flat-shaded look. Corner colors still carry the baked light and shade.
export function facet(mesh: MeshData): MeshData {
  const out = emptyMesh()
  const at = (index: number): Vec3 => [mesh.positions[index * vertexStride], mesh.positions[index * vertexStride + 1], mesh.positions[index * vertexStride + zComponent]]
  for (let i = 0; i < mesh.indices.length; i += vertexStride) {
    const corners = mesh.indices.slice(i, i + vertexStride)
    const [a, b, c] = corners.map(at)
    const normal = normalize(cross(sub(a, b), sub(c, b)))
    for (const corner of corners) {
      out.indices.push(out.positions.length / vertexStride)
      out.positions.push(...at(corner))
      out.normals.push(...normal)
      out.uvs.push(mesh.uvs[corner * uvStride], mesh.uvs[corner * uvStride + 1])
      out.colors.push(...mesh.colors.slice(corner * colorStride, corner * colorStride + colorStride))
    }
  }
  return out
}

function vertex(mesh: MeshData, point: Vec3, normal: Vec3, u: number, v: number, color: Rgb) {
  mesh.positions.push(...point)
  mesh.normals.push(...normal)
  mesh.uvs.push(u, v)
  mesh.colors.push(...color, opaque)
  return mesh.positions.length / vertexStride - 1
}

// Two triangles over a quad whose corners run a→b along a ring and a→c along the spine.
function quad(mesh: MeshData, a: number, b: number, c: number, d: number) {
  mesh.indices.push(a, c, b, b, c, d)
}

// Parallel-transported frames keep a bending limb from twisting between rings.
function frames(spine: readonly SpinePoint[]) {
  const tangents = spine.map((_, i) => normalize(sub(spine[Math.min(i + 1, spine.length - 1)].point, spine[Math.max(i - 1, 0)].point)))
  const helper: Vec3 = Math.abs(tangents[0][1]) < helperAxisLimit ? [0, 1, 0] : [1, 0, 0]
  let normal = normalize(cross(helper, tangents[0]))
  return tangents.map((tangent) => {
    normal = normalize(sub(normal, scale(tangent, dot(normal, tangent))))
    return { tangent, normal, binormal: cross(tangent, normal) }
  })
}

interface TubeStyle {
  sides: number
  // Side lets bark carry blotches, such as birch lenticels, rather than whole bands.
  color: (ring: number, along: number, side: number) => Rgb
  // Per-vertex radial roughness, so a log or snag does not read as a machined pole.
  roughness?: (ring: number, side: number) => number
  // Close the far end with a fan, raised or ragged for a cut or broken end.
  cap?: { rise: (side: number) => number, color: Rgb }
}

export function addTube(mesh: MeshData, spine: readonly SpinePoint[], style: TubeStyle) {
  const { sides, color, roughness, cap } = style
  const basis = frames(spine)
  const first = mesh.positions.length / vertexStride
  let along = 0
  for (const [ring, { point, radius }] of spine.entries()) {
    if (ring) along += Math.hypot(...sub(point, spine[ring - 1].point))
    const { normal, binormal } = basis[ring]
    for (let side = 0; side <= sides; side++) {
      const angle = side / sides * fullTurn
      const radial = add(scale(normal, Math.cos(angle)), scale(binormal, Math.sin(angle)))
      const r = radius * (1 + (roughness?.(ring, side % sides) ?? 0))
      vertex(mesh, add(point, scale(radial, r)), radial, side / sides * fullTurn * radius, along, color(ring, along, side % sides))
    }
  }
  const stride = sides + 1
  for (let ring = 0; ring < spine.length - 1; ring++) {
    for (let side = 0; side < sides; side++) {
      const a = first + ring * stride + side
      quad(mesh, a, a + 1, a + stride, a + stride + 1)
    }
  }
  if (cap) addCap(mesh, spine, basis, first + (spine.length - 1) * stride, sides, cap)
}

function addCap(mesh: MeshData, spine: readonly SpinePoint[], basis: ReturnType<typeof frames>, ring: number, sides: number, cap: NonNullable<TubeStyle['cap']>) {
  const end = spine[spine.length - 1]
  const { tangent } = basis[basis.length - 1]
  const center = vertex(mesh, add(end.point, scale(tangent, cap.rise(sides) * end.radius)), tangent, 0, 0, cap.color)
  const rim: number[] = []
  for (let side = 0; side < sides; side++) {
    const at = ring + side
    const p: Vec3 = [mesh.positions[at * vertexStride], mesh.positions[at * vertexStride + 1], mesh.positions[at * vertexStride + zComponent]]
    const lifted = add(p, scale(tangent, cap.rise(side) * end.radius))
    rim.push(vertex(mesh, lifted, tangent, sub(lifted, end.point)[0], sub(lifted, end.point)[2], cap.color))
  }
  for (let side = 0; side < sides; side++) mesh.indices.push(rim[side], center, rim[(side + 1) % sides])
}

interface PadShape {
  center: Vec3
  radius: Vec3
  segments: number
  // Latitude rings between the poles; one ring gives a faceted lens for distant silhouettes.
  rings: number
  // Pulls the underside up into the flat-bottomed cloud of a pine pad.
  flatten: number
  jitter: (ring: number, side: number) => number
  color: (height: number) => Rgb
}

const padNormal = (shape: PadShape, local: Vec3): Vec3 => normalize([local[0] / shape.radius[0], local[1] / shape.radius[1], local[2] / shape.radius[2]])

export function addPad(mesh: MeshData, shape: PadShape) {
  const { center, radius, segments, rings, flatten, jitter, color } = shape
  const put = (local: Vec3, u: number, v: number) => {
    return vertex(mesh, add(center, local), padNormal(shape, local), u, v, color(local[1] / radius[1]))
  }
  const top = put([0, radius[1] * (1 + jitter(0, 0)), 0], 0, 0)
  const ringStart: number[] = []
  for (let ring = 1; ring <= rings; ring++) {
    const latitude = ring / (rings + 1) * Math.PI
    const y = Math.cos(latitude), spread = Math.sin(latitude)
    const squash = y < 0 ? 1 - flatten : 1
    ringStart.push(mesh.positions.length / vertexStride)
    for (let side = 0; side <= segments; side++) {
      const angle = side / segments * fullTurn
      const wobble = 1 + jitter(ring, side % segments)
      const local: Vec3 = [Math.cos(angle) * spread * radius[0] * wobble, y * squash * radius[1] * wobble, Math.sin(angle) * spread * radius[2] * wobble]
      put(local, side / segments * fullTurn * radius[0], latitude * radius[1])
    }
  }
  const bottom = put([0, -radius[1] * (1 - flatten), 0], 0, Math.PI * radius[1])
  const stride = segments + 1
  for (let side = 0; side < segments; side++) {
    const first = ringStart[0] + side, last = ringStart[rings - 1] + side
    mesh.indices.push(first + 1, top, first, last, bottom, last + 1)
  }
  for (let ring = 0; ring < rings - 1; ring++) {
    for (let side = 0; side < segments; side++) {
      const a = ringStart[ring] + side
      quad(mesh, a + stride + 1, a + stride, a + 1, a)
    }
  }
}

export interface FrondPoint { point: Vec3, width: number }

// A double-sided blade around a curved midrib, for bracken fronds and similar flat leaves.
export function addFrond(mesh: MeshData, spine: readonly FrondPoint[], across: Vec3, color: (along: number) => Rgb) {
  const basis = frames(spine.map(({ point }) => ({ point, radius: 0 })))
  for (const facing of [1, -1]) {
    const first = mesh.positions.length / vertexStride
    for (const [i, { point, width }] of spine.entries()) {
      const along = i / (spine.length - 1)
      const surface = normalize(cross(basis[i].tangent, across))
      const normal = scale(surface, facing)
      const edge = scale(across, width * half)
      vertex(mesh, sub(point, edge), normal, -width * half, along, color(along))
      vertex(mesh, add(point, edge), normal, width * half, along, color(along))
    }
    for (let i = 0; i < spine.length - 1; i++) {
      const a = first + i * frondRow, b = a + frondRow
      if (facing > 0) quad(mesh, a + 1, a, b + 1, b)
      else quad(mesh, a, a + 1, b, b + 1)
    }
  }
}
