import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { Ore } from '../ore-contracts'
import { vehicleSpecs } from './vehicles'
import type { Material } from '@babylonjs/core/Materials/material'
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import type { MeshFactory } from '../island-meshes'
import { seededRandom } from '../seeded-random'
import { fallsWidth, fallsX, fallsY, groundHeight, surfaceHeight } from './terrain'
import { stockpiles, placeStockpile } from './stockpiles'
import type { ScenerySolids } from './walking'

type Corner = [number, number, number]

// Keep fracture faces flat. Project top faces in plan and steep faces in
// elevation so the grain retains its scale around a broken edge.
function facetBatch() {
  const positions: number[] = [], indices: number[] = [], uvs: number[] = [], colors: number[] = []
  return {
    face(corners: Corner[], shade: number, phase = 0) {
      const first = positions.length / 3
      const [a, b, c] = corners
      const ab = b.map((v, i) => v - a[i]), ac = c.map((v, i) => v - a[i])
      const nx = Math.abs(ab[1] * ac[2] - ab[2] * ac[1])
      const ny = Math.abs(ab[2] * ac[0] - ab[0] * ac[2])
      const nz = Math.abs(ab[0] * ac[1] - ab[1] * ac[0])
      for (const [x, y, z] of corners) {
        positions.push(x, y, z)
        if (ny >= nx && ny >= nz) uvs.push(x + phase, z)
        else uvs.push((nx > nz ? z : x) + phase, y)
        colors.push(shade, shade, shade, 1)
      }
      for (let i = 2; i < corners.length; i++) indices.push(first, first + i - 1, first + i)
    },
    mesh(meshes: MeshFactory, name: string, material: Material, parent?: TransformNode) {
      const mesh = meshes.surface(name, positions, indices, material, parent, uvs)
      mesh.setVerticesData(VertexBuffer.ColorKind, colors)
      meshes.shadows.addShadowCaster(mesh, false)
      return parent ? mesh : mesh.freezeWorldMatrix()
    },
  }
}

function brokenStone(batch: ReturnType<typeof facetBatch>, x: number, y: number, z: number, radius: number, random: () => number, flatness: number) {
  const sides = 4 + Math.floor(random() * 3), turn = random() * Math.PI
  const lean = random() * 2 * Math.PI, cut = 0.24 + 0.54 * random()
  const height = radius * flatness, phase = random() * 5, shade = 0.68 + random() * 0.32
  const foot: Corner[] = [], crown: Corner[] = []
  for (let i = 0; i < sides; i++) {
    const a = turn + (i + random() * 0.32) * 2 * Math.PI / sides
    const r = radius * (0.76 + 0.24 * random()), dx = r * Math.cos(a), dz = r * Math.sin(a)
    foot.push([x + dx, y - radius * 0.56, z + dz * 0.86])
    crown.push([x + dx * (0.42 + cut * 0.33) + radius * 0.12, y + height * (0.44 + cut * Math.cos(a - lean)), z + dz * 0.55])
  }
  batch.face(crown, shade, phase)
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides
    batch.face([foot[i], foot[j], crown[j], crown[i]], shade * (0.83 + random() * 0.17), phase)
  }
}

export function createOreLoad(meshes: MeshFactory, parent: TransformNode, ore: Ore) {
  const pile = stockpiles.find((p) => p.id === ore)!
  const random = seededRandom(pile.seed)
  const bed = vehicleSpecs.hauler.cargo
  const batch = facetBatch()
  // Two bucketfuls settle into uneven ridges just above the rails.
  const rows: Corner[][] = []
  for (let row = 0; row <= 12; row++) {
    const v = row / 12
    const points: Corner[] = []
    for (let col = 0; col <= 6; col++) {
      const u = col / 6
      const crest = Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * (0.37 + 0.17 * Math.cos(v * Math.PI * 4))
      const y = bed.floor + bed.height - 0.13 + crest + random() * 0.09
      const x = (u - 0.5) * (bed.width - 0.10), z = bed.z + (v - 0.5) * (bed.length - 0.32)
      points.push([x, y, z])
      if (col && row) {
        const prev = rows[row - 1]
        batch.face([prev[col - 1], prev[col], points[col]], 0.82 + random() * 0.15)
        batch.face([prev[col - 1], points[col], points[col - 1]], 0.82 + random() * 0.15)
        brokenStone(batch, x - 0.16, y + 0.015, z - 0.16, pile.grain * (0.37 + random() * 0.43), random, 0.70)
      }
    }
    rows.push(points)
  }
  return batch.mesh(meshes, pile.id + ' truck load', meshes.paintRecipe(ore), parent)
}

