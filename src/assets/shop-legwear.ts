import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { shopBottoms, shopShoes, type StockId } from '../wardrobe-stock'
import { sweptDetail } from './crew-shapes'
import { applique, panelSurface, tailored, type Section } from './shop-tailoring'

const petal = [[0, .5], [-.36, .25], [-.5, -.05], [-.31, -.39], [0, -.5], [.32, -.34], [.48, .04], [.31, .34]]
const pocket = [[-.48, .50], [.48, .50], [.46, -.26], [.28, -.48], [-.34, -.48], [-.46, -.32]]

export function buildBottomLeg(m: MeshFactory, id: StockId<'trousers'>, root: TransformNode, s: number) {
  const { color, trim, detail, short } = shopBottoms[id], x = -s * .032
  const hem = short ? (id === 'salt-shorts' ? -.208 : -.261) : -.463
  const cloud = id === 'cloud-pants', wide = id === 'tide-cuffs'
  const ankle = wide ? .144 : short ? .120 : .106
  const rows: Section[] = [
    [hem, x, .003, ankle, .124, trim], [hem + .008, x, .003, ankle + .006, .131, trim],
    [hem + .034, x, .002, ankle + .007, .132, trim], [hem + .039, x, .001, ankle + .007, .133],
  ]
  if (!short) rows.push([-.370, x, -.003, cloud ? .142 : .116, cloud ? .143 : .125], [-.306, x, .002, cloud ? .151 : .120, cloud ? .150 : .130])
  rows.push([-.147, x, .009, wide ? .141 : .133, .146], [-.057, x, .006, .139, .152],
    [.055, -s * .043, -.003, .133, .141], [.093, -s * .050, -.012, .117, .119])
  const fabric = tailored(m, root, shopBottoms[id].name, color, rows)
  const outside = panelSurface(fabric, 0, s), front = panelSurface(fabric, 2, 1)
  if (id === 'crab-cargo') {
    const panel = (u: number, v: number) => outside([x + s * .14, -.165 + v * .131, .004 + u * .148])
    applique(m, root, 'Bellows pocket', detail, pocket, panel, [s, 0, 0])
    applique(m, root, 'Pocket flap', trim, [[-.5, .5], [.5, .5], [.5, -.15], [0, -.5], [-.5, -.15]],
      (u, v) => { const p = outside([x + s * .14, -.119 + v * .045, .005 + u * .150]); p[0] += s * .004; return p }, [s, 0, 0])
  } else if (id === 'sail-pants') {
    applique(m, root, 'Signal flag knee patch', detail, [[-.45, .48], [.50, .40], [.42, -.45], [-.48, -.47]],
      (u, v) => front([x + u * .131, -.285 + v * .132, .136]), [0, 0, 1])
  } else if (id === 'tide-cuffs') {
    const path: Parameters<typeof sweptDetail>[4] = [-.75, -.43, 0, .46, .76].map((u, i) =>
      [x + u * .145, hem + .060 + .008 * Math.sin(i * 1.8), .003 + .144 * Math.sqrt(1 - u * u), .003, .002])
    sweptDetail(m, root, 'Tide embroidery', trim, path, [0, 0, 1], 6)
  } else if (id === 'cloud-pants') {
    for (const y of [-.378, -.359]) {
      const pleat: Parameters<typeof sweptDetail>[4] = [-.78, -.45, 0, .45, .78].map(u => {
        const [a, b, c] = front([x + u * .130, y + .016 * u * u, .13])
        return [a, b, c, .0028, .002]
      })
      sweptDetail(m, root, 'Cloud tuck', detail, pleat, [0, 0, 1], 6)
    }
    applique(m, root, 'Cloud maker label', detail, pocket, (u, v) => outside([x + s * .143, -.137 + v * .062, u * .085 + .005]), [s, 0, 0])
  } else {
    for (const [dx, y, size] of [[.046, -.136, .044], [.088, -.102, .032]]) {
      applique(m, root, 'Salt crystal stitch', trim, [[0, .5], [-.43, -.06], [0, -.5], [.43, -.06]],
        (u, v) => front([x + s * dx + u * size, y + v * size, .135]), [0, 0, 1])
    }
  }
}

