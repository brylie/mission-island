import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { crewSwimsuit } from './geometry/crew-swimwear'

const positionComponents = 3
const halfTurnsPerCircle = 2
const { ringSides: sides, pelvis: hip, thigh, torso, bib, strap } = crewSwimsuit
const half = sides / halfTurnsPerCircle
const sideSeamIndex = half / halfTurnsPerCircle

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
  const vertex = (x: number, y: number, z: number) => rest.push(x, y, z) / positionComponents - 1
  const ring = (point: (cos: number, sin: number, i: number) => number) =>
    Array.from({ length: sides }, (_, i) => {
      const angle = (i - sideSeamIndex) * halfTurnsPerCircle * Math.PI / sides
      return point(Math.cos(angle), Math.sin(angle), i)
    })
  // Both leg openings meet the same center seam instead of crossing a separate hip shell.
  const crotch = ring((cos, sin, i) => {
    if (i > 0 && i < half) return -1
    return vertex(0, hip.y - hip.crotchDrop * Math.abs(cos) ** hip.crotchCurve, hip.z + hip.halfDepth * sin)
  })
  const thighs = legs.map((leg, index) => {
    const side = index === 0 ? -1 : 1
    const rows = thigh.map(([y, center, width, depth, z, weight]) => ({
      weight,
      vertices: ring((u, v) => vertex(side * (center + width * u), y, z + depth * v)),
    }))
    const pelvis = ring((u, v, i) =>
      crotch[i] >= 0 ? crotch[i] : vertex(side * hip.halfWidth * u, hip.y, hip.z + hip.halfDepth * v))
    const rings = [...rows.map((row) => row.vertices), pelvis]
    for (let i = 1; i < rings.length; i++) addBand(indices, rings[i - 1], rings[i], side === -1)
    return { leg, pelvis, rows }
  })

  // Along the outside of the body, follow the right outer arc and the left outer
  // arc in reverse. The shared seam inside that boundary belongs to both thighs.
  let lower = [...thighs[1].pelvis.slice(0, half + 1), ...thighs[0].pelvis.slice(1, half).reverse()]
  for (const [y, width, depth, z] of torso) {
    const upper = ring((u, v) => vertex(width * u, y, z + depth * v))
    addBand(indices, lower, upper)
    lower = upper
  }

  // Follow the bib out from its scooped center, across the strap roots and down the armhole.
  const neckline = ring((u, v, i) => {
    const [x, y, front, back] = bib[Math.min(i % half, half - i % half)]
    return vertex(Math.sign(u) * x, y, v > 0 ? front : back)
  })
  addBand(indices, lower, neckline)
  for (const side of [-1, 1]) {
    const at = (i: number) => neckline[(sides + side * i) % sides]
    let inner = at(strap.front[0]), outer = at(strap.front[1])
    // Cross the sloping collarbone and return to the same vertices on the back bib.
    const rows = strap.profile.map(([innerY, innerZ, outerY, outerZ]) =>
      [vertex(side * strap.innerX, innerY, innerZ), vertex(side * strap.outerX, outerY, outerZ)])
    for (const [nextInner, nextOuter] of [...rows, [at(strap.back[0]), at(strap.back[1])]]) {
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
          const yIndex = index * positionComponents + 1
          const zIndex = yIndex + 1
          const y = rest[yIndex] - pivotY, z = rest[zIndex] - pivotZ
          positions[yIndex] = pivotY + y * cos - z * sin
          positions[zIndex] = pivotZ + y * sin + z * cos
        }
      }
    }
    VertexData.ComputeNormals(positions, indices, normals)
    mesh.updateVerticesData(VertexBuffer.PositionKind, positions, true)
    mesh.updateVerticesData(VertexBuffer.NormalKind, normals)
  }
  return { mesh, fitPose }
}
