export interface OreStockpileProfile {
  rx: number
  rz: number
  height: number
  grain: number
  dust: string
  host: string
  seed: number
}

export const oreStockpileProfiles = {
  'magnetite-seam': { rx: 2.47, rz: 2.97, height: 1.71, grain: 0.19, dust: '#615d57', host: '#575a58', seed: 739 },
  'malachite-bloom': { rx: 2.02, rz: 2.59, height: 1.31, grain: 0.24, dust: '#7a7160', host: '#7e7968', seed: 1571 },
  'honey-calcite': { rx: 1.81, rz: 2.26, height: 1.06, grain: 0.28, dust: '#a89474', host: '#ab9678', seed: 1381 },
} as const satisfies Record<string, OreStockpileProfile>

export const stockpileSlope = {
  edgeSine: { frequency: 3, amplitude: 0.052 },
  edgeCosine: { frequency: 5, amplitude: 0.032 },
  crestOffset: { x: 0.22, z: 0.45 },
  bucketScoop: { facingPower: 5, depth: 0.24 },
} as const

// Crushed stones use the same fracture profile in a truck and on a stockpile.
export const brokenOreStone = {
  fracture: {
    minimumSides: 4,
    sideChoices: 3,
    cut: { base: 0.24, variation: 0.54 },
    cornerAngleJitter: 0.32,
    cornerRadius: { base: 0.76, variation: 0.24 },
  },
  foot: { dropPerRadius: 0.56, depthScale: 0.86 },
  crown: { widthScale: 0.42, cutWidthGain: 0.33, xOffsetPerRadius: 0.12, heightScale: 0.44, depthScale: 0.55 },
  uvShift: 5,
  shade: { base: 0.68, variation: 0.32, sideScale: 0.83, sideVariation: 0.17 },
} as const

export const oreTruckLoad = {
  grid: { rowSteps: 12, columnSteps: 6 },
  bedInset: { top: 0.13, width: 0.10, length: 0.32 },
  crest: { height: 0.37, rippleHeight: 0.17, rippleHalfTurns: 4, heightJitter: 0.09 },
  shade: { base: 0.82, variation: 0.15 },
  looseStone: { inset: 0.16, lift: 0.015, radius: { base: 0.37, variation: 0.43 }, flatness: 0.70 },
} as const

const firstShoulder = 0.24

export const stockpileArtwork = {
  fines: {
    contours: [0, firstShoulder, 0.53, 0.78, 1],
    splitFacesAfter: firstShoulder,
    samplesPerRing: 20,
    shade: { base: 0.83, variation: 0.12 },
  },
  stones: {
    slope: { count: 482, edgeFraction: 0.99 },
    spill: { count: 28, reachBeyondToe: 0.28, arcStartHalfTurns: 1.15, arcSpanHalfTurns: 0.7 },
    grain: { base: 0.28, power: 1.9, variation: 0.93, toeScale: 0.78, toeGain: 0.36 },
    lift: 0.018,
    oreShare: 0.43,
    flatness: { base: 0.54, variation: 0.53 },
  },
} as const
