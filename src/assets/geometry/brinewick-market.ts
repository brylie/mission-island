export const brinewickMarketFinish = {
  timber: '#a48058',
  endGrain: '#735740',
  cream: '#f3deb7',
  coral: '#b86351',
  teal: '#3f6768',
} as const

export const brinewickMarketRack = {
  footprint: { width: 3.46, depth: 0.76 },
  top: 1.94,
  upright: { endInset: 0.08, width: 0.14, depth: 0.14 },
  foot: { width: 0.16, height: 0.18, depthInset: 0.01 },
  brace: { y: 0.28, z: 0.15, size: [0.09, 0.41, 0.10], rake: -0.69 },
  crossbar: { widthInset: 0.06, height: 0.10, depth: 0.12 },
  shelf: { y: 0.28, widthInset: 0.28, height: 0.09, depthInset: 0.06 },
} as const

export const brinewickMarketNet = {
  weave: {
    rows: 7,
    columns: 17,
    halfStrandWidth: 0.012,
    columnSpacing: 0.178,
    taperPerRow: 0.004,
    rowSpacing: 0.165,
    belowCrossbar: 0.048,
    crosswiseSag: { amplitude: 0.012, frequency: 1.08 },
    forwardBow: { offset: 0.06, amplitude: 0.13, frequency: 0.44 },
    finish: '#6f8174',
  },
  corks: { count: 7, spacing: 0.455, y: -0.075, z: 0.061, diameter: 0.118, length: 0.21, segments: 9 },
  ties: { x: [-1.36, 0, 1.36], y: -0.019, z: 0.046, size: [0.024, 0.11, 0.042] },
} as const

const catchBoardRailZ = -0.35
export const brinewickMarketTable = {
  footprint: { width: 3.4, depth: 1.02 },
  top: 1.02,
  slabThickness: 0.116,
  leg: { x: 1.51, y: 0.46, z: 0.41, size: [0.13, 0.96, 0.13] },
  stretcher: { center: [0, 0.31, 0], size: [3.10, 0.11, 0.27] },
  signPost: { center: [1.56, 1.52, catchBoardRailZ], size: [0.075, 1.00, 0.075] },
  signRail: { center: [1.12, 2.02, catchBoardRailZ], size: [0.95, 0.064, 0.075] },
} as const

const trayWidth = 1.32
const trayRimY = 1.09
const coverHingeOffset = 0.38
export const brinewickMarketTray = {
  x: [-0.76, 0.76],
  z: 0.04,
  base: { rise: 0.025, size: [trayWidth, 0.05, 0.74], finish: '#d4e7da' },
  longRim: { y: trayRimY, z: 0.349, size: [trayWidth, 0.09, 0.04] },
  endRim: { x: 0.64, y: trayRimY, size: [0.04, 0.09, 0.66] },
  fish: {
    x: [-0.43, -0.14, 0.15, 0.44],
    body: { y: 1.118, z: 0.03, size: [0.19, 0.088, 0.41], yaw: 0.22, finishes: ['#608a92', '#8babb2'] },
    tail: { x: -0.035, y: 1.084, z: 0.19, size: [0.19, 0.05, 0.17], segments: 4, finish: '#597b80' },
    eye: { x: 0.043, y: 1.14, z: 0.17, size: [0.039, 0.036, 0.038], segments: 5, finish: '#243c3f' },
  },
  cover: {
    hinge: { y: 1.183, rearward: coverHingeOffset },
    canvas: { center: [0, 0.009, coverHingeOffset], size: [1.39, 0.05, 0.77], finish: '#d6b487' },
    bindingFinish: '#b8825d',
    frontBinding: { center: [0, -0.027, 0.753], size: [1.38, 0.10, 0.027], rake: -0.12 },
    sideBinding: { x: 0.688, y: -0.024, z: coverHingeOffset, size: [0.03, 0.095, 0.73] },
    strap: { x: 0.46, y: 0.039, z: 0.378, size: [0.031, 0.012, 0.75] },
  },
} as const

export const brinewickMarketCatchBoard = {
  pivot: [0.76, 1.99, catchBoardRailZ],
  hook: { center: [0, -0.017, 0], size: [0.046, 0.075, 0.047] },
  plank: { center: [0, -0.20, 0], size: [1.47, 0.40, 0.08] },
  lettering: {
    text: 'TODAY’S CATCH',
    canvasSize: { width: 384, height: 96 },
    baseline: 64,
    font: 'bold 46px Georgia',
    corners: [
      [0.70, -0.37, 0.043],
      [-0.70, -0.37, 0.043],
      [-0.70, -0.03, 0.043],
      [0.70, -0.03, 0.043],
    ],
    indices: [0, 1, 2, 0, 2, 3],
    uv: [0, 0, 1, 0, 1, 1, 0, 1],
  },
} as const

const paleWicker = '#ca9f6c'
export const brinewickMarketBasket = {
  finishes: [paleWicker, '#b58555', paleWicker],
  segments: 10,
  bowl: { y: 0.14, diameters: [0.48, 0.34], height: 0.28 },
  rim: { y: 0.275, diameters: [0.50, 0.48], height: 0.05 },
  inset: { y: 0.302, diameters: [0.39, 0.39], height: 0.009 },
  handle: { x: 0.24, y: 0.265, size: [0.065, 0.052, 0.18] },
  display: { y: 0.325, z: 0.015, spacing: 0.95, stackX: -0.54, stackStep: 0.20 },
} as const
