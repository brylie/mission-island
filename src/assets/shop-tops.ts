import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { shopTops, type StockId } from '../wardrobe-stock'
import { sweptDetail } from './crew-shapes'
import { applique, panelSurface, tailored, type Section } from './shop-tailoring'

import { marketTopDetails } from './shop-market-tops'
import { checkRows, printGingham } from './shop-textiles'

const diamond = [[0, 0.5], [-0.36, 0], [0, -0.5], [0.36, 0]]
const leaf = [[0, 0.53], [-0.35, 0.19], [-0.39, -0.12], [-0.19, -0.40], [0, -0.52], [0.31, -0.15], [0.34, 0.14]]
const star = Array.from({ length: 10 }, (_, i) => {
  const a = i * Math.PI / 5 + Math.PI / 2, r = i % 2 ? 0.23 : 0.5
  return [r * Math.cos(a), r * Math.sin(a)]
})

function cutTop(m: MeshFactory, id: StockId<'shirt'>, root: TransformNode, dye?: string) {
  const { color, trim, detail } = shopTops[id]
  const coat = id === 'squid-coat' || id === 'dock-jacket', stripe = id === 'beacon-top', vest = shopTops[id].sleeveless
  const hem = coat ? 0.719 : 0.778
  const rows: Section[] = [
    [hem, 0, 0.002, coat ? 0.311 : 0.281, 0.193, detail],
    [hem + 0.010, 0, 0.002, coat ? 0.313 : 0.287, 0.199, detail],
    [hem + 0.044, 0, 0, coat ? 0.309 : 0.288, 0.200, detail],
    [hem + 0.048, 0, 0, coat ? 0.308 : 0.289, 0.201],
    [0.891, 0, -0.002, 0.284, 0.191],
    [0.928, 0, -0.004, 0.274, 0.184, stripe ? trim : undefined],
    [0.963, 0, -0.006, 0.272, 0.185, stripe ? trim : undefined],
    [0.968, 0, -0.006, 0.272, 0.185],
    [1.022, 0, -0.008, 0.276, 0.189],
    [1.027, 0, -0.008, 0.276, 0.189, stripe ? trim : undefined],
    [1.058, 0, -0.010, 0.279, 0.192, stripe ? trim : undefined],
    [1.063, 0, -0.010, 0.279, 0.192],
    [1.160, 0, -0.012, 0.291, 0.182],
    [1.213, 0, -0.010, vest ? 0.260 : 0.286, 0.166],
    [1.252, 0, -0.008, vest ? 0.200 : 0.240, 0.146],
    [1.267, 0, 0.001, 0.158, 0.122, detail],
    [1.282, 0, 0.001, 0.134, 0.114, detail],
  ]
  const gingham = id === 'picnic-check'
  const fabric = tailored(m, root, shopTops[id].name, dye ?? color, gingham ? checkRows(rows) : rows, 32, 0.056)
  if (gingham) printGingham(fabric, trim)
  return fabric
}

