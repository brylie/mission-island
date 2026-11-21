export const skull: [number, number, number, number, number][] = [
  [0.012, 0, 0.052, 0.085, 0.104],
  [0.027, 0, 0.044, 0.150, 0.145],
  [0.056, 0, 0.041, 0.192, 0.172],
  [0.109, 0, 0.038, 0.232, 0.192],
  [0.172, 0, 0.029, 0.261, 0.210],
  [0.216, 0, 0.019, 0.276, 0.224],
  [0.303, 0, 0.010, 0.278, 0.224],
  [0.384, 0, 0.002, 0.271, 0.222],
  [0.452, 0, -0.005, 0.251, 0.205],
  [0.505, 0, -0.009, 0.211, 0.180],
  [0.543, 0, -0.012, 0.137, 0.127],
  [0.56, 0, -0.011, 0.027, 0.035],
]

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
