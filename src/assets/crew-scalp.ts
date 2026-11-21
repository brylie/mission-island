export const skull: [number, number, number, number, number][] = [
  [.012, 0, .052, .085, .104], [.027, 0, .044, .150, .145], [.056, 0, .041, .192, .172],
  [.109, 0, .038, .232, .192], [.172, 0, .029, .261, .210], [.216, 0, .019, .276, .224],
  [.303, 0, .010, .278, .224], [.384, 0, .002, .271, .222], [.452, 0, -.005, .251, .205],
  [.505, 0, -.009, .211, .180], [.543, 0, -.012, .137, .127], [.56, 0, -.011, .027, .035],
]

// Interpolate the same horizontal sections used by the cheek mesh and the hair fittings.
export function headSection(height: number) {
  const row = skull.findIndex(section => section[0] >= height)
  const lo = skull[row - 1], hi = skull[row]
  const t = (height - lo[0]) / (hi[0] - lo[0])
  return {
    center: lo[2] + (hi[2] - lo[2]) * t,
    width: lo[3] + (hi[3] - lo[3]) * t,
    depth: lo[4] + (hi[4] - lo[4]) * t,
  }
}
