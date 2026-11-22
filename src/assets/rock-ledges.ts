import type { MeshFactory } from '../island-meshes'
import { seededRandom } from '../seeded-random'
import { rockLedgeGeometry } from './geometry/rock-ledges'
import { facetBatch, type Corner } from './stone-facets'

type FallTerrain = {
  fallsX: (z: number) => number
  fallsWidth: (z: number) => number
  fallsY: (z: number) => number
  groundHeight: (x: number, z: number) => number
}

const fullTurn = Math.PI + Math.PI

export function createRockLedges(meshes: MeshFactory, ledges: readonly { z: number, bank: -1 | 1, upper: boolean }[], { fallsX, fallsWidth, fallsY, groundHeight }: FallTerrain) {
  const { seed, columnsPerRow, rowStagger, centreColumn, upper: high, lower: low, face, shelf } = rockLedgeGeometry
  const basalt = meshes.paintRecipe('columnar-basalt'), slate = meshes.paintRecipe('slate')
  const sides = meshes.paintSurface('stone', face.color)
  const random = seededRandom(seed)
  for (const { z, bank, upper } of ledges) {
    const caps = facetBatch(), joints = facetBatch(), sill = facetBatch()
    const x = fallsX(z) + bank * fallsWidth(z)
    const profile = upper ? high : low
    for (let i = 0; i < profile.stones; i++) {
      const row = Math.floor(i / columnsPerRow), col = i % columnsPerRow
      if (row === 0 && (col === columnsPerRow - 1 || (bank > 0 && col === 0))) continue
      const cx = x + bank * (row - 1) * profile.acrossSpacing
      const cz = z + (col - centreColumn + (row % rowStagger.period) * rowStagger.columnOffset) * profile.alongSpacing
      const bed = groundHeight(cx, cz)
      const crest = upper
        ? fallsY(z) + high.aboveFalls + high.alongRise * (cz - z) + row * profile.rowRise + random() * profile.crestVariation
        : Math.max(bed, fallsY(cz)) + low.aboveBed + row * profile.rowRise + random() * profile.crestVariation
      const foot: Corner[] = [], wet: Corner[] = [], crown: Corner[] = []
      const { sides: count, turn } = profile
      for (let k = 0; k < count; k++) {
        const a = turn + k * fullTurn / count
        const r = upper ? high.radius : low.radius + random() * low.radiusVariation
        const dx = r * Math.cos(a) * (upper ? 1 : low.widthScale), dz = r * Math.sin(a) * (upper ? 1 : low.depthScale)
        const px = cx + dx, pz = cz + dz
        const lip = crest + face.acrossSlope * dx + profile.lipSlope * dz
        crown.push([px, lip, pz])
        wet.push([px + face.wetOffset * bank, Math.min(lip - face.wetBelowLip, fallsY(pz) + face.wetAboveFalls), pz])
        foot.push([px + face.footOffset * bank, Math.min(bed, groundHeight(px, pz), fallsY(pz)) - face.embedDepth, pz])
      }
      caps.face(crown, face.capShade + random() * face.capVariation)
      for (let k = 0; k < count; k++) {
        const j = (k + 1) % count
        const shade = face.jointShade + random() * face.jointVariation
        joints.face([foot[k], foot[j], wet[j], wet[k]], shade * face.submergedShade)
        joints.face([wet[k], wet[j], crown[j], crown[k]], shade)
      }
    }
    if (upper) {
      // The continuous bank shows the joint network in plan. At its
      // fractured edge each exposed column has a single broken top.
      const shelfY = fallsY(z) + shelf.crest
      const rim: Corner[] = shelf.rim
        .map(([across, along]) => [x + bank * across, shelfY + along * shelf.alongRise + across * shelf.acrossRise, z + along])
      if (bank < 0) rim.reverse()
      sill.face(rim, shelf.shade)
      const foot = rim.map(([x, y, z]): Corner => [x, Math.min(y, groundHeight(x, z)) - shelf.embedDepth, z])
      for (let i = 0; i < rim.length; i++) {
        const j = (i + 1) % rim.length
        joints.face([foot[i], foot[j], rim[j], rim[i]], shelf.jointShade)
      }
      sill.mesh(meshes, 'Tarnstep jointed sill', basalt)
    }
    caps.mesh(meshes, 'Tarnstep broken ledge tops', upper ? sides : slate)
    joints.mesh(meshes, 'Tarnstep exposed joint faces', upper ? sides : slate)
  }
}
