import type { MeshFactory } from '../island-meshes'
import { seededRandom } from '../seeded-random'
import { facetBatch, type Corner } from './stone-facets'

type FallTerrain = {
  fallsX: (z: number) => number
  fallsWidth: (z: number) => number
  fallsY: (z: number) => number
  groundHeight: (x: number, z: number) => number
}

export function createRockLedges(meshes: MeshFactory, ledges: readonly { z: number, bank: -1 | 1, upper: boolean }[], { fallsX, fallsWidth, fallsY, groundHeight }: FallTerrain) {
  const basalt = meshes.paintRecipe('columnar-basalt'), slate = meshes.paintRecipe('slate')
  const sides = meshes.paintSurface('stone', '#495457')
  const random = seededRandom(2193)
  for (const { z, bank, upper } of ledges) {
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
