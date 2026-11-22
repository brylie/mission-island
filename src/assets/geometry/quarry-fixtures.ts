const shellHalfWidth = 3.58
const shellHalfDepth = 2.65
const shoulderY = 3.56
const sideRailZ = 2.66
const frameZ = 2.2

export const oreHopperModel = {
  shell: {
    mouth: { halfWidth: 0.86, halfDepth: 0.53, y: 2.12, z: -0.76 },
    shoulder: { halfWidth: shellHalfWidth, halfDepth: shellHalfDepth, y: shoulderY },
    top: { halfWidth: shellHalfWidth, halfDepth: shellHalfDepth, y: 4.63 },
    shade: { funnel: 0.80, outside: 0.94, inside: 0.61 },
    finish: '#98735d',
  },
  feed: {
    rim: { halfWidth: 3.56, halfDepth: 2.63, y: 4.03 },
    peak: [-0.7, 4.37, 0.31],
    shade: 0.88,
    finish: '#716f65',
  },
  cladding: {
    railY: [shoulderY, 4.64],
    endRail: { z: sideRailZ, size: [7.28, 0.095, 0.11] },
    sideRail: { x: 3.59, size: [0.11, 0.095, 5.32] },
    upright: { x: [-2.32, 0, 2.32], y: 4.10, z: sideRailZ, size: [0.11, 1.07, 0.045] },
    rivet: { y: [3.69, 4.50], z: 2.695, size: [0.055, 0.055, 0.026], finish: '#b2a18b' },
  },
  frame: {
    post: { x: [-2.82, 2.82], y: 1.79, z: frameZ, size: [0.28, 3.58, 0.30] },
    brace: { y: 1.78, z: frameZ, size: [6.24, 0.18, 0.16], tilt: 0.44 },
    finish: '#78634f',
  },
  chute: {
    z: -2.22,
    length: 3.26,
    pitch: -0.24,
    floor: { y: 1.84, width: 1.91, thickness: 0.12 },
    cheek: { x: 0.91, y: 1.98, width: 0.12, height: 0.32 },
  },
  ironFinish: '#69695e',
} as const

export const oreBayDivider = {
  timberFinish: '#817359',
  courses: {
    count: 2,
    baseY: 0.13,
    rise: 0.25,
    baseZ: 0.6,
    setback: 0.38,
    width: 0.22,
    height: 0.25,
    baseLength: 4.4,
    lengthReduction: 0.76,
  },
  post: { xInset: 0.16, y: 0.32, z: [-0.1, 2.5], size: [0.14, 0.72, 0.18], finish: '#645e4f' },
} as const
