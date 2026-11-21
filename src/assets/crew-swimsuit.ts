import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'

const sides = 24
const half = sides / 2
const hipHeight = 0.752
const hipDepth = 0.175
const hipOffset = -0.006

function addBand(indices: number[], lower: number[], upper: number[], mirrored = false) {
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides
    const a = lower[i], b = lower[next], c = upper[i], d = upper[next]
    if (mirrored) indices.push(a, c, b, b, c, d)
    else indices.push(a, b, c, b, d, c)
  }
}

export function createSwimsuit(meshes: MeshFactory, root: TransformNode, legs: TransformNode[], color: string) {
  const rest: number[] = [], indices: number[] = []
  const vertex = (x: number, y: number, z: number) => rest.push(x, y, z) / 3 - 1
  const ring = (point: (cos: number, sin: number, i: number) => number) =>
    Array.from({ length: sides }, (_, i) => {
      const angle = (i - half / 2) * 2 * Math.PI / sides
      return point(Math.cos(angle), Math.sin(angle), i)
    })
  // Both leg openings meet the same center seam instead of crossing a separate hip shell.
  const crotch = ring((cos, sin, i) => {
    if (i > 0 && i < half) return -1
    return vertex(0, hipHeight - 0.107 * Math.abs(cos) ** 0.75, hipOffset + hipDepth * sin)
  })
  const thighs = legs.map((leg, index) => {
    const side = index === 0 ? -1 : 1
    const rows = [
      [0.473, 0.149, 0.119, 0.132, 0.018, 1],
      [0.488, 0.148, 0.123, 0.137, 0.016, 1],
      [0.531, 0.143, 0.126, 0.142, 0.011, 0.89],
      [0.572, 0.140, 0.129, 0.150, 0.005, 0.66],
      [0.615, 0.137, 0.132, 0.156, 0.001, 0.41],
      [0.654, 0.133, 0.135, 0.161, -0.002, 0.19],
    ].map(([y, center, width, depth, z, weight]) => ({
      weight,
      vertices: ring((u, v) => vertex(side * (center + width * u), y, z + depth * v)),
    }))
    const pelvis = ring((u, v, i) =>
      crotch[i] >= 0 ? crotch[i] : vertex(side * 0.274 * u, hipHeight, hipOffset + hipDepth * v))
    const rings = [...rows.map((row) => row.vertices), pelvis]
    for (let i = 1; i < rings.length; i++) addBand(indices, rings[i - 1], rings[i], side === -1)
    return { leg, pelvis, rows }
  })

  // Along the outside of the body, follow the right outer arc and the left outer
  // arc in reverse. The shared seam inside that boundary belongs to both thighs.
  let lower = [...thighs[1].pelvis.slice(0, half + 1), ...thighs[0].pelvis.slice(1, half).reverse()]
  for (const [y, width, depth, z] of [
    [0.786, 0.265, 0.173, 0.002],
    [0.868, 0.251, 0.168, -0.006],
    [0.948, 0.253, 0.177, -0.009],
    [1.052, 0.277, 0.181, -0.009],
    [1.139, 0.285, 0.168, -0.010],
  ]) {
    const upper = ring((u, v) => vertex(width * u, y, z + depth * v))
    addBand(indices, lower, upper)
    lower = upper
  }

  // Follow the bib out from its scooped center, across the strap roots and down the armhole.
  const bib = [
    [0, 1.179, 0.158, -0.161],
    [0.088, 1.188, 0.150, -0.151],
    [0.124, 1.207, 0.127, -0.146],
    [0.198, 1.208, 0.122, -0.129],
    [0.249, 1.175, 0.077, -0.092],
    [0.275, 1.161, 0.038, -0.059],
    [0.284, 1.155, -0.010, -0.010],
  ]
  const neckline = ring((u, v, i) => {
    const [x, y, front, back] = bib[Math.min(i % half, half - i % half)]
    return vertex(Math.sign(u) * x, y, v > 0 ? front : back)
  })
  addBand(indices, lower, neckline)
  for (const side of [-1, 1]) {
    const at = (i: number) => neckline[(sides + side * i) % sides]
    let inner = at(10), outer = at(9)
    // Cross the sloping collarbone and return to the same vertices on the back bib.
    const rows = [
      [1.242, 0.102, 1.244, 0.110],
      [1.268, 0.089, 1.268, 0.088],
      [1.280, 0.079, 1.278, 0.077],
      [1.290, 0.037, 1.292, 0.038],
      [1.290, -0.010, 1.291, -0.010],
      [1.287, -0.056, 1.281, -0.053],
      [1.276, -0.095, 1.266, -0.086],
      [1.246, -0.128, 1.239, -0.114],
    ]
    const strap = rows.map(([innerY, innerZ, outerY, outerZ]) =>
      [vertex(side * 0.124, innerY, innerZ), vertex(side * 0.188, outerY, outerZ)])
    for (const [nextInner, nextOuter] of [...strap, [at(2), at(3)]]) {
      const quad = [inner, nextInner, outer, outer, nextInner, nextOuter]
      indices.push(...(side > 0 ? quad : quad.reverse()))
      inner = nextInner
      outer = nextOuter
    }
  }

  const mesh = meshes.surface('Fitted one-piece swimsuit', rest, indices, color, root)
  meshes.shadows.addShadowCaster(mesh, false)
  const positions = Array.from(rest), normals = Array.from(mesh.getVerticesData(VertexBuffer.NormalKind)!)
  mesh.setVerticesData(VertexBuffer.PositionKind, positions, true)
  mesh.setVerticesData(VertexBuffer.NormalKind, normals, true)
  const lastAngles = legs.map(() => NaN)

  function fitPose() {
    if (!mesh.isEnabled() || thighs.every(({ leg }, i) => leg.rotation.x === lastAngles[i])) return
    for (const [index, { leg, rows }] of thighs.entries()) {
      lastAngles[index] = leg.rotation.x
      const pivotY = leg.position.y, pivotZ = leg.position.z
      for (const { weight, vertices } of rows) {
        const angle = leg.rotation.x * weight
        const sin = Math.sin(angle), cos = Math.cos(angle)
        for (const index of vertices) {
          const i = index * 3
          const y = rest[i + 1] - pivotY, z = rest[i + 2] - pivotZ
          positions[i + 1] = pivotY + y * cos - z * sin
          positions[i + 2] = pivotZ + y * sin + z * cos
        }
      }
    }
    VertexData.ComputeNormals(positions, indices, normals)
    mesh.updateVerticesData(VertexBuffer.PositionKind, positions, true)
    mesh.updateVerticesData(VertexBuffer.NormalKind, normals)
  }
  return { mesh, fitPose }
}
