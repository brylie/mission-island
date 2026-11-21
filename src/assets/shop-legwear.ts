import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { shopBottoms, shopShoes, type StockId } from '../wardrobe-stock'
import { sweptDetail, type SweepPoint } from './crew-shapes'
import { legInset, shoeCuts, shoeTrim, trouserCuts, trouserTrim } from './geometry/shop-legwear'
import { marketLegDetails, marketShoeDetails } from './shop-market-legwear'
import { applique, panelSurface, tailored, type Section } from './shop-tailoring'

const frontAxis = 2
const pairedSides = [-1, 1] as const
const forward: [number, number, number] = [0, 0, 1]
const upward: [number, number, number] = [0, 1, 0]
const ankleOverrides: Partial<Record<StockId<'trousers'>, number>> = trouserCuts.ankleOverrides

function trouserProfile(id: StockId<'trousers'>, x: number, s: number, hem: number, trim: string): Section[] {
  const { short } = shopBottoms[id]
  const cloud = id === 'cloud-pants', wide = id === 'tide-cuffs'
  const { ankleWidth, cuff, calf, knee, thigh, rise } = trouserCuts
  const ankle = ankleOverrides[id] ?? (wide ? ankleWidth.wide : short ? ankleWidth.short : ankleWidth.regular)
  const rows = cuff.map<Section>(([aboveHem, z, extraHalfWidth, depth, finish]) =>
    [hem + aboveHem, x, z, ankle + extraHalfWidth, depth, finish ? trim : undefined])
  if (!short) {
    for (const { y, z, regular, cloud: gathered } of calf) rows.push([y, x, z, ...(cloud ? gathered : regular)])
  }
  rows.push([knee.y, x, knee.z, wide ? knee.wideWidth : knee.regularWidth, knee.depth])
  rows.push([thigh.y, x, thigh.z, thigh.width, thigh.depth])
  for (const { y, inset, z, width, depth } of rise) rows.push([y, -s * inset, z, width, depth])
  return rows
}

export function buildBottomLeg(m: MeshFactory, id: StockId<'trousers'>, root: TransformNode, s: number) {
  const { color, trim, detail, short, name } = shopBottoms[id], x = -s * legInset
  const { hemHeight } = trouserCuts
  const hem = short ? (id === 'salt-shorts' ? hemHeight.saltShorts : hemHeight.short) : hemHeight.long
  const fabric = tailored(m, root, name, color, trouserProfile(id, x, s, hem, trim))
  const outside = panelSurface(fabric, 0, s), front = panelSurface(fabric, frontAxis, 1)
  if (marketLegDetails(m, root, id, x, s, front, outside, detail, trim)) return
  if (id === 'crab-cargo') {
    const { sideX, pocket, flap } = trouserTrim.bellows
    const outerX = x + s * sideX
    const panel = (u: number, v: number) => outside([outerX, pocket.y + v * pocket.height, pocket.centerZ + u * pocket.width])
    applique(m, root, 'Bellows pocket', detail, pocket.outline, panel, [s, 0, 0])
    applique(m, root, 'Pocket flap', trim, flap.outline, (u, v) => {
      const p = outside([outerX, flap.y + v * flap.height, flap.centerZ + u * flap.width])
      p[0] += s * flap.clearance
      return p
    }, [s, 0, 0])
  }
  else if (id === 'sail-pants') {
    const flag = trouserTrim.signalFlag
    applique(m, root, 'Signal flag knee patch', detail, flag.outline, (u, v) => front([x + u * flag.width, flag.y + v * flag.height, flag.z]), forward)
  }
  else if (id === 'tide-cuffs') {
    const wave = trouserTrim.tideEmbroidery
    const path = wave.arcSamples.map<SweepPoint>((u, i) => [
      x + u * wave.radiusX,
      hem + wave.aboveHem + wave.waveHeight * Math.sin(i * wave.waveStep),
      wave.centerZ + wave.radiusZ * Math.sqrt(1 - u * u),
      ...wave.thread,
    ])
    sweptDetail(m, root, 'Tide embroidery', trim, path, forward, wave.sides)
  }
  else if (id === 'cloud-pants') {
    const { tuck, label } = trouserTrim.cloudDetails
    for (const y of tuck.heights) {
      const pleat = tuck.arcSamples.map<SweepPoint>((u) => {
        const [a, b, c] = front([x + u * tuck.width, y + tuck.lift * u * u, tuck.z])
        return [a, b, c, ...tuck.thread]
      })
      sweptDetail(m, root, 'Cloud tuck', detail, pleat, forward, tuck.sides)
    }
    applique(m, root, 'Cloud maker label', detail, label.outline, (u, v) =>
      outside([x + s * label.sideX, label.y + v * label.height, u * label.width + label.centerZ]), [s, 0, 0])
  }
  else {
    const { stitches, outline, z } = trouserTrim.saltCrystals
    for (const { outward, y, size } of stitches) {
      applique(m, root, 'Salt crystal stitch', trim, outline, (u, v) => front([x + s * outward + u * size, y + v * size, z]), forward)
    }
  }
}

