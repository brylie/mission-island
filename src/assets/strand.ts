import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import type { MeshFactory } from '../island-meshes'
import { seededRandom } from '../seeded-random'
import type { Point } from '../world'

export const poolSand = '#80afa1'
const pebbleColors = ['#789997', '#899d8b']
const shellColors = ['#f4ddbc', '#dba69b', '#f4e5cf']

export function roundedPebble(meshes: MeshFactory, x: number, y: number, z: number, width: number, height: number, depth: number, heading: number, colorIndex: number) {
  const pebble = meshes.sphere(x, y, z, width, height, depth, pebbleColors[colorIndex % 2], undefined, false, 4)
  pebble.rotation.y = heading
}

// Each fan opens from a narrow hinge. Alternating ribs continue over the domed crown to the lip.
function appendScallop(positions: number[], indices: number[], colors: number[], at: Point, size: number, heading: number, tint: string, bed: (point: Point) => number) {
  const start = positions.length / 3
  const rgb = [1, 3, 5].map((i) => Number.parseInt(tint.slice(i, i + 2), 16) / 255)
  function vertex(u: number, v: number, h: number, light: number) {
    const x = at.x + size * (u * Math.cos(heading) - v * Math.sin(heading))
    const z = at.z + size * (u * Math.sin(heading) + v * Math.cos(heading))
    positions.push(x, bed({ x, z }) + 0.008 + h * size, z)
    colors.push(rgb[0] * light, rgb[1] * light, rgb[2] * light, 1)
  }
  vertex(0, 0, 0.03, 0.75)
  for (let row = 0; row < 2; row++) {
    for (let spoke = 0; spoke <= 18; spoke++) {
      const angle = (spoke / 18 - 0.5) * 2.4
      const ridge = spoke % 2
      const r = row === 0 ? 0.48 : 0.90 + 0.07 * ridge
      vertex(Math.sin(angle) * r, Math.cos(angle) * r, (row === 0 ? 0.17 : 0.025) + 0.06 * ridge, 0.83 + 0.17 * ridge)
      if (!spoke) continue
      const v = start + 1 + row * 19 + spoke
      if (!row) indices.push(start, v, v - 1)
      else indices.push(v - 20, v - 19, v, v - 20, v, v - 1)
    }
  }
}

export function dressStrand(meshes: MeshFactory, name: string, banks: readonly Point[], seed: number, bed: (point: Point) => number, allowed: (point: Point, y: number) => boolean) {
  const random = seededRandom(seed)
  const positions: number[] = [], indices: number[] = [], colors: number[] = []
  for (const bank of banks) {
    for (let i = 0; i < 14; i++) {
      const angle = random() * Math.PI * 2, r = Math.sqrt(random())
      const point = { x: bank.x + 2.4 * r * Math.cos(angle), z: bank.z + 1.3 * r * Math.sin(angle) }
      const y = bed(point)
      if (!allowed(point, y)) continue
      const heading = random() * Math.PI * 2
      if (random() < 0.56) {
        const size = 0.12 + random() ** 2 * 0.46
        roundedPebble(meshes, point.x, y, point.z, size, size * 0.45, size * (0.52 + 0.3 * random()), heading, i)
      }
      else {
        appendScallop(positions, indices, colors, point, 0.11 + 0.10 * random(), heading, shellColors[i % 3], bed)
      }
    }
  }
  if (!indices.length) return
  const shells = meshes.surface(name + ' scallop shells', positions, indices, '#ffffff')
  shells.setVerticesData(VertexBuffer.ColorKind, colors)
  shells.freezeWorldMatrix()
}
