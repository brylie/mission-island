import { VertexBuffer } from '@babylonjs/core/Buffers/buffer'
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { shopHats, type StockId } from '../wardrobe-stock'
import { sweptDetail, type SweepPoint } from './crew-shapes'
import { marketCrownProfiles, marketCrownSides, marketHatDetails } from './geometry/market-headwear'
import type { HatSection } from './geometry/shop-headwear'
import { tailored, type Section } from './shop-tailoring'

interface HatPalette {
  color: string
  trim: string
  detail: string
}

export function renderHatCrown(m: MeshFactory, root: TransformNode, name: string, palette: HatPalette, profile: readonly HatSection[], sides: number) {
  const rows = profile.map(([y, x, z, width, depth, pigment]): Section =>
    pigment ? [y, x, z, width, depth, palette[pigment]] : [y, x, z, width, depth])
  return tailored(m, root, name, palette.color, rows, sides)
}

const positionComponents = 3
const depthComponent = 2

export function fitMarketHat(m: MeshFactory, root: TransformNode, id: StockId<'hat'>, color: string) {
  const { name, trim, detail } = shopHats[id]
  switch (id) {
    case 'picnic-boater': {
      const { knot, tails, normal, sides } = marketHatDetails.picnicBoater.ribbon
      for (const side of [-1, 1]) {
        const path = [knot, ...tails.map(([x, y, z, width, thickness]): SweepPoint => [side * x, y, z, width, thickness])]
        sweptDetail(m, root, 'Boater ribbon tails', trim, path, normal, sides)
      }
      break
    }
    case 'bramble-beret': {
      const { path, normal, sides } = marketHatDetails.brambleBeret.stalk
      sweptDetail(m, root, 'Beret stalk', detail, path, normal, sides)
      break
    }
    case 'dock-flatcap': {
      const { center, size, segments } = marketHatDetails.dockFlatcap.peak
      m.sphere(...center, ...size, detail, root, true, segments)
      break
    }
    case 'fern-felt': {
      const { path, normal, sides } = marketHatDetails.fernFelt.feather
      sweptDetail(m, root, 'Golden felt feather', trim, path, normal, sides)
      break
    }
    case 'rain-brim': break
    default: return false
  }

  const hat = renderHatCrown(m, root, name, { color, trim, detail }, marketCrownProfiles[id], marketCrownSides)
  if (id === 'rain-brim') {
    const { billRows, billSlope } = marketHatDetails.rainBrim
    const pos = hat.getVerticesData(VertexBuffer.PositionKind)!
    const billComponents = billRows * marketCrownSides * positionComponents
    for (let i = 0; i < billComponents; i += positionComponents) pos[i + 1] += pos[i + depthComponent] * billSlope
    hat.setVerticesData(VertexBuffer.PositionKind, pos)
    hat.createNormals(false)
  }
  return true
}
