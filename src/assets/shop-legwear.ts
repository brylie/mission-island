import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { shopBottoms, shopShoes, type StockId } from '../wardrobe-stock'
import { sweptDetail } from './crew-shapes'
import { applique, panelSurface, tailored, type Section } from './shop-tailoring'

import { marketLegDetails, marketShoeDetails } from './shop-market-legwear'

const petal = [[0, 0.5], [-0.36, 0.25], [-0.5, -0.05], [-0.31, -0.39], [0, -0.5], [0.32, -0.34], [0.48, 0.04], [0.31, 0.34]]
const pocket = [[-0.48, 0.50], [0.48, 0.50], [0.46, -0.26], [0.28, -0.48], [-0.34, -0.48], [-0.46, -0.32]]

export function buildBottomLeg(m: MeshFactory, id: StockId<'trousers'>, root: TransformNode, s: number) {
  const { color, trim, detail, short } = shopBottoms[id], x = -s * 0.032
  const hem = short ? (id === 'salt-shorts' ? -0.208 : -0.261) : -0.463
  const cloud = id === 'cloud-pants', wide = id === 'tide-cuffs'
  const cuts: Partial<Record<StockId<'trousers'>, number>> = { 'night-flares': 0.161, 'oat-culottes': 0.148, 'plum-pleats': 0.123 }
  const ankle = cuts[id] ?? (wide ? 0.144 : short ? 0.120 : 0.106)
  const rows: Section[] = [
    [hem, x, 0.003, ankle, 0.124, trim],
    [hem + 0.008, x, 0.003, ankle + 0.006, 0.131, trim],
    [hem + 0.034, x, 0.002, ankle + 0.007, 0.132, trim],
    [hem + 0.039, x, 0.001, ankle + 0.007, 0.133],
  ]
  if (!short) rows.push([-0.370, x, -0.003, cloud ? 0.142 : 0.116, cloud ? 0.143 : 0.125], [-0.306, x, 0.002, cloud ? 0.151 : 0.120, cloud ? 0.150 : 0.130])
  rows.push([-0.147, x, 0.009, wide ? 0.141 : 0.133, 0.146], [-0.057, x, 0.006, 0.139, 0.152], [0.055, -s * 0.043, -0.003, 0.133, 0.141], [0.093, -s * 0.050, -0.012, 0.117, 0.119])
  const fabric = tailored(m, root, shopBottoms[id].name, color, rows)
  const outside = panelSurface(fabric, 0, s), front = panelSurface(fabric, 2, 1)
  if (marketLegDetails(m, root, id, x, s, front, outside, detail, trim)) return
  if (id === 'crab-cargo') {
    const panel = (u: number, v: number) => outside([x + s * 0.14, -0.165 + v * 0.131, 0.004 + u * 0.148])
    applique(m, root, 'Bellows pocket', detail, pocket, panel, [s, 0, 0])
    applique(m, root, 'Pocket flap', trim, [[-0.5, 0.5], [0.5, 0.5], [0.5, -0.15], [0, -0.5], [-0.5, -0.15]], (u, v) => {
      const p = outside([x + s * 0.14, -0.119 + v * 0.045, 0.005 + u * 0.150])
      p[0] += s * 0.004
      return p
    }, [s, 0, 0])
  }
  else if (id === 'sail-pants') {
    applique(m, root, 'Signal flag knee patch', detail, [[-0.45, 0.48], [0.50, 0.40], [0.42, -0.45], [-0.48, -0.47]], (u, v) => front([x + u * 0.131, -0.285 + v * 0.132, 0.136]), [0, 0, 1])
  }
  else if (id === 'tide-cuffs') {
    const path: Parameters<typeof sweptDetail>[4] = [-0.75, -0.43, 0, 0.46, 0.76].map((u, i) =>
      [x + u * 0.145, hem + 0.060 + 0.008 * Math.sin(i * 1.8), 0.003 + 0.144 * Math.sqrt(1 - u * u), 0.003, 0.002])
    sweptDetail(m, root, 'Tide embroidery', trim, path, [0, 0, 1], 6)
  }
  else if (id === 'cloud-pants') {
    for (const y of [-0.378, -0.359]) {
      const pleat: Parameters<typeof sweptDetail>[4] = [-0.78, -0.45, 0, 0.45, 0.78].map((u) => {
        const [a, b, c] = front([x + u * 0.130, y + 0.016 * u * u, 0.13])
        return [a, b, c, 0.0028, 0.002]
      })
      sweptDetail(m, root, 'Cloud tuck', detail, pleat, [0, 0, 1], 6)
    }
    applique(m, root, 'Cloud maker label', detail, pocket, (u, v) => outside([x + s * 0.143, -0.137 + v * 0.062, u * 0.085 + 0.005]), [s, 0, 0])
  }
  else {
    for (const [dx, y, size] of [[0.046, -0.136, 0.044], [0.088, -0.102, 0.032]]) {
      applique(m, root, 'Salt crystal stitch', trim, [[0, 0.5], [-0.43, -0.06], [0, -0.5], [0.43, -0.06]], (u, v) => front([x + s * dx + u * size, y + v * size, 0.135]), [0, 0, 1])
    }
  }
}

