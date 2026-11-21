import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'

const sides = 24
const half = sides / 2
const hipHeight = .752
const hipDepth = .175
const hipOffset = -.006

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
    return vertex(0, hipHeight - .107 * Math.abs(cos) ** .75, hipOffset + hipDepth * sin)
  })
  const thighs = legs.map((leg, index) => {
    const side = index === 0 ? -1 : 1
    const rows = [
      [.473, .149, .119, .132, .018, 1], [.488, .148, .123, .137, .016, 1],
      [.531, .143, .126, .142, .011, .89], [.572, .140, .129, .150, .005, .66],
      [.615, .137, .132, .156, .001, .41], [.654, .133, .135, .161, -.002, .19],
    ].map(([y, center, width, depth, z, weight]) => ({
      weight,
      vertices: ring((u, v) => vertex(side * (center + width * u), y, z + depth * v)),
    }))
    const pelvis = ring((u, v, i) =>
      crotch[i] >= 0 ? crotch[i] : vertex(side * .274 * u, hipHeight, hipOffset + hipDepth * v))
    const rings = [...rows.map(row => row.vertices), pelvis]
    for (let i = 1; i < rings.length; i++) addBand(indices, rings[i - 1], rings[i], side === -1)
    return { leg, pelvis, rows }
  })

  // Along the outside of the body, follow the right outer arc and the left outer
  // arc in reverse. The shared seam inside that boundary belongs to both thighs.
  let lower = [...thighs[1].pelvis.slice(0, half + 1), ...thighs[0].pelvis.slice(1, half).reverse()]
  for (const [y, width, depth, z, shoulderRise = 0] of [
    [.786, .265, .173, .002], [.868, .251, .168, -.006], [.948, .253, .177, -.009],
    [1.052, .277, .181, -.009], [1.139, .285, .168, -.010],
    [1.167, .276, .160, -.010, .028], [1.190, .254, .150, -.008, .044],
    [1.203, .226, .134, -.005, .053], [1.212, .190, .113, .001, .051],
    [1.214, .147, .097, .006, .036],
  ]) {
    // The neckline scoops front and back, with the same fabric rising over the shoulders.
    const upper = ring((u, v) => vertex(width * u, y + shoulderRise * u ** 2, z + depth * v))
    addBand(indices, lower, upper)
    lower = upper
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
