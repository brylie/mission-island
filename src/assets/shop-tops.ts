import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { shopTops, type StockId } from '../wardrobe-stock'
import { sweptDetail } from './crew-shapes'
import { applique, panelSurface, tailored, type Section } from './shop-tailoring'

import { marketTopDetails } from './shop-market-tops'
import { checkRows, printGingham } from './shop-textiles'

const diamond = [[0, .5], [-.36, 0], [0, -.5], [.36, 0]]
const leaf = [[0, .53], [-.35, .19], [-.39, -.12], [-.19, -.40], [0, -.52], [.31, -.15], [.34, .14]]
const star = Array.from({ length: 10 }, (_, i) => {
  const a = i * Math.PI / 5 + Math.PI / 2, r = i % 2 ? .23 : .5
  return [r * Math.cos(a), r * Math.sin(a)]
})

function cutTop(m: MeshFactory, id: StockId<'shirt'>, root: TransformNode, dye?: string) {
  const { color, trim, detail } = shopTops[id]
  const coat = id === 'squid-coat' || id === 'dock-jacket', stripe = id === 'beacon-top', vest = shopTops[id].sleeveless
  const hem = coat ? .719 : .778
  const rows: Section[] = [
    [hem, 0, .002, coat ? .311 : .281, .193, detail], [hem + .010, 0, .002, coat ? .313 : .287, .199, detail],
    [hem + .044, 0, 0, coat ? .309 : .288, .200, detail], [hem + .048, 0, 0, coat ? .308 : .289, .201],
    [.891, 0, -.002, .284, .191], [.928, 0, -.004, .274, .184, stripe ? trim : undefined],
    [.963, 0, -.006, .272, .185, stripe ? trim : undefined], [.968, 0, -.006, .272, .185],
    [1.022, 0, -.008, .276, .189], [1.027, 0, -.008, .276, .189, stripe ? trim : undefined],
    [1.058, 0, -.010, .279, .192, stripe ? trim : undefined], [1.063, 0, -.010, .279, .192],
    [1.160, 0, -.012, .291, .182], [1.213, 0, -.010, vest ? .260 : .286, .166],
    [1.252, 0, -.008, vest ? .200 : .240, .146], [1.267, 0, .001, .158, .122, detail],
    [1.282, 0, .001, .134, .114, detail],
  ]
  const gingham = id === 'picnic-check'
  const fabric = tailored(m, root, shopTops[id].name, dye ?? color, gingham ? checkRows(rows) : rows, 32, .056)
  if (gingham) printGingham(fabric, trim)
  return fabric
}

export function buildTopBody(m: MeshFactory, id: StockId<'shirt'>, root: TransformNode, dye?: string) {
  const { trim, detail } = shopTops[id]
  const fabric = cutTop(m, id, root, dye)
  const front = panelSurface(fabric, 2, 1), back = panelSurface(fabric, 2, -1)
  const surface = (x: number, y: number, side: number) => (side > 0 ? front : back)([x, y, side * .16])
  function patch(name: string, tint: string, outline: number[][], x: number, y: number, w: number, h: number, side = 1, tilt = 0, lift = 0) {
    applique(m, root, name, tint, outline, (u, v) => {
      const point = surface(x + u * w + v * tilt, y + v * h, side)
      point[2] += side * lift
      return point
    }, [0, 0, side])
  }
  if (marketTopDetails(id, trim, detail, patch)) return
  if (id === 'star-knit') {
    const constellation = [[-.154, 1.142], [-.080, 1.095], [.008, 1.144], [.127, 1.117]]
    for (const [i, [x, y]] of constellation.entries()) {
      patch('Star stitch', trim, star, x, y, i === 2 ? .069 : .043, i === 2 ? .069 : .043)
      if (i) {
        const [px, py] = constellation[i - 1]
        const path: Parameters<typeof sweptDetail>[4] = [0, .5, 1].map(t => {
          const [a, b, c] = surface(px + (x - px) * t, py + (y - py) * t, 1)
          return [a, b, c, .002, .0015]
        })
        sweptDetail(m, root, 'Chart stitch', detail, path, [0, 0, 1], 6)
      }
    }
    patch('North star', trim, star, 0, 1.167, .074, .074, -1)
  } else if (id === 'squid-coat') {
    for (const s of [-1, 1]) {
      patch('Oilskin collar', detail, [[-.46, .40], [.21, .50], [.49, -.23], [.10, -.50], [-.36, -.02]], s * .102, 1.235, s * .142, .088, 1, -s * .048)
      for (const y of [.910, 1.032, 1.148]) {
        const [x, h, z] = surface(s * .065, y, 1)
        m.sphere(x, h, z, .030, .031, .012, trim, root, false, 10)
      }
      patch('Storm flap', detail, [[-.5, .5], [.5, .5], [.5, -.17], [0, -.5], [-.5, -.17]], s * .101, 1.153, .192, .083, -1)
      patch('Pocket welt', detail, [[-.5, .5], [.5, .5], [.5, -.5], [-.5, -.5]], s * .160, .877, .089, .011, 1, s * .026)
    }
  } else if (id === 'kelp-vest') {
    for (const s of [-1, 1]) {
      patch('Kelp quilting', detail, leaf, s * .110, 1.047, .121, .236, -1, s * .077)
      patch('Leaf welt pocket', trim, leaf, s * .136, .922, .075, .113, 1, s * .036)
    }
    patch('Bound opening', detail, [[-.5, .5], [.5, .5], [.5, -.5], [-.5, -.5]], 0, 1.01, .018, .342)
  } else if (id === 'fox-knit') {
    patch('Fox mask stitch', detail, [[-.50, .50], [-.17, .30], [.16, .30], [.50, .50], [.42, -.14], [0, -.5], [-.42, -.14]],
      -.095, 1.116, .126, .112)
    patch('Ivory muzzle', trim, diamond, -.095, 1.102, .085, .037)
    patch('Fox brush', detail, leaf, .010, 1.030, .140, .226, -1, .116)
    patch('Brush tip', trim, diamond, .065, 1.117, .067, .051, -1)
  } else {
    patch('Beacon pennant', detail, [[-.5, .5], [.5, .22], [-.5, -.5]], -.132, 1.151, .076, .054)
  }
}

export function buildSleeve(m: MeshFactory, id: StockId<'shirt'>, root: TransformNode, s: number, dye?: string) {
  const { color, detail, trim } = shopTops[id], cuff = id === 'beacon-top' || id === 'fox-knit' ? trim : detail
  tailored(m, root, 'Set-in sleeve', dye ?? color, [
    [-.459, s * .090, -.001, .069, .077, cuff], [-.452, s * .091, -.002, .077, .083, cuff],
    [-.396, s * .080, -.007, .079, .089, cuff], [-.391, s * .079, -.008, .084, .092],
    [-.287, s * .053, -.015, .087, .097], [-.185, s * .032, -.019, .099, .105],
    [-.090, -s * .009, -.030, .105, .122], [-.009, -s * .045, -.034, .107, .124],
    [.040, -s * .086, -.030, .092, .104], [.071, -s * .149, -.028, .047, .057],
  ])
}
