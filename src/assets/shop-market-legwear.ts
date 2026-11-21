import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import type { StockId } from '../wardrobe-stock'
import { marketShoeTrim, marketTrimOutlines, marketTrouserTrim } from './geometry/shop-market-legwear'
import { applique, panelSurface } from './shop-tailoring'

type Surface = ReturnType<typeof panelSurface>
type Seam = { y: number, width: number, height: number, lean: number }
type VampEmblem = { x: number, z: number, width: number, depth: number, tilt?: number }
type ShaftEmblem = { y: number, z: number, width: number, height: number }

const { strip, shield, oval: ovalProfile } = marketTrimOutlines
const half = 0.5
const semicircleSamples = ovalProfile.samples * half
const oval = Array.from({ length: ovalProfile.samples }, (_, i) => {
  const angle = i * Math.PI / semicircleSamples
  return [ovalProfile.radius * Math.cos(angle), ovalProfile.radius * Math.sin(angle)]
})
const mirrorSides = [-1, 1] as const

export function marketLegDetails(m: MeshFactory, root: TransformNode, id: StockId<'trousers'>, x: number, s: number, front: Surface, outside: Surface, detail: string, trim: string) {
  const { linenPleat, pressedCrease, engineerStripe, fernPocket, pencilLoop, hemBraid, frontSeamZ } = marketTrouserTrim
  function seam(name: string, color: string, { y, width, height, lean }: Seam, offset: number, side = 1) {
    const slant = side * lean
    applique(m, root, name, color, strip, (u, v) => front([x + offset + u * width + v * slant, y + v * height, frontSeamZ]), [0, 0, 1])
  }
  switch (id) {
    case 'oat-culottes':
      seam('Linen box pleat', detail, linenPleat.body, s * linenPleat.body.x, s)
      seam('Pleat highlight', trim, linenPleat.highlight, s * linenPleat.highlight.x, s)
      break
    case 'plum-pleats':
      for (const dx of pressedCrease.x) seam('Pressed front crease', detail, pressedCrease, dx, s)
      break
    case 'rail-denim':
      for (const dx of engineerStripe.x) seam('Engineer stripe', trim, engineerStripe, dx)
      break
    case 'fern-shorts':
      applique(m, root, 'Map pocket', detail, shield, (u, v) => outside([
        x + s * fernPocket.x,
        fernPocket.y + v * fernPocket.height,
        fernPocket.z + u * fernPocket.width,
      ]), [s, 0, 0])
      applique(m, root, 'Pocket pencil loop', trim, strip, (u, v) => front([
        x + s * pencilLoop.x + u * pencilLoop.width,
        pencilLoop.y + v * pencilLoop.height,
        pencilLoop.z,
      ]), [0, 0, 1])
      break
    case 'night-flares':
      for (const y of hemBraid.y) {
        applique(m, root, 'Hem braid', trim, strip, (u, v) =>
          front([x + u * hemBraid.width, y + v * hemBraid.height + Math.abs(u) * hemBraid.lift, hemBraid.z]), [0, 0, 1])
      }
      break
    default: return false
  }
  return true
}

export function marketShoeDetails(m: MeshFactory, root: TransformNode, id: StockId<'shoes'>, x: number, s: number, vamp: Surface, shaft: Surface, detail: string, trim: string) {
  const { vampY, shaftX, ribbon, loafer, sneaker, hiker, wellies } = marketShoeTrim
  function top(name: string, color: string, shape: number[][], { x: dx, z, width, depth, tilt = 0 }: VampEmblem) {
    applique(m, root, name, color, shape, (u, v) => vamp([x + dx + u * width, vampY, z + v * depth + u * tilt]), [0, 1, 0])
  }
  function side(name: string, color: string, shape: number[][], { y, z, width, height }: ShaftEmblem) {
    applique(m, root, name, color, shape, (u, v) => shaft([x + s * shaftX, y + v * height, z + u * width]), [s, 0, 0])
  }
  switch (id) {
    case 'ribbon-flats':
      for (const sign of mirrorSides) {
        top('Ribbon loop', trim, shield, { ...ribbon.loops, x: sign * ribbon.loops.x, tilt: sign * ribbon.loops.tilt })
      }
      top('Ribbon knot', detail, oval, ribbon.knot)
      break
    case 'penny-loafers':
      top('Saddle strap', detail, strip, loafer.saddle)
      top('Brass penny', trim, oval, loafer.penny)
      break
    case 'quay-sneakers':
      for (const z of sneaker.laces.z) top('Canvas lace', trim, strip, { ...sneaker.laces, z })
      top('Rubber toe guard', trim, oval, sneaker.toeGuard)
      break
    case 'bracken-hikers':
      for (const z of hiker.crossLaces.z) for (const sign of mirrorSides) {
        top('Cross lace', trim, strip, { ...hiker.crossLaces, z, x: sign * hiker.crossLaces.x, tilt: sign * hiker.crossLaces.tilt })
      }
      side('Leather ankle guard', detail, shield, hiker.ankleGuard)
      break
    case 'puddle-wellies':
      side('Rubber maker stamp', detail, oval, wellies.stamp)
      top('Rubber toe cap', trim, oval, wellies.toeCap)
      break
    default: return false
  }
  return true
}
