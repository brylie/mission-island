import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh'

const planeTolerance = 0.0005
const minimumArea = 0.00001
const coordinatesPerVertex = 3
const verticesPerFace = 3
const triangleFanStart = 2
const minimumNormalLengthSquared = 1e-16
const minimumAlignment = 0.999999
const focusRange = 30
const areaMultiplier = 2
const boxMidpoint = 0.5

type Point = { x: number, y: number }
type Face = {
  mesh: AbstractMesh
  points: [Vector3, Vector3, Vector3]
  normal: Vector3
  min: Vector3
  max: Vector3
}

function facesOf(mesh: AbstractMesh, focus?: Vector3): Face[] {
  if (!mesh.isEnabled() || !mesh.isVisible || mesh.visibility <= 0 || mesh.material?.alpha === 0
    || mesh.getClassName() === 'LinesMesh') return []
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind)
  const indices = mesh.getIndices()
  if (!positions || !indices) return []
  const world = mesh.computeWorldMatrix(true)
  const vertices = Array.from({ length: positions.length / coordinatesPerVertex }, (_, i) =>
    Vector3.TransformCoordinates(Vector3.FromArray(positions, i * coordinatesPerVertex), world))
  const faces: Face[] = []
  for (let i = 0; i < indices.length; i += verticesPerFace) {
    const a = vertices[indices[i]]
    const b = vertices[indices[i + 1]]
    const c = vertices[indices[i + triangleFanStart]]
    const min = Vector3.Minimize(a, Vector3.Minimize(b, c))
    const max = Vector3.Maximize(a, Vector3.Maximize(b, c))
    if (focus && (min.x > focus.x + focusRange || max.x < focus.x - focusRange || min.z > focus.z + focusRange || max.z < focus.z - focusRange)) continue
    const normal = Vector3.Cross(b.subtract(a), c.subtract(a))
    if (normal.lengthSquared() <= minimumNormalLengthSquared) continue
    faces.push({
      mesh,
      points: [a, b, c],
      normal: normal.normalize(),
      min,
      max,
    })
  }
  return faces
}

function cross(a: Point, b: Point, p: Point) {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)
}

function clip(polygon: Point[], a: Point, b: Point, winding: number) {
  const result: Point[] = []
  let previous = polygon[polygon.length - 1]
  let lastDistance = winding * cross(a, b, previous)
  for (const current of polygon) {
    const distance = winding * cross(a, b, current)
    if ((distance < 0) !== (lastDistance < 0)) {
      const t = lastDistance / (lastDistance - distance)
      result.push({ x: previous.x + (current.x - previous.x) * t, y: previous.y + (current.y - previous.y) * t })
    }
    if (distance >= 0) result.push(current)
    previous = current
    lastDistance = distance
  }
  return result
}

function overlapOnPlane(a: Face, b: Face) {
  const { x, y, z } = a.normal
  const dominant = Math.max(Math.abs(x), Math.abs(y), Math.abs(z))
  const project = (p: Vector3): Point => dominant === Math.abs(x)
    ? { x: p.y, y: p.z }
    : dominant === Math.abs(y) ? { x: p.x, y: p.z } : { x: p.x, y: p.y }
  let polygon = a.points.map(project)
  const edge = b.points.map(project)
  const winding = Math.sign(cross(edge[0], edge[1], edge[2]))
  for (let i = 0; i < verticesPerFace && polygon.length >= verticesPerFace; i++) {
    polygon = clip(polygon, edge[i], edge[(i + 1) % verticesPerFace], winding)
  }
  let twiceArea = 0
  for (let i = triangleFanStart; i < polygon.length; i++) twiceArea += cross(polygon[0], polygon[i - 1], polygon[i])
  return Math.abs(twiceArea) > areaMultiplier * minimumArea * dominant
}

function label(mesh: AbstractMesh) {
  const material = mesh.material?.name.replace(/^(?:true|false)(?=#)/, '')
  const name = material && ['Box', 'Cylinder', 'Sphere'].includes(mesh.name) ? `${mesh.name} (${material})` : mesh.name
  return mesh.parent ? `${mesh.parent.name} / ${name}` : name
}

export function findZFightCandidates(meshes: readonly AbstractMesh[], focus?: Vector3) {
  const faces = meshes.flatMap((mesh) => facesOf(mesh, focus)).sort((a, b) => a.min.x - b.min.x)
  const pairs = new Map<string, { first: string, second: string, at: Vector3 }>()
  for (const [i, a] of faces.entries()) {
    for (let j = i + 1; j < faces.length; j++) {
      const b = faces[j]
      if (b.min.x > a.max.x + planeTolerance) break
      if (b.min.y > a.max.y + planeTolerance || a.min.y > b.max.y + planeTolerance
        || b.min.z > a.max.z + planeTolerance || a.min.z > b.max.z + planeTolerance) continue
      const alignment = Vector3.Dot(a.normal, b.normal)
      const twoSided = a.mesh.material?.backFaceCulling === false || b.mesh.material?.backFaceCulling === false
      if ((twoSided ? Math.abs(alignment) : alignment) < minimumAlignment) continue
      if (b.points.some((p) => Math.abs(Vector3.Dot(a.normal, p.subtract(a.points[0]))) > planeTolerance)
        || a.points.some((p) => Math.abs(Vector3.Dot(b.normal, p.subtract(b.points[0]))) > planeTolerance)) continue
      const key = a.mesh.uniqueId < b.mesh.uniqueId
        ? `${a.mesh.uniqueId}/${b.mesh.uniqueId}`
        : `${b.mesh.uniqueId}/${a.mesh.uniqueId}`
      if (!pairs.has(key) && overlapOnPlane(a, b)) {
        const at = Vector3.Maximize(a.min, b.min).addInPlace(Vector3.Minimize(a.max, b.max)).scaleInPlace(boxMidpoint)
        pairs.set(key, { first: label(a.mesh), second: label(b.mesh), at })
      }
    }
  }
  return [...pairs.values()]
}
