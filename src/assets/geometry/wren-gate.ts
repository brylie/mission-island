export const wrenGateFinish = {
  timber: '#7d6a52',
  cap: '#d6c7a3',
  iron: '#4a4644',
  brass: '#e2b55a',
} as const

export const gardenFenceModel = {
  height: 1.55,
  posts: { minSpacing: 0.5, endTolerance: 0.01, width: 0.11, depth: 0.11 },
  rails: { heights: [0.32, 1.18], z: 0.07, height: 0.08, depth: 0.04 },
  pickets: {
    firstX: 0.1,
    spacing: 0.21,
    z: 0.1,
    baseY: 0.06,
    width: 0.075,
    depth: 0.025,
    top: { height: 1.44, step: 0.03, stride: 5, variants: 3 },
  },
} as const

const leaf = { length: 1.06, height: 1.5, thickness: 0.08 }
const topHingeY = 1.2
const hingePinX = 0.02
export const wrenGateGeometry = {
  leaf,
  posts: { rightX: 1.12, y: 0.8, size: [0.14, 1.6, 0.14] },
  topRail: { x: leaf.length / 2 + 0.03, y: topHingeY, z: 0, width: leaf.length - 0.04, height: 0.09, depth: 0.05 },
  bottomRailY: 0.3,
  pickets: { firstX: 0.12, spacing: 0.19, y: 0.78, z: 0.03, size: [0.075, 1.36, 0.025] },
  brace: { y: 0.75, z: -0.01, size: [1.08, 0.07, 0.04], angle: 0.74 },
  hinges: { x: 0.12, heights: [0.32, topHingeY], z: -0.04, size: [0.2, 0.05, 0.02] },
  wornPin: { x: hingePinX, y: topHingeY, size: [0.035, 0.1, 0.035], color: '#8c5a3c' },
  pin: { x: hingePinX, y: topHingeY, diameter: 0.045, length: 0.16, sides: 8 },
  scrape: { firstAngle: -0.05, tailAngle: 0.25, spacing: 0.07, endInset: 0.08, lift: 0.012, size: [0.16, 0.02, 0.12], color: '#5b4532' },
} as const

export const cottageBackModel = {
  door: { y: 1.2, outset: 0.04, size: [1.1, 2.3, 0.13], color: '#4f6f62' },
  knob: { x: 0.38, y: 1.15, outset: 0.12, size: [0.07, 0.07, 0.05] },
  step: { y: 0.09, outset: 0.42, size: [1.4, 0.18, 0.55], color: '#a9a294' },
  sideWindow: { y: 2, glazingOutset: 0.12 },
} as const