// All boot geometry, including the trim, is authored in the hip's bind coordinates.
export function buildShoe(m: MeshFactory, id: StockId<'shoes'>, root: TransformNode, s: number) {
  const { color, trim, detail, open } = shopShoes[id], x = -s * .032
  const boot = id === 'kelp-boots', high = id === 'light-tops', toe = id === 'crab-clogs' ? .066 : .052
  const rows: Section[] = [
    [-.680, x, toe, .114, .169, detail], [-.673, x, toe, .125, .179, detail],
    [-.652, x, toe, .128, .182, detail], [-.646, x, toe, .128, .182, open ? color : detail],
  ]
  if (!open) {
    rows.push([-.641, x, toe, .129, .182], [-.600, x, toe + .007, .129, .185], [-.570, x, .060, .121, .174])
    if (boot || high) {
      rows.push([-.535, x, .028, .115, .143], [-.490, x, .004, .106, .119],
        [boot ? -.364 : -.432, x, -.003, .112, .119], [boot ? -.356 : -.424, x, -.003, .117, .125, trim],
        [boot ? -.331 : -.403, x, -.003, .116, .124, trim])
    } else rows.push([-.552, x, .032, .104, .136], [-.542, x, .001, .086, .091, detail])
  }
  const shoe = tailored(m, root, shopShoes[id].name, color, rows, 24, open ? 0 : .054)
  const vamp = panelSurface(shoe, 1, 1), shaft = panelSurface(shoe, 0, s)
  if (open) {
    for (const [z, y, width, height] of [[.125, -.635, .109, .055], [-.002, -.632, .096, .076]]) {
      const arch: Parameters<typeof sweptDetail>[4] = [-1, -.82, -.45, 0, .45, .82, 1].map(u =>
        [x + u * width, y + height * Math.sqrt(1 - u * u), z - .014 * u * s, .020, .006])
      sweptDetail(m, root, 'Woven sandal strap', color, arch, [0, 1, .28], 8)
    }
    applique(m, root, 'Shell clasp', trim, petal, (u, v) => [x + .048 * s + u * .050, -.584 + v * .008, .127 + v * .049], [0, 1, 0])
  } else if (id === 'moth-shoes' || id === 'crab-clogs') {
    for (const wing of [-1, 1]) {
      const moth = id === 'moth-shoes'
      applique(m, root, moth ? 'Moth wing appliqué' : 'Claw appliqué', trim, moth ? petal : [[0, -.5], [-.44, -.17], [-.48, .5], [-.03, .15], [.27, .48], [.44, .03]],
        (u, v) => vamp([x + wing * (.047 + .087 * u + .043 * v), -.560, .155 + .101 * v]), [0, 1, .4])
    }
    if (id === 'moth-shoes') {
      applique(m, root, 'Moth body', detail, petal, (u, v) => vamp([x + u * .026, -.56, .154 + v * .075]), [0, 1, 0])
    }
  } else if (high) {
    for (const [y, z] of [[-.533, .145], [-.545, .165], [-.562, .186]]) {
      const path: Parameters<typeof sweptDetail>[4] = [-1, -.5, 0, .5, 1].map(u => {
        const [px, py, pz] = vamp([x + u * .062, y, z + .005 * (1 - u * u)])
        return [px, py + .001, pz, .006, .004]
      })
      sweptDetail(m, root, 'Canvas lace', trim, path, [0, 1, .2], 6)
    }
  } else {
    const coil: Parameters<typeof sweptDetail>[4] = []
    for (let i = 0; i <= 15; i++) {
      const a = i * Math.PI / 8 + .5
      coil.push([x + .118 * Math.cos(a), -.467 + .082 * i / 15, -.003 + .127 * Math.sin(a), .010, .006])
    }
    sweptDetail(m, root, 'Braided kelp coil', detail, coil, [0, 1, 0], 8)
    applique(m, root, 'Kelp pull tab', detail, petal, (u, v) => shaft([x + s * .115, -.399 + v * .110, .008 + u * .041 + v * .025]), [s, 0, 0])
  }
}
