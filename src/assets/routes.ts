import type { Material } from '@babylonjs/core/Materials/material'
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import type { MeshFactory } from '../island-meshes'
import { coastRadius, shoreProfile } from '../terrain'
import type { PathSurface } from '../routes'
import { laneMarkings, ribbonGeometry } from '../routes'
import type { Point } from '../world'

function ribbon({ surface }: MeshFactory, name: string, strips: ReadonlyArray<readonly Point[]>,
  width: number, y: number, material: string | Material, tile = 2.5, heightAt?: (p: Point) => number) {
  const { positions, indices } = ribbonGeometry(strips, width, y)
  const uvs: number[] = []
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], z = positions[i + 2]
    if (heightAt) positions[i + 1] += heightAt({ x, z })
    uvs.push(x / tile, z / tile)
  }
  return surface(name, positions, indices, material, undefined, uvs).freezeWorldMatrix()
}

export function createRoad(meshes: MeshFactory, points: readonly Point[], width = 6) {
  return {
    shoulder: ribbon(meshes, 'Road shoulder', [points], width + 1.4, 0.056, meshes.paintSurface('gravel'), 2.05),
    asphalt: ribbon(meshes, 'Asphalt', [points], width, 0.084, meshes.paintSurface('stone', '#636d65'), 3.0),
    markings: ribbon(meshes, 'Centerline', laneMarkings(points), 0.17, 0.099, '#e0cd9f'),
  }
}

function wornPath(meshes: MeshFactory, name: string, points: readonly Point[], width: number, heightAt: (p: Point) => number) {
  const vertices: number[] = [], colors: number[] = [], faces: number[] = []
  const path = points.flatMap((p, i) => {
    const next = points[i + 1]
    if (!next) return [p]
    const steps = Math.ceil(Math.hypot(next.x - p.x, next.z - p.z) / .32)
    return Array.from({ length: steps }, (_, j) => ({
      x: p.x + (next.x - p.x) * j / steps, z: p.z + (next.z - p.z) * j / steps,
    }))
  })
  const lanes = [-1, -.52, 0, .52, 1]
  let along = 0
  const length = path.reduce((sum, p, i) => i ? sum + Math.hypot(p.x - path[i - 1].x, p.z - path[i - 1].z) : sum, 0)
  for (const [i, p] of path.entries()) {
    const before = path[Math.max(0, i - 1)], after = path[Math.min(path.length - 1, i + 1)]
    along += Math.hypot(p.x - before.x, p.z - before.z)
    const span = Math.hypot(after.x - before.x, after.z - before.z)
    const end = Math.min(1, along / 1.1, (length - along) / 1.5)
    for (const [j, lane] of lanes.entries()) {
      const side = Math.sign(lane)
      const widthVariation = 1 + .17 * Math.sin(along * 1.35 + side * 1.7) + .08 * Math.cos(along * 3.9 - side)
      const offset = width * (.5 * lane * widthVariation * (.58 + .42 * end) + .10 * Math.sin(along * 1.12))
      const x = p.x + offset * (before.z - after.z) / span, z = p.z + offset * (after.x - before.x) / span
      vertices.push(x, heightAt({ x, z }) + .018, z)
      const grass = Math.min(1, Math.max(0, (shoreProfile[2].radius - coastRadius({ x, z })) / .012))
      const wear = (.77 + .13 * Math.sin(along * 1.84 + lane) + .09 * Math.sin(along * 5.52 - lane)) * end
      colors.push(.58, .46, .29, (1 - Math.abs(lane) ** 1.6) * wear * grass)
      if (i && j) {
        const d = i * lanes.length + j
        faces.push(d - lanes.length - 1, d - 1, d - lanes.length, d - lanes.length, d - 1, d)
      }
    }
  }
  const mesh = meshes.surface(name, vertices, faces, meshes.paint('#ffffff'))
  mesh.setVerticesData(VertexBuffer.ColorKind, colors)
  mesh.hasVertexAlpha = true
  return mesh.freezeWorldMatrix()
}

export function createTrail(meshes: MeshFactory, name: string, points: readonly Point[], width: number,
  surface: PathSurface = 'gravel', heightAt: (p: Point) => number = () => 0) {
  if (surface === 'desire') return wornPath(meshes, name, points, width, heightAt)
  const paved = surface === 'pavement'
  return ribbon(meshes, name, [points], width, .039, meshes.paintSurface(paved ? 'concrete' : 'gravel'),
    paved ? 2 : 1.85, heightAt)
}

export function createSidewalk(meshes: MeshFactory, path: { name: string; points: readonly Point[]; width: number }, material = meshes.paintSurface('concrete')) {
  // The sidewalk continues across the beach approach at the Seabrook junction.
  return ribbon(meshes, path.name, [path.points], path.width, .065, material, 2)
}
