import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import type { MeshFactory } from '../island-meshes'
import { seededRandom } from '../seeded-random'
import type { Point } from '../world'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { scallop, strandPebble } from './geometry/strand'
import { strandedPatchDressing } from '../worlds/starter/layout/scenery'

export const poolSand = '#80afa1'
const coordinatesPerVertex = 3
const half = 0.5
const fullTurn = Math.PI + Math.PI
const sizeBiasExponent = 2

export function roundedPebble(meshes: MeshFactory, x: number, y: number, z: number, width: number, height: number, depth: number, heading: number, colorIndex: number) {
  const pebble = meshes.sphere(x, y, z, width, height, depth, strandPebble.colors[colorIndex % strandPebble.colors.length], undefined, false, strandPebble.segments)
  pebble.rotation.y = heading
}

// Each fan opens from a narrow hinge. Alternating ribs continue over the domed crown to the lip.
function appendScallop(positions: number[], indices: number[], colors: number[], at: Point, size: number, heading: number, tint: string, bed: (point: Point) => number) {
  const start = positions.length / coordinatesPerVertex
  const { r: red, g: green, b: blue } = Color3.FromHexString(tint)
  const { ribs, rows, hinge, baseClearance } = scallop
  const spokeStride = ribs.spokeCount + 1
  function vertex(u: number, v: number, h: number, light: number) {
    const x = at.x + size * (u * Math.cos(heading) - v * Math.sin(heading))
    const z = at.z + size * (u * Math.sin(heading) + v * Math.cos(heading))
    positions.push(x, bed({ x, z }) + baseClearance + h * size, z)
    colors.push(red * light, green * light, blue * light, 1)
  }
  vertex(0, 0, hinge.height, hinge.shade)
  for (const [row, shape] of rows.entries()) {
    for (let spoke = 0; spoke <= ribs.spokeCount; spoke++) {
      const angle = (spoke / ribs.spokeCount - half) * ribs.arc
      const ridge = spoke % ribs.interval
      const r = row === 0 ? shape.radius : shape.radius + shape.ridge * ridge
      vertex(Math.sin(angle) * r, Math.cos(angle) * r, shape.rise + ribs.rise * ridge, ribs.shade + ribs.shadeVariation * ridge)
      if (!spoke) continue
      const v = start + 1 + row * spokeStride + spoke
      if (!row) indices.push(start, v, v - 1)
      else {
        const above = v - spokeStride
        indices.push(above - 1, above, v, above - 1, v, v - 1)
      }
    }
  }
}

export function dressStrand(meshes: MeshFactory, name: string, banks: readonly Point[], seed: number, bed: (point: Point) => number, allowed: (point: Point, y: number) => boolean) {
  const random = seededRandom(seed)
  const positions: number[] = [], indices: number[] = [], colors: number[] = []
  const { count, width, depth } = strandedPatchDressing
  for (const bank of banks) {
    for (let i = 0; i < count; i++) {
      const angle = random() * fullTurn, r = Math.sqrt(random())
      const point = { x: bank.x + width * r * Math.cos(angle), z: bank.z + depth * r * Math.sin(angle) }
      const y = bed(point)
      if (!allowed(point, y)) continue
      const heading = random() * fullTurn
      if (random() < strandPebble.frequency) {
        const size = strandPebble.size + random() ** sizeBiasExponent * strandPebble.sizeVariation
        roundedPebble(meshes, point.x, y, point.z, size, size * strandPebble.heightScale, size * (strandPebble.depthScale + strandPebble.depthVariation * random()), heading, i)
      }
      else {
        appendScallop(positions, indices, colors, point, scallop.size + scallop.sizeVariation * random(), heading, scallop.colors[i % scallop.colors.length], bed)
      }
    }
  }
  if (!indices.length) return
  const shells = meshes.surface(name + ' scallop shells', positions, indices, '#ffffff')
  shells.setVerticesData(VertexBuffer.ColorKind, colors)
  shells.freezeWorldMatrix()
}