export function buildTopBody(m: MeshFactory, id: StockId<'shirt'>, root: TransformNode, dye?: string) {
  const { trim, detail } = shopTops[id]
  const fabric = cutTop(m, id, root, dye)
  const front = panelSurface(fabric, 2, 1), back = panelSurface(fabric, 2, -1)
  const surface = (x: number, y: number, side: number) => (side > 0 ? front : back)([x, y, side * 0.16])
  function patch(name: string, tint: string, outline: number[][], x: number, y: number, w: number, h: number, side = 1, tilt = 0, lift = 0) {
    applique(m, root, name, tint, outline, (u, v) => {
      const point = surface(x + u * w + v * tilt, y + v * h, side)
      point[2] += side * lift
      return point
    }, [0, 0, side])
  }
  if (marketTopDetails(id, trim, detail, patch)) return
  if (id === 'star-knit') {
    const constellation = [[-0.154, 1.142], [-0.080, 1.095], [0.008, 1.144], [0.127, 1.117]]
    for (const [i, [x, y]] of constellation.entries()) {
      patch('Star stitch', trim, star, x, y, i === 2 ? 0.069 : 0.043, i === 2 ? 0.069 : 0.043)
      if (i) {
        const [px, py] = constellation[i - 1]
        const path: Parameters<typeof sweptDetail>[4] = [0, 0.5, 1].map((t) => {
          const [a, b, c] = surface(px + (x - px) * t, py + (y - py) * t, 1)
          return [a, b, c, 0.002, 0.0015]
        })
        sweptDetail(m, root, 'Chart stitch', detail, path, [0, 0, 1], 6)
      }
    }
    patch('North star', trim, star, 0, 1.167, 0.074, 0.074, -1)
  }
  else if (id === 'squid-coat') {
    for (const s of [-1, 1]) {
      patch('Oilskin collar', detail, [[-0.46, 0.40], [0.21, 0.50], [0.49, -0.23], [0.10, -0.50], [-0.36, -0.02]], s * 0.102, 1.235, s * 0.142, 0.088, 1, -s * 0.048)
      for (const y of [0.910, 1.032, 1.148]) {
        const [x, h, z] = surface(s * 0.065, y, 1)
        m.sphere(x, h, z, 0.030, 0.031, 0.012, trim, root, false, 10)
      }
      patch('Storm flap', detail, [[-0.5, 0.5], [0.5, 0.5], [0.5, -0.17], [0, -0.5], [-0.5, -0.17]], s * 0.101, 1.153, 0.192, 0.083, -1)
      patch('Pocket welt', detail, [[-0.5, 0.5], [0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]], s * 0.160, 0.877, 0.089, 0.011, 1, s * 0.026)
    }
  }
  else if (id === 'kelp-vest') {
    for (const s of [-1, 1]) {
      patch('Kelp quilting', detail, leaf, s * 0.110, 1.047, 0.121, 0.236, -1, s * 0.077)
      patch('Leaf welt pocket', trim, leaf, s * 0.136, 0.922, 0.075, 0.113, 1, s * 0.036)
    }
    patch('Bound opening', detail, [[-0.5, 0.5], [0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]], 0, 1.01, 0.018, 0.342)
  }
  else if (id === 'fox-knit') {
    patch('Fox mask stitch', detail, [[-0.50, 0.50], [-0.17, 0.30], [0.16, 0.30], [0.50, 0.50], [0.42, -0.14], [0, -0.5], [-0.42, -0.14]], -0.095, 1.116, 0.126, 0.112)
    patch('Ivory muzzle', trim, diamond, -0.095, 1.102, 0.085, 0.037)
    patch('Fox brush', detail, leaf, 0.010, 1.030, 0.140, 0.226, -1, 0.116)
    patch('Brush tip', trim, diamond, 0.065, 1.117, 0.067, 0.051, -1)
  }
  else {
    patch('Beacon pennant', detail, [[-0.5, 0.5], [0.5, 0.22], [-0.5, -0.5]], -0.132, 1.151, 0.076, 0.054)
  }
}

export function buildSleeve(m: MeshFactory, id: StockId<'shirt'>, root: TransformNode, s: number, dye?: string) {
  const { color, detail, trim } = shopTops[id], cuff = id === 'beacon-top' || id === 'fox-knit' ? trim : detail
  tailored(m, root, 'Set-in sleeve', dye ?? color, [
    [-0.459, s * 0.090, -0.001, 0.069, 0.077, cuff],
    [-0.452, s * 0.091, -0.002, 0.077, 0.083, cuff],
    [-0.396, s * 0.080, -0.007, 0.079, 0.089, cuff],
    [-0.391, s * 0.079, -0.008, 0.084, 0.092],
    [-0.287, s * 0.053, -0.015, 0.087, 0.097],
    [-0.185, s * 0.032, -0.019, 0.099, 0.105],
    [-0.090, -s * 0.009, -0.030, 0.105, 0.122],
    [-0.009, -s * 0.045, -0.034, 0.107, 0.124],
    [0.040, -s * 0.086, -0.030, 0.092, 0.104],
    [0.071, -s * 0.149, -0.028, 0.047, 0.057],
  ])
}
