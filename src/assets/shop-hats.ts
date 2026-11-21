import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { shopHats, type StockId } from '../wardrobe-stock'
import { garment, sweptDetail, type SweepPoint } from './crew-shapes'
import {
  buoyWatchCap,
  buoyWatchDetails,
  gullSkipper,
  gullSkipperDetails,
  jellybellBonnet,
  jellybellDetails,
  moonpoolBucket,
  moonpoolCrescent,
  reedCrownGeometry,
} from './geometry/shop-headwear'
import { fitMarketHat, renderHatCrown } from './shop-millinery'

const halfTurnsPerTurn = 2
const positionComponents = 3
const depthComponent = 2
const rgbComponents = 3
const rgbaComponents = 4
const ribAlternation = 2

function buildReedCrown(m: MeshFactory, root: TransformNode, color: string, trim: string, detail: string) {
  const { wreath, blade } = reedCrownGeometry
  // Two woven rushes wind around an open center. The wearer's hair shows through.
  const samples = wreath.samplesPerHalfTurn * halfTurnsPerTurn
  for (const phase of wreath.phases) {
    const path: SweepPoint[] = []
    for (let i = 0; i <= samples; i++) {
      const a = i * Math.PI / wreath.samplesPerHalfTurn
      path.push([wreath.width * Math.cos(a), wreath.height + wreath.weaveLift * Math.sin(wreath.twists * a + phase), wreath.depth * Math.sin(a), wreath.rushWidth, wreath.rushThickness])
    }
    sweptDetail(m, root, 'Woven rush', phase ? detail : color, path, wreath.normal, wreath.sides)
  }
  for (let i = 0; i < blade.count; i++) {
    const a = i * halfTurnsPerTurn * Math.PI / blade.count
    const x = Math.cos(a), z = Math.sin(a)
    const variant = i % blade.heightVariants
    const h = blade.baseLift + blade.variantLift * variant
    const [rootX, rootY, rootZ, rootWidth, rootThickness] = blade.root
    const [shoulderX, shoulderY, shoulderZ, shoulderWidth, shoulderThickness] = blade.shoulder
    const [foldX, foldY, foldZ, foldWidth, foldThickness] = blade.fold.point
    const [tipX, tipY, tipZ, tipWidth, tipThickness] = blade.tip.point
    sweptDetail(m, root, 'Folded reed blade', variant ? color : trim, [
      [rootX * x, rootY, rootZ * z, rootWidth, rootThickness],
      [shoulderX * x, shoulderY, shoulderZ * z, shoulderWidth, shoulderThickness],
      [foldX * x - blade.fold.tangent * z, foldY + h * blade.fold.liftRatio, foldZ * z + blade.fold.tangent * x, foldWidth, foldThickness],
      [tipX * x - blade.tip.tangent * z, tipY + h, tipZ * z + blade.tip.tangent * x, tipWidth, tipThickness],
    ], [x, blade.outwardRise, z], blade.sides)
  }
}

export function buildHat(m: MeshFactory, id: StockId<'hat'>, root: TransformNode, dye?: string) {
  const { color: baseColor, trim, detail } = shopHats[id]
  const color = dye ?? baseColor
  if (fitMarketHat(m, root, id, color)) return
  const palette = { color, trim, detail }
  if (id === 'reed-crown') {
    buildReedCrown(m, root, color, trim, detail)
  }
  else if (id === 'moon-hat') {
    const { name, profile, sides } = moonpoolBucket
    renderHatCrown(m, root, name, palette, profile, sides)
    sweptDetail(m, root, 'Embroidered crescent', trim, moonpoolCrescent.path, moonpoolCrescent.normal)
  }
  else if (id === 'gull-cap') {
    const { name, profile, sides } = gullSkipper
    renderHatCrown(m, root, name, palette, profile, sides)
    const { peak, wing } = gullSkipperDetails
    m.sphere(...peak.center, ...peak.size, detail, root, true, peak.segments).rotation.x = peak.rake
    for (const side of [-1, 1]) {
      const path = [wing.inner, ...wing.sweep.map(([x, y, z, width, thickness]): SweepPoint => [side * x, y, z, width, thickness])]
      sweptDetail(m, root, 'Gull wing embroidery', detail, path, wing.normal)
    }
  }
  else if (id === 'jelly-hat') {
    const { name, profile, sides } = jellybellBonnet
    const bell = renderHatCrown(m, root, name, palette, profile, sides)
    const { scallops, bow } = jellybellDetails
    // Shape the hem and crown into broad scallops with one uninterrupted edge.
    const pos = bell.getVerticesData(VertexBuffer.PositionKind)!
    for (let i = 0; i < pos.length; i += positionComponents) {
      const a = Math.atan2(pos[i + depthComponent] / scallops.radiusZ, pos[i] / scallops.radiusX)
      pos[i + 1] += scallops.lift * Math.cos(scallops.count * a) * Math.max(0, 1 - (pos[i + 1] - scallops.fadeFromY) / scallops.fadeHeight)
    }
    bell.setVerticesData(VertexBuffer.PositionKind, pos)
    bell.createNormals(false)
    // A sewn bow ties the scalloped brim just behind the left ear.
    for (const side of [-1, 1]) {
      const loops = bow.loops.map(({ point: [x, y, z, width, thickness], sideX, sideZ }): SweepPoint =>
        [x + side * sideX, y, z - side * sideZ, width, thickness])
      sweptDetail(m, root, 'Bonnet bow', trim, [bow.start, ...loops, bow.end], bow.normal, bow.sides)
    }
  }
  else {
    const { name, profile, sides } = buoyWatchCap
    const watchCap = renderHatCrown(m, root, name, palette, profile, sides)
    const { ribbing, pom } = buoyWatchDetails
    const pigments = watchCap.getVerticesData(VertexBuffer.ColorKind)!
    for (let i = 0; i < sides * ribbing.rows; i++) {
      const rib = i % ribAlternation ? ribbing.dark : ribbing.light
      for (let channel = 0; channel < rgbComponents; channel++) pigments[rgbaComponents * i + channel] *= rib
    }
    watchCap.setVerticesData(VertexBuffer.ColorKind, pigments)
    garment(m, root, 'Yarn pom', trim, pom.profile, pom.softness, pom.sides)
  }
}