function buildHopper(meshes: MeshFactory) {
  const cx = 282, cz = 178, floor = surfaceHeight(cx, cz)
  const frame = meshes.paintSurface('wood', '#78634f')
  const iron = meshes.paint('#69695e')
  const panels = facetBatch()
  function rim(width: number, depth: number, height: number, offset = 0): Corner[] {
    return [[-width, -depth], [width, -depth], [width, depth], [-width, depth]]
      .map(([dx, dz]) => [cx + dx, floor + height, cz + dz + offset])
  }
  const mouth = rim(0.86, 0.53, 2.12, -0.76), shoulder = rim(3.58, 2.65, 3.56), top = rim(3.58, 2.65, 4.63)
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4
    panels.face([mouth[i], mouth[j], shoulder[j], shoulder[i]], 0.80)
    panels.face([shoulder[i], shoulder[j], top[j], top[i]], 0.94)
    // The inside wall is visible above the remaining load.
    panels.face([top[i], top[j], shoulder[j], shoulder[i]], 0.61)
  }
  panels.mesh(meshes, 'Slatecliff riveted hopper', meshes.paint('#98735d'))
  const load = facetBatch(), crown = rim(3.56, 2.63, 4.03)
  for (let i = 0; i < 4; i++) load.face([crown[i], crown[(i + 1) % 4], [cx - 0.7, floor + 4.37, cz + 0.31]], 0.88)
  load.mesh(meshes, 'Unsorted hopper feed', meshes.paintSurface('stone', '#716f65'))
  for (const side of [-1, 1]) {
    for (const level of [3.56, 4.64]) {
      meshes.box(cx, floor + level, cz + side * 2.66, 7.28, 0.095, 0.11, iron)
      meshes.box(cx + side * 3.59, floor + level, cz, 0.11, 0.095, 5.32, iron)
    }
    for (const dx of [-2.32, 0, 2.32]) {
      meshes.box(cx + dx, floor + 4.10, cz + side * 2.66, 0.11, 1.07, 0.045, iron)
      for (const level of [3.69, 4.50]) {
        meshes.box(cx + dx, floor + level, cz + side * 2.695, 0.055, 0.055, 0.026, '#b2a18b')
      }
    }
    for (const dx of [-2.82, 2.82]) meshes.box(cx + dx, floor + 1.79, cz + side * 2.2, 0.28, 3.58, 0.30, frame)
    const brace = meshes.box(cx, floor + 1.78, cz + side * 2.2, 6.24, 0.18, 0.16, frame)
    brace.rotation.z = side * 0.44
  }
  // The chute falls toward the truck apron; raised cheeks retain the fines.
  meshes.box(cx, floor + 1.84, cz - 2.22, 1.91, 0.12, 3.26, iron).rotation.x = -0.24
  for (const side of [-1, 1]) {
    meshes.box(cx + side * 0.91, floor + 1.98, cz - 2.22, 0.12, 0.32, 3.26, iron).rotation.x = -0.24
  }
}

export function buildStockpiles(meshes: MeshFactory, solids: ScenerySolids) {
  // A loader approaches the open ends from the turnaround. The old
  // sleepers separate the three grades along the back of the hopper.
  const firstFixture = meshes.scene.meshes.length
  buildHopper(meshes)
  const wood = meshes.paintSurface('wood', '#817359')
  for (const x of [286.1, 291.45, 296.1, 300.3]) {
    const floor = surfaceHeight(x, 182)
    for (let course = 0; course < 2; course++) {
      meshes.box(x, floor + 0.13 + course * 0.25, 182.6 + course * 0.38, 0.22, 0.25, 4.4 - course * 0.76, wood)
    }
    for (const z of [181.9, 184.5]) meshes.box(x - 0.16, floor + 0.32, z, 0.14, 0.72, 0.18, '#645e4f')
  }
  solids.capture(meshes.scene.meshes.slice(firstFixture))

  for (const load of stockpiles) {
    const { id, grain, dust, host, seed } = load
    const random = seededRandom(seed)
    const ore = facetBatch(), waste = facetBatch(), fines = facetBatch()
    const point = placeStockpile(load, solids, random)
    let previous: Corner[] = []
    for (const t of [0, 0.24, 0.53, 0.78, 1]) {
      const ring = Array.from({ length: 20 }, (_, i) => point(i * Math.PI / 10, t))
      for (let i = 0; previous.length && i < ring.length; i++) {
        const j = (i + 1) % ring.length
        fines.face([ring[i], ring[j], previous[i]], 0.83 + random() * 0.12)
        if (t > 0.24) fines.face([ring[j], previous[j], previous[i]], 0.83 + random() * 0.12)
      }
      previous = ring
    }
    fines.mesh(meshes, 'Slatecliff crusher fines', meshes.paintSurface('stone', dust))
    // Small broken faces pack the slopes. Coarser blocks roll to the toe,
    // with a handful of stray pieces on the apron in front of each bin.
    for (let i = 0; i < 510; i++) {
      const spill = i >= 482
      const angle = spill ? Math.PI * (1.15 + random() * 0.7) : random() * Math.PI * 2
      const t = spill ? 1 + 0.28 * random() : Math.sqrt(random()) * 0.99
      const [x, y, z] = point(angle, t)
      const size = grain * (0.28 + random() ** 1.9 * 0.93) * (0.78 + 0.36 * t)
      brokenStone(random() < 0.43 ? ore : waste, x, y + 0.018, z, size, random, 0.54 + random() * 0.53)
    }
    ore.mesh(meshes, 'Slatecliff sorted ore', meshes.paintRecipe(id))
    waste.mesh(meshes, 'Slatecliff broken host rock', meshes.paintSurface('stone', host))
  }
}

