import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import type { Ore } from '../ore-contracts'
import { seededRandom } from '../seeded-random'
import { haulerSpec } from './ore-hauler'
import { facetBatch, type Corner } from './stone-facets'
import { oreStockpileProfiles } from './stockpile-profile'

type Position = { x: number, y: number, z: number }

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
  const pile = oreStockpileProfiles[ore]
  const random = seededRandom(pile.seed)
  const bed = haulerSpec.cargo
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
  return batch.mesh(meshes, ore + ' truck load', meshes.paintRecipe(ore), parent)
}

export function createOreHopper(meshes: MeshFactory, { x: cx, y: floor, z: cz }: Position) {
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

export function createOreBayDividers(meshes: MeshFactory, placements: readonly Position[]) {
  const wood = meshes.paintSurface('wood', '#817359')
  for (const { x, y: floor, z } of placements) {
    for (let course = 0; course < 2; course++) {
      meshes.box(x, floor + 0.13 + course * 0.25, z + 0.6 + course * 0.38, 0.22, 0.25, 4.4 - course * 0.76, wood)
    }
    for (const postOffset of [-0.1, 2.5]) meshes.box(x - 0.16, floor + 0.32, z + postOffset, 0.14, 0.72, 0.18, '#645e4f')
  }
}

export function createStockpileMeshes(meshes: MeshFactory, id: Ore, point: (angle: number, t: number) => Corner, random: () => number) {
  const { grain, dust, host } = oreStockpileProfiles[id]
  const ore = facetBatch(), waste = facetBatch(), fines = facetBatch()
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