function shoeProfile(id: StockId<'shoes'>, x: number, boot: boolean, high: boolean): Section[] {
  const { color, detail, trim, open } = shopShoes[id]
  const toe = id === 'crab-clogs' ? shoeCuts.toeZ.clog : shoeCuts.toeZ.regular
  const { sole, welt, forefoot, instep, highShaft, bootCollar, lowCollar } = shoeCuts
  const rows = sole.map<Section>(({ y, width, depth }) => [y, x, toe, width, depth, detail])
  rows.push([welt.y, x, toe, welt.width, welt.depth, open ? color : detail])
  if (open) return rows
  for (const { y, toeOffset, width, depth } of forefoot) rows.push([y, x, toe + toeOffset, width, depth])
  const [instepY, instepZ, instepWidth, instepDepth] = instep
  rows.push([instepY, x, instepZ, instepWidth, instepDepth])
  if (boot || high) {
    for (const [y, z, width, depth] of highShaft) rows.push([y, x, z, width, depth])
    for (const section of bootCollar) {
      const { bootY, highTopY, z, width, depth } = section
      const finish = 'finish' in section ? trim : undefined
      rows.push([boot ? bootY : highTopY, x, z, width, depth, finish])
    }
  }
  else {
    const { quarter, collar } = lowCollar
    const [quarterY, quarterZ, quarterWidth, quarterDepth] = quarter
    const [collarY, collarZ, collarWidth, collarDepth] = collar
    rows.push([quarterY, x, quarterZ, quarterWidth, quarterDepth], [collarY, x, collarZ, collarWidth, collarDepth, detail])
  }
  return rows
}

// All boot geometry, including the trim, is authored in the hip's bind coordinates.
export function buildShoe(m: MeshFactory, id: StockId<'shoes'>, root: TransformNode, s: number) {
  const { color, trim, detail, open, name } = shopShoes[id], x = -s * legInset
  const boot = id === 'kelp-boots' || id === 'puddle-wellies'
  const high = id === 'light-tops' || id === 'bracken-hikers'
  const rows = shoeProfile(id, x, boot, high)
  const shoe = tailored(m, root, name, color, rows, shoeCuts.sectionSides, open ? 0 : shoeCuts.closedOpening)
  const vamp = panelSurface(shoe, 1, 1), shaft = panelSurface(shoe, 0, s)
  if (marketShoeDetails(m, root, id, x, s, vamp, shaft, detail, trim)) return
  if (open) {
    const { straps, clasp, arcSamples, skew, band, normal, sides } = shoeTrim.sandal
    for (const { z, y, width, height } of straps) {
      const arch = arcSamples.map<SweepPoint>((u) => [x + u * width, y + height * Math.sqrt(1 - u * u), z - skew * u * s, ...band])
      sweptDetail(m, root, 'Woven sandal strap', color, arch, normal, sides)
    }
    applique(m, root, 'Shell clasp', trim, clasp.outline, (u, v) =>
      [x + clasp.outward * s + u * clasp.width, clasp.y + v * clasp.height, clasp.z + v * clasp.depth], upward)
  }
  else if (id === 'moth-shoes' || id === 'crab-clogs') {
    const motif = shoeTrim.vampApplique
    const moth = id === 'moth-shoes'
    for (const wing of pairedSides) {
      applique(m, root, moth ? 'Moth wing appliqué' : 'Claw appliqué', trim, moth ? motif.wing : motif.claw, (u, v) =>
        vamp([x + wing * (motif.outward + motif.width * u + motif.skew * v), motif.y, motif.z + motif.depth * v]), [...motif.normal])
    }
    if (moth) {
      const { mothBody } = motif
      applique(m, root, 'Moth body', detail, mothBody.outline, (u, v) => vamp([x + u * mothBody.width, mothBody.y, mothBody.z + v * mothBody.depth]), upward)
    }
  }
  else if (high) {
    const lace = shoeTrim.canvasLace
    for (const { y, z } of lace.eyes) {
      const path = lace.samples.map<SweepPoint>((u) => {
        const [px, py, pz] = vamp([x + u * lace.width, y, z + lace.bow * (1 - u * u)])
        return [px, py + lace.lift, pz, ...lace.crossSection]
      })
      sweptDetail(m, root, 'Canvas lace', trim, path, lace.normal, lace.sides)
    }
  }
  else {
    const { coil: braid, tab } = shoeTrim.kelp
    const coil: SweepPoint[] = []
    for (let i = 0; i <= braid.segments; i++) {
      const a = i * Math.PI / braid.angleDivisor + braid.phase
      coil.push([x + braid.radiusX * Math.cos(a), braid.y + braid.climb * i / braid.segments, braid.z + braid.radiusZ * Math.sin(a), ...braid.crossSection])
    }
    sweptDetail(m, root, 'Braided kelp coil', detail, coil, upward, braid.sides)
    applique(m, root, 'Kelp pull tab', detail, tab.outline, (u, v) => shaft([
      x + s * tab.outward,
      tab.y + v * tab.height,
      tab.z + u * tab.width + v * tab.skew,
    ]), [s, 0, 0])
  }
}
