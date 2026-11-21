import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import type { StockId } from '../wardrobe-stock'
import { applique, panelSurface } from './shop-tailoring'

type Surface = ReturnType<typeof panelSurface>
const strip = [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]]
const shield = [[-.5, .5], [.5, .5], [.47, -.12], [0, -.5], [-.47, -.12]]
const oval = Array.from({ length: 12 }, (_, i) => [.5 * Math.cos(i * Math.PI / 6), .5 * Math.sin(i * Math.PI / 6)])

export function marketLegDetails(m: MeshFactory, root: TransformNode, id: StockId<'trousers'>, x: number, s: number,
  front: Surface, outside: Surface, detail: string, trim: string) {
  function seam(name: string, color: string, offset: number, y: number, width: number, height: number, lean = 0) {
    applique(m, root, name, color, strip, (u, v) => front([x + offset + u * width + v * lean, y + v * height, .14]), [0, 0, 1])
  }
  switch (id) {
    case 'oat-culottes':
      seam('Linen box pleat', detail, s * .046, -.141, .012, .182, s * .015)
      seam('Pleat highlight', trim, s * .057, -.141, .007, .182, s * .015)
      break
    case 'plum-pleats':
      for (const dx of [-.032, .018]) seam('Pressed front crease', detail, dx, -.225, .011, .347, s * .014)
      break
    case 'rail-denim':
      for (const dx of [-.069, -.024, .021, .066]) seam('Engineer stripe', trim, dx, -.244, .009, .344)
      break
    case 'fern-shorts':
      applique(m, root, 'Map pocket', detail, shield, (u, v) => outside([x + s * .13, -.124 + v * .103, .007 + u * .138]), [s, 0, 0])
      applique(m, root, 'Pocket pencil loop', trim, strip, (u, v) => front([x + s * .057 + u * .020, -.092 + v * .069, .13]), [0, 0, 1])
      break
    case 'night-flares':
      for (const y of [-.379, -.407]) {
        applique(m, root, 'Hem braid', trim, strip, (u, v) => front([x + u * .167, y + v * .012 + Math.abs(u) * .038, .135]), [0, 0, 1])
      }
      break
    default: return false
  }
  return true
}

export function marketShoeDetails(m: MeshFactory, root: TransformNode, id: StockId<'shoes'>, x: number, s: number,
  vamp: Surface, shaft: Surface, detail: string, trim: string) {
  function top(name: string, color: string, shape: number[][], dx: number, z: number, w: number, d: number, tilt = 0) {
    applique(m, root, name, color, shape, (u, v) => vamp([x + dx + u * w, -.57, z + v * d + u * tilt]), [0, 1, 0])
  }
  function side(name: string, color: string, shape: number[][], y: number, z: number, w: number, h: number) {
    applique(m, root, name, color, shape, (u, v) => shaft([x + s * .12, y + v * h, z + u * w]), [s, 0, 0])
  }
  switch (id) {
    case 'ribbon-flats':
      for (const sign of [-1, 1]) top('Ribbon loop', trim, shield, sign * .036, .133, .069, .056, sign * .030)
      top('Ribbon knot', detail, oval, 0, .133, .032, .032)
      break
    case 'penny-loafers':
      top('Saddle strap', detail, strip, 0, .129, .188, .040)
      top('Brass penny', trim, oval, 0, .159, .043, .020)
      break
    case 'quay-sneakers':
      for (const z of [.124, .154]) top('Canvas lace', trim, strip, 0, z, .119, .009)
      top('Rubber toe guard', trim, oval, 0, .203, .155, .037)
      break
    case 'bracken-hikers':
      for (const z of [.142, .169]) for (const sign of [-1, 1]) {
        top('Cross lace', trim, strip, sign * .029, z, .057, .009, sign * .026)
      }
      side('Leather ankle guard', detail, shield, -.466, .016, .103, .085)
      break
    case 'puddle-wellies':
      side('Rubber maker stamp', detail, oval, -.400, .018, .075, .071)
      top('Rubber toe cap', trim, oval, 0, .193, .162, .047)
      break
    default: return false
  }
  return true
}
