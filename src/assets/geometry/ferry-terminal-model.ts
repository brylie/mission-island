export const ferryTerminalFinishes = {
  steel: '#4c6461',
  barrier: '#aa622f',
  barrierStripe: '#f7cf79',
  freshWood: '#c79a63',
  weatheredWood: '#87674d',
  coastConcrete: '#92978b',
  brokenConcrete: '#7f8479',
  pileCap: '#8a8f86',
  scaffold: '#b8b2a4',
  handrail: '#d9d3c4',
  gantrySign: '#1f5d73',
  gantryLettering: '#f2ecd8',
  lampLit: '#ffe6a3',
  lampDark: '#6d6a60',
  openingSoon: '#f0b54b',
  serviceOpen: '#5aa66b',
  tallyBoard: '#e9e1c8',
  till: '#3f5d5a',
  timberSlip: '#f7f2e2',
  tallyEmpty: '#5d5a52',
  tallyComplete: '#7fbf7a',
  yardLine: '#ece5cf',
} as const

const slab = { drop: 0.08, thickness: 0.23 }
// The terminal and repaired landing share the same row of piles at the berth.
const berthPileOffsetZ = -7.9

export const ferryApproachModel = {
  slab,
  curb: { centerY: 0.44, offsetZ: 0.3, width: 0.18, height: 0.8, spanInset: 0.6 },
  pile: { centerDepthBelowWater: 0.85, offsetZ: berthPileOffsetZ, size: [0.32, 2.4, 0.32] },
} as const

export const ferryBarrierModel = {
  postInset: 0.12,
  raisedLift: 0.7,
  arm: { centerY: 0.78, height: 0.32, thickness: 0.19 },
  stripes: {
    x: [-2.2, -1.45, -0.7, 0.05, 0.8, 1.55, 2.3],
    centerY: 0.01,
    centerZ: 0.1,
    size: [0.24, 0.33, 0.02],
    roll: -0.42,
  },
} as const

// Longitudinal offsets start at the near end of the collision deck.
export const ferryLandingModel = {
  broken: {
    slab: { ...slab, offsetZ: -2, depth: 4 },
    boards: [
      { offsetZ: -4.3, roll: null },
      { offsetZ: -5, roll: null },
      { offsetZ: -5.7, roll: -0.065 },
      { offsetZ: -8, roll: 0.1 },
      { offsetZ: -8.7, roll: null },
      { offsetZ: -9.4, roll: null },
      { offsetZ: -10.1, roll: null },
    ],
    board: { riseAboveWater: 0.23, height: 0.22, depth: 0.66 },
    looseEnd: { offsetX: 0.62, drop: 0.16, widthLoss: 1.45 },
  },
  braced: {
    pileOffsetsZ: [-2.5, -5.2, berthPileOffsetZ, -10.5],
    edgeInset: 0.2,
    pile: { embedDepth: 1.2, capY: 0.1, size: [0.34, 1.4, 0.34] },
    pileCap: { centerY: 0.06, size: [0.5, 0.1, 0.5] },
    diagonal: { centerY: -0.45, offsetZ: -6.5, size: [0.12, 0.12, 8.2], tilt: 0.09 },
    tie: { height: 0.14, depth: 0.22 },
  },
  scaffold: {
    sideOffset: 3.3,
    uprights: { centerY: 1.2, offsetsZ: [-2, -9], size: [0.08, 2.6, 0.08] },
    ledger: { centerY: 2.3, offsetZ: -5.5, size: [0.08, 0.08, 7.2] },
  },
  deck: {
    plank: { endInset: 0.17, spacing: 0.36, drop: 0.06, widthClearance: 0.1, height: 0.12, depth: 0.32 },
    rail: { sideInset: 0.06, rise: 0.55, width: 0.1, height: 0.1 },
    posts: { endInset: 0.4, spacing: 2.7, centerY: 0.35, size: [0.1, 0.7, 0.1] },
  },
} as const

export const ferryGantryModel = {
  offsetZ: -2.2,
  uprights: { x: 3.6, y: 3.2, size: [0.26, 6.4, 0.26] },
  crossbeam: { y: 6.3, size: [7.5, 0.36, 0.3] },
  sign: { y: 5.7, z: 0.15, size: [3.4, 0.8, 0.08] },
  letters: { x: [-1.2, -0.4, 0.4, 1.2], z: 0.2, size: [0.42, 0.5, 0.02] },
  lamps: { x: 2.9, y: 5.95, z: 0.2, size: [0.34, 0.22, 0.2] },
  status: { y: 1.6, z: 0.2, size: [0.9, 0.6, 0.06] },
} as const

export const ferryTallyModel = {
  uprights: { x: [-0.95, 0.95], y: 0.95, size: [0.12, 1.9, 0.12] },
  panel: { y: 1.5, size: [1.9, 1.05, 0.06] },
  till: { y: 1.02, z: 0.08, size: [0.3, 0.26, 0.22] },
  timberSlip: { z: 0.06, size: [0.26, 0.34, 0.03] },
  cell: { z: 0.04, height: 0.1, thickness: 0.02 },
  pips: { startX: -0.4, spacing: 0.4, y: 1.88, width: 0.3 },
  bars: {
    startX: -0.8,
    span: 1.6,
    coins: { y: 1.6, cellGap: 0.02 },
    crates: { y: 1.3, cellGap: 0.04 },
  },
} as const

const pallet = { centerY: 0.07, height: 0.14 }

export const ferryYardModel = {
  pad: { centerY: 0.03, height: 0.06 },
  markings: { inset: 0.2, centerY: 0.065, thickness: 0.01, lineWidth: 0.12, frontOffsetX: 0.5 },
  pallet: { ...pallet, width: 2.6, depth: 1.4 },
  bundle: { count: 3, startX: -0.9, spacing: 0.9, centerY: 0.55, size: [0.84, 0.84, 1.3] },
  pickupPallet: { ...pallet, endClearance: 1.4, depth: 1.3 },
  pickupSign: {
    offsetX: 1.1,
    offsetZ: 0.2,
    post: { centerY: 0.7, size: [0.08, 1.4, 0.08] },
    board: { centerY: 1.3, size: [0.7, 0.45, 0.05] },
  },
} as const
