import type { StockId } from '../wardrobe-stock'
import { marketTopTrim, type TopApplique } from './geometry/shop-top-trim'

type Patch = (trim: TopApplique) => void
const sides = [-1, 1] as const

export function marketTopDetails(id: StockId<'shirt'>, patch: Patch) {
  switch (id) {
    case 'picnic-check': {
      const { collar, placket } = marketTopTrim.picnic
      for (const side of sides) patch({ ...collar, x: side * collar.x, tilt: side * collar.tilt })
      patch(placket)
      break
    }
    case 'bramble-cardigan': {
      const { diamonds, band, buttons } = marketTopTrim.cardigan
      for (const side of sides) {
        for (const [x, y] of diamonds.placements) patch({ ...diamonds, x, y, side })
      }
      patch(band)
      for (const y of buttons.rows) patch({ ...buttons, y })
      break
    }
    case 'dock-jacket': {
      const { pocket, facing, collar, placket, loop } = marketTopTrim.dockJacket
      for (const side of sides) {
        patch({ ...pocket, x: side * pocket.x })
        patch({ ...facing, x: side * facing.x })
        patch({ ...collar, x: side * collar.x, tilt: side * collar.tilt })
      }
      patch(placket)
      patch(loop)
      break
    }
    case 'fern-gilet': {
      const { quilting, zip } = marketTopTrim.fernGilet
      for (const side of sides) for (const sign of sides) {
        for (const y of quilting.rows) patch({ ...quilting, x: sign * quilting.x, y, side, tilt: sign * quilting.tilt })
      }
      patch(zip)
      break
    }
    case 'squall-knit': {
      const { columns, yoke, snow } = marketTopTrim.squallKnit
      for (const side of sides) for (const x of columns) {
        patch({ ...yoke, x, side })
        patch({ ...snow, x, side })
      }
      break
    }
    default: return false
  }
  return true
}
