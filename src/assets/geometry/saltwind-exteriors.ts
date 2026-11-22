const wallBase = 0.36

export const exteriorShell = {
  foundation: { defaultDepth: 0.48, centerY: 0.18, edgeAllowance: 0.33, aboveGround: 0.38, finish: '#a6957d' },
  wallBase,
  plinth: { centerY: 0.46, edgeAllowance: 0.095, height: 0.19 },
} as const

export const exteriorRoof = {
  flat: {
    plate: { aboveWall: 0.53, overhang: 0.62, thickness: 0.31 },
    vent: { xFraction: 0.28, zFraction: 0.21, aboveWall: 0.99, size: [2.2, 0.62, 1.48], finish: '#81908a' },
  },
  gable: {
    maxRise: 2.42,
    pitchRatio: 0.27,
    eaveOverhang: 0.46,
    panel: { aboveWall: wallBase, widthAllowance: 0.85, thickness: 0.24, edgeAllowance: 0.10 },
    fascia: { inset: 0.08, aboveWall: 0.37, centerRiseRatio: 0.19, width: 0.21, heightRatio: 0.38, depthRatio: 0.59 },
    endFaces: {
      aboveWall: 0.35,
      indices: [0, 2, 1, 3, 4, 5],
      uvs: [0, 0, 0.5, 1, 1, 0, 0, 0, 0.5, 1, 1, 0],
    },
  },
} as const

const serviceDoorHeight = 4.15

export const exteriorEntrances = {
  bays: {
    fire: { width: 4.15, height: serviceDoorHeight, count: 2, slatted: true },
    hangar: { width: 13.1, height: 4.8, count: 1, slatted: true },
    mill: { width: 6.4, height: serviceDoorHeight, count: 1, slatted: true },
    mine: { width: 6.3, height: serviceDoorHeight, count: 1, slatted: false },
  },
  garage: {
    bayGap: 1.05,
    frame: { rise: 0.35, forward: 0.05, widthAllowance: 0.31, heightAllowance: 0.32, depth: 0.15 },
    door: { rise: 0.34, forward: 0.14, depth: 0.12, portalFinish: '#333d3b' },
    slats: { rows: 7, baseY: 0.36, forward: 0.205, widthInset: 0.10, height: 0.034, depth: 0.028, finish: '#a2a29a' },
    sill: { centerY: 0.19, forward: 0.52, widthAllowance: 0.35, height: 0.38, depth: 1.02 },
  },
  pedestrian: {
    wide: 2.55,
    standard: 1.12,
    frame: { y: 1.48, forward: 0.11, widthAllowance: 0.22, height: 2.28, depth: 0.19 },
    door: { y: 1.445, forward: 0.22, height: 2.11, depth: 0.06 },
    stepWidthAllowance: 1.05,
    steps: [
      { y: 0.18, forward: 0.46, height: 0.36, depth: 0.95, finish: '#a99a80' },
      { y: 0.09, forward: 1.10, height: 0.18, depth: 0.37, finish: '#b4a58b' },
    ],
  },
} as const

export const exteriorWindows = {
  floors: { apartments: 3, hospital: 2, standard: 1 },
  floorClearance: 0.5,
  extraFront: { minimumWidth: 12, widthFraction: 0.155 },
  flank: {
    positions: [-0.28, 0, 0.28],
    frame: { outside: 0.045, y: 2, size: [0.14, 1.30, 1.36] },
    pane: { outside: 0.128, y: 2.02, size: [0.035, 1.04, 1.13] },
  },
} as const

const canopyPostHeight = 2.96

export const streetCanopy = { widthRatio: 0.72, depth: 2.85, height: 3.17 }

export const saltwindCottageExterior = {
  width: 7.2,
  depth: 6.3,
  height: 3.35,
  cottagePaint: [['#edc280', '#ac6550'], ['#cba487', '#7a6254'], ['#a8b8a0', '#526f65']],
} as const

export const exteriorCanopy = {
  fabric: { count: 10, thickness: 0.15, rake: 0.10 },
  props: { sideInset: 0.12, eaveInset: 0.15, y: canopyPostHeight / 2, size: [0.15, canopyPostHeight, 0.15] },
  counter: {
    xFraction: 0.29,
    forward: 1.58,
    body: { y: 0.79, widthFraction: 0.33, height: 0.87, depth: 1.06, finish: '#967352' },
    top: { y: 1.29, widthFraction: 0.35, height: 0.15, depth: 1.24, finish: '#ca9e72' },
    tray: { y: 1.405, size: [2.05, 0.09, 0.88], finish: '#a57a55' },
    rail: { y: 1.45, z: 0.44, size: [2.1, 0.17, 0.055], finish: '#bb9268' },
    fruit: {
      x: [-0.62, 0, 0.62],
      z: 0.18,
      y: 1.52,
      size: [0.30, 0.26, 0.29],
      segments: 6,
      greens: '#87a858',
      orange: '#db9653',
    },
  },
} as const

const emergencyEmblemRed = '#bd5d50'

export const exteriorEmblems = {
  plaque: { forward: 0.22, belowWall: 0.45, size: [2.1, 1.05, 0.20] },
  medical: {
    crossbar: { forward: 0.12, size: [0.87, 0.24, 0.08] },
    upright: { forward: 0.17, size: [0.24, 0.74, 0.07] },
    finish: emergencyEmblemRed,
  },
  police: {
    shield: { forward: 0.14, diameter: 0.76, height: 0.12, sides: 5, pitch: Math.PI / 2, finish: '#406c82' },
    bar: { forward: 0.22, size: [0.31, 0.09, 0.05] },
  },
  fire: {
    handle: { x: 0.04, forward: 0.13, size: [0.13, 0.81, 0.07], rake: 0.76 },
    head: { x: 0.28, rise: 0.26, forward: 0.14, size: [0.3, 0.18, 0.07], rake: 0.66 },
    separation: 0.035,
    finish: emergencyEmblemRed,
  },
} as const

const utilityTower = { rise: 1.7, depthFraction: -0.24, width: 2.75 } as const

export const exteriorTower = {
  silhouettes: {
    church: { rise: 3.7, depthFraction: 0.30, width: 3.15 },
    school: utilityTower,
    fire: utilityTower,
  },
  fireOffset: 0.37,
  base: { drop: 1.6, height: 4.7 },
  spire: { rise: 1.55, topDiameter: 0.12, baseWidthRatio: 1.54, height: 2.04, sides: 4, heading: Math.PI / 4 },
  finial: { rise: 2.85, size: [0.12, 0.93, 0.12] },
  crossbar: { rise: 2.91, size: [0.62, 0.11, 0.12] },
  flag: { x: 0.34, rise: 3.14, size: [0.76, 0.39, 0.05], finish: '#d37352' },
} as const
