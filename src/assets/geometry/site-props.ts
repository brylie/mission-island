export type SupportBox = readonly [width: number, depth: number, height: number, localX?: number, localZ?: number]

const rackWidth = 1.83
const planterRim = { width: 1.66, depth: 0.57 } as const
const crateWidth = 0.64
const bench = { width: 1.7, seatDepth: 0.54, backDepth: 0.105, backZ: 0.22 } as const
const barrelModels = [{ x: -0.37, size: 0.81 }, { x: 0.34, size: 0.57 }] as const
const scopeBaseDiameter = 0.76
const fallenLog = { length: 2.4, branchX: -0.45, branchZ: 0.09 } as const
const cairnStones = [
  { x: 0, y: 0.10, width: 0.86, height: 0.25, turn: 0.4 },
  { x: 0.055, y: 0.31, width: 0.56, height: 0.19, turn: 1.1 },
  { x: 0.02, y: 0.46, width: 0.32, height: 0.13, turn: 2.3 },
] as const
const gaugePoleWidth = 0.14

// The support boxes approximate the visible models in local metres. Separate boxes allow for stepped surfaces.
export const sitePropGeometry = {
  'splitstone': {
    fins: [
      { x: -1.73, z: 0.45, height: 2.08, outline: [[-0.94, -0.55], [-0.34, -1.32], [0.71, -0.94], [0.81, 0.96], [0.09, 1.44], [-0.78, 0.77]] },
      { x: 1.61, z: -0.22, height: 1.43, outline: [[-0.76, -1.09], [0.22, -1.21], [0.91, -0.35], [0.62, 0.82], [-0.12, 1.23], [-0.69, 0.72]] },
    ],
    supportBoxes: [[1.72, 2.55, 2.035, -1.72, 0.45], [1.55, 2.29, 1.385, 1.61, -0.22]],
  },
  'bench': {
    ...bench,
    supportBoxes: [[bench.width, bench.seatDepth, 0.57], [bench.width, bench.backDepth, 1.035, 0, bench.backZ]],
  },
  'crates': {
    width: crateWidth,
    positions: [[-0.36, 0.28, 0.02], [0.35, 0.28, -0.05], [0.30, 0.79, -0.07]],
    supportBoxes: [[crateWidth, 0.6, 0.54, -0.36, 0.02], [crateWidth, 0.61, 1.05, 0.33, -0.065]],
  },
  'barrels': {
    bodies: barrelModels,
    supportBoxes: [[0.61, 0.61, 0.79, barrelModels[0].x], [0.43, 0.43, 0.56, barrelModels[1].x]],
  },
  'rack': { width: rackWidth, supportBoxes: [[rackWidth, 0.16, 1.5]] },
  'planter': { rim: planterRim, supportBoxes: [[planterRim.width, planterRim.depth, 0.345]] },
  'scope': { baseDiameter: scopeBaseDiameter, supportBoxes: [[scopeBaseDiameter, scopeBaseDiameter, 0.16], [0.22, 0.22, 1], [0.48, 0.82, 1.27]] },
  'log': { ...fallenLog, supportBoxes: [[fallenLog.length, 0.45, 0.42], [0.19, 0.2, 0.64, fallenLog.branchX, fallenLog.branchZ]] },
  'cairn': {
    stones: cairnStones,
    supportBoxes: [
      [cairnStones[0].width, 0.65, 0.225],
      [cairnStones[1].width, 0.42, 0.405, cairnStones[1].x],
      [cairnStones[2].width, 0.24, 0.525, cairnStones[2].x],
    ],
  },
  'tide-staff': { clampHeights: [0.115, 0.402], supportBoxes: [[0.18, 0.24, 1.35]] },
  'gauge': { poleWidth: gaugePoleWidth, supportBoxes: [[gaugePoleWidth, 0.18, 1.35]] },
} as const

const jobBoardPanel = { width: 1.75, depth: 0.14, height: 0.93, centreY: 1.38 } as const
export const jobBoardGeometry = { panel: jobBoardPanel, supportBoxes: [[jobBoardPanel.width, jobBoardPanel.depth, 1.95]] } as const

const lampPole = { baseDiameter: 0.14, topDiameter: 0.10, height: 2.74, centreY: 1.37 } as const
export const streetLampGeometry = {
  pole: lampPole,
  bulb: { y: 2.53, z: -0.31 },
  supportBoxes: [[lampPole.baseDiameter, lampPole.baseDiameter, lampPole.height]],
} as const

const umbrellaPole = { baseDiameter: 0.16, topDiameter: 0.12, height: 2.5, centreY: 1.25 } as const
export const beachUmbrellaGeometry = { pole: umbrellaPole, supportBoxes: [[umbrellaPole.baseDiameter, umbrellaPole.baseDiameter, 2.27]] } as const

export const shellRockProfile = { depthRatio: 0.65, height: 0.23, centreHeight: 0.055, supportHeight: 0.17 } as const
export const lichenStoneProfile = { depthRatio: 0.91, heightRatio: 0.74, centreHeightRatio: 0.23, headingPerMetre: 0.62 } as const