// All boot geometry, including the trim, is authored in the hip's bind coordinates.
export function buildShoe(m: MeshFactory, id: StockId<'shoes'>, root: TransformNode, s: number) {
  const { color, trim, detail, open } = shopShoes[id], x = -s * 0.032
  const boot = ['kelp-boots', 'puddle-wellies'].includes(id), high = ['light-tops', 'bracken-hikers'].includes(id), toe = id === 'crab-clogs' ? 0.066 : 0.052
  const rows: Section[] = [
    [-0.680, x, toe, 0.114, 0.169, detail],
    [-0.673, x, toe, 0.125, 0.179, detail],
    [-0.652, x, toe, 0.128, 0.182, detail],
    [-0.646, x, toe, 0.128, 0.182, open ? color : detail],
  ]
  if (!open) {
    rows.push([-0.641, x, toe, 0.129, 0.182], [-0.600, x, toe + 0.007, 0.129, 0.185], [-0.570, x, 0.060, 0.121, 0.174])
    if (boot || high) {
      rows.push([-0.535, x, 0.028, 0.115, 0.143], [-0.490, x, 0.004, 0.106, 0.119], [boot ? -0.364 : -0.432, x, -0.003, 0.112, 0.119], [boot ? -0.356 : -0.424, x, -0.003, 0.117, 0.125, trim], [boot ? -0.331 : -0.403, x, -0.003, 0.116, 0.124, trim])
    }
    else rows.push([-0.552, x, 0.032, 0.104, 0.136], [-0.542, x, 0.001, 0.086, 0.091, detail])
  }
  const shoe = tailored(m, root, shopShoes[id].name, color, rows, 24, open ? 0 : 0.054)
  const vamp = panelSurface(shoe, 1, 1), shaft = panelSurface(shoe, 0, s)
  if (marketShoeDetails(m, root, id, x, s, vamp, shaft, detail, trim)) return
  if (open) {
    for (const [z, y, width, height] of [[0.125, -0.635, 0.109, 0.055], [-0.002, -0.632, 0.096, 0.076]]) {
      const arch: Parameters<typeof sweptDetail>[4] = [-1, -0.82, -0.45, 0, 0.45, 0.82, 1].map((u) =>
        [x + u * width, y + height * Math.sqrt(1 - u * u), z - 0.014 * u * s, 0.020, 0.006])
      sweptDetail(m, root, 'Woven sandal strap', color, arch, [0, 1, 0.28], 8)
    }
    applique(m, root, 'Shell clasp', trim, petal, (u, v) => [x + 0.048 * s + u * 0.050, -0.584 + v * 0.008, 0.127 + v * 0.049], [0, 1, 0])
  }
  else if (id === 'moth-shoes' || id === 'crab-clogs') {
    for (const wing of [-1, 1]) {
      const moth = id === 'moth-shoes'
      applique(m, root, moth ? 'Moth wing appliqué' : 'Claw appliqué', trim, moth ? petal : [[0, -0.5], [-0.44, -0.17], [-0.48, 0.5], [-0.03, 0.15], [0.27, 0.48], [0.44, 0.03]], (u, v) => vamp([x + wing * (0.047 + 0.087 * u + 0.043 * v), -0.560, 0.155 + 0.101 * v]), [0, 1, 0.4])
    }
    if (id === 'moth-shoes') {
      applique(m, root, 'Moth body', detail, petal, (u, v) => vamp([x + u * 0.026, -0.56, 0.154 + v * 0.075]), [0, 1, 0])
    }
  }
  else if (high) {
    for (const [y, z] of [[-0.533, 0.145], [-0.545, 0.165], [-0.562, 0.186]]) {
      const path: Parameters<typeof sweptDetail>[4] = [-1, -0.5, 0, 0.5, 1].map((u) => {
        const [px, py, pz] = vamp([x + u * 0.062, y, z + 0.005 * (1 - u * u)])
        return [px, py + 0.001, pz, 0.006, 0.004]
      })
      sweptDetail(m, root, 'Canvas lace', trim, path, [0, 1, 0.2], 6)
    }
  }
  else {
    const coil: Parameters<typeof sweptDetail>[4] = []
    for (let i = 0; i <= 15; i++) {
      const a = i * Math.PI / 8 + 0.5
      coil.push([x + 0.118 * Math.cos(a), -0.467 + 0.082 * i / 15, -0.003 + 0.127 * Math.sin(a), 0.010, 0.006])
    }
    sweptDetail(m, root, 'Braided kelp coil', detail, coil, [0, 1, 0], 8)
    applique(m, root, 'Kelp pull tab', detail, petal, (u, v) => shaft([x + s * 0.115, -0.399 + v * 0.110, 0.008 + u * 0.041 + v * 0.025]), [s, 0, 0])
  }
}
