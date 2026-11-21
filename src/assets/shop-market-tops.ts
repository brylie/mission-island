import type { StockId } from '../wardrobe-stock'

type Patch = (name: string, tint: string, shape: number[][], x: number, y: number, w: number, h: number, side?: number, tilt?: number, lift?: number) => void
const rectangle = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]
const diamond = [[0, -0.5], [0.5, 0], [0, 0.5], [-0.5, 0]]
const pocket = [[-0.5, 0.5], [0.5, 0.5], [0.5, -0.30], [0.25, -0.5], [-0.40, -0.5], [-0.5, -0.31]]

export function marketTopDetails(id: StockId<'shirt'>, trim: string, detail: string, patch: Patch) {
  switch (id) {
    case 'picnic-check':
      for (const s of [-1, 1]) patch('Camp collar', trim, diamond, s * 0.061, 1.230, 0.088, 0.106, 1, -s * 0.045)
      patch('Button placket', detail, rectangle, 0, 1.030, 0.017, 0.333)
      break
    case 'bramble-cardigan':
      for (const side of [-1, 1]) {
        for (const [x, y] of [[-0.124, 1.09], [0, 1.005], [0.124, 1.09]]) {
          patch('Intarsia diamond', trim, diamond, x, y, 0.117, 0.144, side)
        }
      }
      patch('Button band', detail, rectangle, 0, 1.014, 0.026, 0.372, 1, 0, 0.004)
      for (const y of [0.87, 0.97, 1.07, 1.17]) patch('Pearl button', trim, diamond, 0, y, 0.021, 0.025, 1, 0, 0.008)
      break
    case 'dock-jacket':
      for (const s of [-1, 1]) {
        patch('Patch pocket', detail, pocket, s * 0.142, 0.918, 0.130, 0.106)
        patch('Pocket facing', trim, rectangle, s * 0.142, 0.967, 0.130, 0.014, 1, 0, 0.005)
        patch('Corduroy collar', detail, diamond, s * 0.080, 1.218, 0.112, 0.107, 1, -s * 0.045)
      }
      patch('Storm placket', detail, rectangle, 0, 1.014, 0.027, 0.446)
      patch('Locker loop', trim, rectangle, 0, 1.188, 0.067, 0.021, -1)
      break
    case 'fern-gilet':
      for (const side of [-1, 1]) for (const s of [-1, 1]) {
        for (const y of [0.943, 1.028, 1.113]) patch('Quilted chevron', detail, rectangle, s * 0.101, y, 0.022, 0.174, side, s * 0.171, 0.002)
      }
      patch('Zip tape', trim, rectangle, 0, 1.03, 0.018, 0.420)
      break
    case 'squall-knit':
      for (const side of [-1, 1]) for (const x of [-0.176, -0.088, 0, 0.088, 0.176]) {
        patch('Fair Isle yoke', detail, diamond, x, 1.146, 0.073, 0.090, side)
        patch('Snow stitch', trim, diamond, x, 1.065, 0.029, 0.034, side)
      }
      break
    default: return false
  }
  return true
}
