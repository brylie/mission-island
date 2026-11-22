export const oilLanternModel = {
  frame: '#434942',
  glass: { color: '#eea75c', opacity: 0.73, y: 0.193, top: 0.211, bottom: 0.22, height: 0.26, sides: 9 },
  flame: { y: 0.167, size: [0.065, 0.147, 0.072], color: '#ffbf62' },
  base: { y: 0.04, top: 0.244, bottom: 0.28, height: 0.08 },
  cap: { y: 0.337, top: 0.147, bottom: 0.261, height: 0.079 },
  frameSides: 10,
  bars: { x: [-0.1, 0.1], z: [-0.064, 0.064], y: 0.194, size: [0.025, 0.25, 0.025] },
  handle: { y: 0.42, size: [0.095, 0.065, 0.027] },
} as const

export const timberSawModel = {
  table: { y: 0.84, z: 0.02, size: [2.42, 0.135, 1.16], color: '#a07e54' },
  legs: { x: [-0.96, 0.96], z: [-0.4, 0.43], y: 0.404, size: [0.135, 0.81, 0.15], color: '#746650' },
  stock: { x: -0.52, y: 0.952, size: [1.18, 0.09, 0.37], color: '#cdab74' },
  arbor: [0.08, 1.01, -0.018],
  blade: { diameter: 0.48, thickness: 0.053, sides: 22, color: '#a2b5b1' },
  teeth: { count: 14, radius: 0.247, rake: 0.23, size: [0.049, 0.079, 0.058], color: '#98a5a0' },
  witness: { center: [0.079, 0.158, 0.029], size: [0.035, 0.061, 0.008], color: '#556c69' },
  dustOffset: { x: 0.1, y: 1.12, z: 0.025 },
} as const

const millLidHeight = 0.79
export const millVentModel = {
  sides: 10,
  pipe: { y: 0.06, top: 0.46, bottom: 0.53, height: 1.55, color: '#798985' },
  lid: { y: millLidHeight, top: 0.37, bottom: 0.43, height: 0.12, color: '#545e55' },
  outletHeight: millLidHeight + 0.09,
} as const