export function buildTarnstepLedges(meshes: MeshFactory) {
  const basalt = meshes.paintRecipe('columnar-basalt'), slate = meshes.paintRecipe('slate')
  const sides = meshes.paintSurface('stone', '#495457')
  const random = seededRandom(2193)
  for (const [z, bank] of [[193.2, -1], [190.8, 1], [184, -1], [180, 1], [174.8, -1], [170.7, 1]]) {
    const upper = z > 190
    const caps = facetBatch(), joints = facetBatch(), sill = facetBatch()
    const x = fallsX(z) + bank * fallsWidth(z)
    for (let i = 0; i < (upper ? 12 : 6); i++) {
      const row = Math.floor(i / 4), col = i % 4
      if (row === 0 && (col === 3 || (bank > 0 && col === 0))) continue
      const cx = x + bank * (row - 1) * (upper ? 0.72 : 0.83)
      const cz = z + (col - 1.5 + (row % 2) * 0.5) * (upper ? 0.836 : 0.67)
      const bed = groundHeight(cx, cz)
      const crest = upper
        ? fallsY(z) + 0.28 + 0.25 * (cz - z) + row * 0.20 + random() * 0.19
        : Math.max(bed, fallsY(cz)) + 0.12 + row * 0.09 + random() * 0.30
      const foot: Corner[] = [], wet: Corner[] = [], crown: Corner[] = []
      const count = upper ? 6 : 5, turn = upper ? 0 : 0.26
      for (let k = 0; k < count; k++) {
        const a = turn + k * 2 * Math.PI / count
        const r = upper ? 0.486 : 0.51 + random() * 0.06
        const dx = r * Math.cos(a) * (upper ? 1 : 2.2), dz = r * Math.sin(a) * (upper ? 1 : 0.92)
        const px = cx + dx, pz = cz + dz
        const lip = crest + 0.10 * dx + (upper ? 0.14 : 0.28) * dz
        crown.push([px, lip, pz])
        wet.push([px + 0.025 * bank, Math.min(lip - 0.045, fallsY(pz) + 0.10), pz])
        foot.push([px + 0.07 * bank, Math.min(bed, groundHeight(px, pz), fallsY(pz)) - 0.35, pz])
      }
      caps.face(crown, 0.85 + random() * 0.14)
      for (let k = 0; k < count; k++) {
        const j = (k + 1) % count
        const shade = 0.76 + random() * 0.21
        joints.face([foot[k], foot[j], wet[j], wet[k]], shade * 0.72)
        joints.face([wet[k], wet[j], crown[j], crown[k]], shade)
      }
    }
    if (upper) {
      // The continuous bank shows the joint network in plan. At its
      // fractured edge each exposed column has a single broken top.
      const shelfY = fallsY(z) + 0.88
      const rim: Corner[] = [[0.28, -0.82], [0.91, -1.14], [1.65, -0.76], [2.1, 0.24], [1.43, 1.11], [0.47, 0.95]]
        .map(([across, along]) => [x + bank * across, shelfY + along * 0.17 + across * 0.10, z + along])
      if (bank < 0) rim.reverse()
      sill.face(rim, 0.97)
      const foot = rim.map(([x, y, z]): Corner => [x, Math.min(y, groundHeight(x, z)) - 0.20, z])
      for (let i = 0; i < rim.length; i++) {
        const j = (i + 1) % rim.length
        joints.face([foot[i], foot[j], rim[j], rim[i]], 0.85)
      }
      sill.mesh(meshes, 'Tarnstep jointed sill', basalt)
    }
    caps.mesh(meshes, 'Tarnstep broken ledge tops', upper ? sides : slate)
    joints.mesh(meshes, 'Tarnstep exposed joint faces', upper ? sides : slate)
  }
}
