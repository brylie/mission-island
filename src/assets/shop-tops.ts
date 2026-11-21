import type { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { shopTops, type StockId } from '../wardrobe-stock'
import { sweptDetail } from './crew-shapes'
import { shopTopFit } from './geometry/shop-top-fit'
import { classicTopTrim, type TopApplique, type TopTrimOutline } from './geometry/shop-top-trim'
import { marketTopDetails } from './shop-market-tops'
import { applique, panelSurface, tailored, type Section } from './shop-tailoring'
import { checkRows, printGingham } from './shop-textiles'

const clothDepthAxis = 2
const starVerticesPerRay = 2
const half = 0.5
const quarterTurn = Math.PI * half
const { rays, innerRadius, outerRadius } = classicTopTrim.chart.star
const star: TopTrimOutline = Array.from({ length: rays * starVerticesPerRay }, (_, i) => {
  const angle = i * Math.PI / rays + quarterTurn
  const radius = i % starVerticesPerRay ? innerRadius : outerRadius
  return [radius * Math.cos(angle), radius * Math.sin(angle)]
})

function cutTop(meshes: MeshFactory, id: StockId<'shirt'>, root: TransformNode, dye?: string) {
  const { color, trim, detail, name, sleeveless } = shopTops[id]
  const { hem, torso, shoulders, neckline, sides, neckOpening } = shopTopFit.body
  const coat = id === 'squid-coat' || id === 'dock-jacket'
  const hemY = coat ? hem.coatHeight : hem.shirtHeight
  const pigments = { detail, beaconStripe: id === 'beacon-top' ? trim : undefined }
  const rows = [
    ...hem.rows.map<Section>(([rise, z, coatWidth, shirtWidth, depth, pigment]) =>
      [hemY + rise, 0, z, coat ? coatWidth : shirtWidth, depth, pigment && pigments[pigment]]),
    ...torso.map<Section>(([y, z, width, depth, pigment]) => [y, 0, z, width, depth, pigment && pigments[pigment]]),
    ...shoulders.map<Section>(([y, z, sleeveWidth, vestWidth, depth]) => [y, 0, z, sleeveless ? vestWidth : sleeveWidth, depth]),
    ...neckline.map<Section>(([y, z, width, depth, pigment]) => [y, 0, z, width, depth, pigments[pigment]]),
  ]
  const gingham = id === 'picnic-check'
  const fabric = tailored(meshes, root, name, dye ?? color, gingham ? checkRows(rows) : rows, sides, neckOpening)
  if (gingham) printGingham(fabric, trim, sides)
  return fabric
}

export function buildTopBody(meshes: MeshFactory, id: StockId<'shirt'>, root: TransformNode, dye?: string) {
  const colors = shopTops[id]
  const fabric = cutTop(meshes, id, root, dye)
  const front = panelSurface(fabric, clothDepthAxis, 1), back = panelSurface(fabric, clothDepthAxis, -1)
  const surface = (x: number, y: number, side: number) => (side > 0 ? front : back)([x, y, side * shopTopFit.body.panelProbeDepth])
  function patch({ name, pigment, outline, x, y, width, height, side = 1, tilt = 0, lift = 0 }: TopApplique) {
    applique(meshes, root, name, colors[pigment], outline, (u, v) => {
      const point = surface(x + u * width + v * tilt, y + v * height, side)
      point[clothDepthAxis] += side * lift
      return point
    }, [0, 0, side])
  }
  if (marketTopDetails(id, patch)) return
  if (id === 'star-knit') {
    const { front: stars, back: northStar, connection } = classicTopTrim.chart
    for (const [i, [x, y, size]] of stars.placements.entries()) {
      patch({ name: stars.name, pigment: stars.pigment, outline: star, x, y, width: size, height: size })
      if (i) {
        const [px, py] = stars.placements[i - 1]
        const path: Parameters<typeof sweptDetail>[4] = connection.samples.map((t) => {
          const [a, b, c] = surface(px + (x - px) * t, py + (y - py) * t, 1)
          return [a, b, c, connection.halfWidth, connection.thickness]
        })
        sweptDetail(meshes, root, connection.name, colors[connection.pigment], path, [0, 0, 1], connection.sides)
      }
    }
    patch({ ...northStar, outline: star })
  }
  else if (id === 'squid-coat') {
    const { collar, buttons, stormFlap, pocketWelt } = classicTopTrim.slicker
    for (const side of [-1, 1]) {
      patch({ ...collar, x: side * collar.x, width: side * collar.width, tilt: side * collar.tilt })
      for (const y of buttons.y) {
        const [x, surfaceY, z] = surface(side * buttons.x, y, 1)
        meshes.sphere(x, surfaceY, z, ...buttons.size, colors[buttons.pigment], root, false, buttons.segments)
      }
      patch({ ...stormFlap, x: side * stormFlap.x })
      patch({ ...pocketWelt, x: side * pocketWelt.x, tilt: side * pocketWelt.tilt })
    }
  }
  else if (id === 'kelp-vest') {
    const { quilting, pocket, opening } = classicTopTrim.kelpVest
    for (const side of [-1, 1]) {
      patch({ ...quilting, x: side * quilting.x, tilt: side * quilting.tilt })
      patch({ ...pocket, x: side * pocket.x, tilt: side * pocket.tilt })
    }
    patch(opening)
  }
  else if (id === 'fox-knit') {
    for (const detail of classicTopTrim.fox) patch(detail)
  }
  else {
    patch(classicTopTrim.beacon)
  }
}

export function buildSleeve(meshes: MeshFactory, id: StockId<'shirt'>, root: TransformNode, side: number, dye?: string) {
  const { color, detail, trim } = shopTops[id]
  const cuff = id === 'beacon-top' || id === 'fox-knit' ? trim : detail
  const rows = shopTopFit.sleeve.map<Section>(([y, x, z, width, depth, pigment]) =>
    [y, side * x, z, width, depth, pigment && cuff])
  tailored(meshes, root, 'Set-in sleeve', dye ?? color, rows)
}
