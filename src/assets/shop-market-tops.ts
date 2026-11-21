import type { StockId } from '../wardrobe-stock'

type Patch = (name: string, tint: string, shape: number[][], x: number, y: number,
  w: number, h: number, side?: number, tilt?: number, lift?: number) => void
const rectangle = [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]]
const diamond = [[0, -.5], [.5, 0], [0, .5], [-.5, 0]]
const pocket = [[-.5, .5], [.5, .5], [.5, -.30], [.25, -.5], [-.40, -.5], [-.5, -.31]]

export function marketTopDetails(id: StockId<'shirt'>, trim: string, detail: string, patch: Patch) {
  switch (id) {
    case 'picnic-check':
      for (const s of [-1, 1]) patch('Camp collar', trim, diamond, s * .061, 1.230, .088, .106, 1, -s * .045)
      patch('Button placket', detail, rectangle, 0, 1.030, .017, .333)
      break
    case 'bramble-cardigan':
      for (const side of [-1, 1]) {
        for (const [x, y] of [[-.124, 1.09], [0, 1.005], [.124, 1.09]]) {
          patch('Intarsia diamond', trim, diamond, x, y, .117, .144, side)
        }
      }
      patch('Button band', detail, rectangle, 0, 1.014, .026, .372, 1, 0, .004)
      for (const y of [.87, .97, 1.07, 1.17]) patch('Pearl button', trim, diamond, 0, y, .021, .025, 1, 0, .008)
      break
    case 'dock-jacket':
      for (const s of [-1, 1]) {
        patch('Patch pocket', detail, pocket, s * .142, .918, .130, .106)
        patch('Pocket facing', trim, rectangle, s * .142, .967, .130, .014, 1, 0, .005)
        patch('Corduroy collar', detail, diamond, s * .080, 1.218, .112, .107, 1, -s * .045)
      }
      patch('Storm placket', detail, rectangle, 0, 1.014, .027, .446)
      patch('Locker loop', trim, rectangle, 0, 1.188, .067, .021, -1)
      break
    case 'fern-gilet':
      for (const side of [-1, 1]) for (const s of [-1, 1]) {
        for (const y of [.943, 1.028, 1.113]) patch('Quilted chevron', detail, rectangle, s * .101, y, .022, .174, side, s * .171, .002)
      }
      patch('Zip tape', trim, rectangle, 0, 1.03, .018, .420)
      break
    case 'squall-knit':
      for (const side of [-1, 1]) for (const x of [-.176, -.088, 0, .088, .176]) {
        patch('Fair Isle yoke', detail, diamond, x, 1.146, .073, .090, side)
        patch('Snow stitch', trim, diamond, x, 1.065, .029, .034, side)
      }
      break
    default: return false
  }
  return true
}
