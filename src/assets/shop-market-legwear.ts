import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import type { StockId } from '../wardrobe-stock'
import { applique, panelSurface } from './shop-tailoring'

type Surface = ReturnType<typeof panelSurface>
const strip = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]
const shield = [[-0.5, 0.5], [0.5, 0.5], [0.47, -0.12], [0, -0.5], [-0.47, -0.12]]
const oval = Array.from({ length: 12 }, (_, i) => [0.5 * Math.cos(i * Math.PI / 6), 0.5 * Math.sin(i * Math.PI / 6)])

export function marketLegDetails(m: MeshFactory, root: TransformNode, id: StockId<'trousers'>, x: number, s: number, front: Surface, outside: Surface, detail: string, trim: string) {
  function seam(name: string, color: string, offset: number, y: number, width: number, height: number, lean = 0) {
    applique(m, root, name, color, strip, (u, v) => front([x + offset + u * width + v * lean, y + v * height, 0.14]), [0, 0, 1])
  }
  switch (id) {
    case 'oat-culottes':
      seam('Linen box pleat', detail, s * 0.046, -0.141, 0.012, 0.182, s * 0.015)
      seam('Pleat highlight', trim, s * 0.057, -0.141, 0.007, 0.182, s * 0.015)
      break
    case 'plum-pleats':
      for (const dx of [-0.032, 0.018]) seam('Pressed front crease', detail, dx, -0.225, 0.011, 0.347, s * 0.014)
      break
    case 'rail-denim':
      for (const dx of [-0.069, -0.024, 0.021, 0.066]) seam('Engineer stripe', trim, dx, -0.244, 0.009, 0.344)
      break
    case 'fern-shorts':
      applique(m, root, 'Map pocket', detail, shield, (u, v) => outside([x + s * 0.13, -0.124 + v * 0.103, 0.007 + u * 0.138]), [s, 0, 0])
      applique(m, root, 'Pocket pencil loop', trim, strip, (u, v) => front([x + s * 0.057 + u * 0.020, -0.092 + v * 0.069, 0.13]), [0, 0, 1])
      break
    case 'night-flares':
      for (const y of [-0.379, -0.407]) {
        applique(m, root, 'Hem braid', trim, strip, (u, v) => front([x + u * 0.167, y + v * 0.012 + Math.abs(u) * 0.038, 0.135]), [0, 0, 1])
      }
      break
    default: return false
  }
  return true
}

export function marketShoeDetails(m: MeshFactory, root: TransformNode, id: StockId<'shoes'>, x: number, s: number, vamp: Surface, shaft: Surface, detail: string, trim: string) {
  function top(name: string, color: string, shape: number[][], dx: number, z: number, w: number, d: number, tilt = 0) {
    applique(m, root, name, color, shape, (u, v) => vamp([x + dx + u * w, -0.57, z + v * d + u * tilt]), [0, 1, 0])
  }
  function side(name: string, color: string, shape: number[][], y: number, z: number, w: number, h: number) {
    applique(m, root, name, color, shape, (u, v) => shaft([x + s * 0.12, y + v * h, z + u * w]), [s, 0, 0])
  }
  switch (id) {
    case 'ribbon-flats':
      for (const sign of [-1, 1]) top('Ribbon loop', trim, shield, sign * 0.036, 0.133, 0.069, 0.056, sign * 0.030)
      top('Ribbon knot', detail, oval, 0, 0.133, 0.032, 0.032)
      break
    case 'penny-loafers':
      top('Saddle strap', detail, strip, 0, 0.129, 0.188, 0.040)
      top('Brass penny', trim, oval, 0, 0.159, 0.043, 0.020)
      break
    case 'quay-sneakers':
      for (const z of [0.124, 0.154]) top('Canvas lace', trim, strip, 0, z, 0.119, 0.009)
      top('Rubber toe guard', trim, oval, 0, 0.203, 0.155, 0.037)
      break
    case 'bracken-hikers':
      for (const z of [0.142, 0.169]) for (const sign of [-1, 1]) {
        top('Cross lace', trim, strip, sign * 0.029, z, 0.057, 0.009, sign * 0.026)
      }
      side('Leather ankle guard', detail, shield, -0.466, 0.016, 0.103, 0.085)
      break
    case 'puddle-wellies':
      side('Rubber maker stamp', detail, oval, -0.400, 0.018, 0.075, 0.071)
      top('Rubber toe cap', trim, oval, 0, 0.193, 0.162, 0.047)
      break
    default: return false
  }
  return true
}
