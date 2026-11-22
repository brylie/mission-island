import { skull } from './geometry/crew-scalp'

export { skull } from './geometry/crew-scalp'

// Interpolate the same horizontal sections used by the cheek mesh and the hair fittings.
export function headSection(height: number) {
  const row = skull.findIndex((section) => section[0] >= height)
  const lo = skull[row - 1], hi = skull[row]
  const t = (height - lo[0]) / (hi[0] - lo[0])
  return {
    center: lo[2] + (hi[2] - lo[2]) * t,
    width: lo[3] + (hi[3] - lo[3]) * t,
    depth: lo[4] + (hi[4] - lo[4]) * t,
  }
}
