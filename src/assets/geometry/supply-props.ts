export const crateSize = 0.89

export const cargoCrateModel = {
  size: crateSize,
  body: '#cf8b4f',
  brace: { x: 0.3, size: [0.11, 0.91, 0.91], color: '#f9c174' },
  label: { y: 0.06, z: -0.453, size: [0.35, 0.23, 0.02], color: '#ffe8b1' },
} as const

// Wren's loaner has a lid tray and a handle that runs along the body.
export const loanToolboxModel = {
  body: { y: 0.13, size: [0.2, 0.22, 0.52], color: '#b8463a' },
  lid: { y: 0.255, size: [0.21, 0.035, 0.54], color: '#8f3029' },
  handleSupports: { y: 0.32, z: [-0.17, 0.17], size: [0.035, 0.11, 0.035] },
  handle: { y: 0.375, size: [0.04, 0.035, 0.38], color: '#3c3d3f' },
  latch: { x: 0.105, y: 0.2, size: [0.012, 0.03, 0.07], color: '#e7c46a' },
} as const

// The emitter uses the forward tip of this nozzle in tool-local coordinates.
const nozzle = { height: 0.98, center: 0.19, length: 0.35, width: 0.15, thickness: 0.12 } as const
export const extinguisherModel = {
  tank: { y: 0.48, diameter: 0.56, height: 0.83, color: '#d4513d' },
  band: { y: 0.57, diameter: 0.57, height: 0.18, color: '#fff3d0' },
  tankSides: 12,
  head: { size: [0.42, 0.15, 0.22], color: '#2b4445' },
  nozzle,
} as const
