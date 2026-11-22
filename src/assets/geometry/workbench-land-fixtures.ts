export const seedParachuteStage = {
  ground: { y: -0.035, size: [4.6, 0.07, 2.4], color: '#6b8052' },
  crew: { x: -1.46, z: 0.56, id: 1 },
  flowers: {
    count: 9,
    columns: 3,
    x: -0.37,
    z: -0.36,
    columnSpacing: 0.37,
    rowSpacing: 0.28,
    height: 0.59,
    heightVariation: 0.19,
    variationFrequency: 2.4,
    stem: { top: 0.025, bottom: 0.034, sides: 6, color: '#66794a' },
    head: { size: [0.19, 0.18, 0.19], color: '#e9d9a7', segments: 7 },
  },
} as const

export const wetFernStage = {
  ground: { y: -0.044, size: [4.5, 0.088, 2.8], color: '#677853' },
  crew: { x: -0.78, z: -0.31, id: 1, heading: 1.02 },
} as const

export const hoeStage = {
  plot: { x: -0.36, z: 0.65 },
  crew: { x: 0.37, z: -0.49 },
} as const

export const harvestChaffStage = {
  crew: { x: -0.7, z: 0.11, heading: 0.62 },
  ground: { y: -0.039, z: 0.14, size: [3.6, 0.078, 2.8], color: '#897756' },
  bundle: {
    count: 14,
    columns: 4,
    columnCentre: 1.4,
    rowCentre: 1.5,
    columnSpacing: 0.075,
    rowSpacing: 0.069,
    height: 0.52,
    heightVariation: 0.13,
    variationFrequency: 4,
    stem: { y: 0.03, top: 0.026, bottom: 0.033, sides: 6, color: '#b79952' },
    head: { heightRatio: 0.51, size: [0.075, 0.177, 0.082], colors: ['#cda358', '#d8b75d'] },
    base: { y: 0.015, size: [0.32, 0.08, 0.31], color: '#8c6d46' },
  },
  stubble: {
    count: 9,
    x: 1.16,
    z: -0.52,
    xVariation: 0.28,
    zVariation: 0.51,
    xFrequency: 2.4,
    zFrequency: 1.66,
    stem: { y: 0.18, top: 0.022, bottom: 0.024, height: 0.36, sides: 5, color: '#a58c4e' },
  },
} as const

export const takeoffFeatherStage = {
  crew: { x: -1.47, z: -0.6, id: 1, heading: 1.28 },
  bird: { color: '#eae4cd', heading: 1.18, scale: 1.1 },
  rock: { x: -0.22, z: 0.3, size: 0.83, heading: 0.68 },
} as const

export const carrotPullStage = {
  crew: { x: -0.32, z: -0.65, heading: 0.83 },
  row: { x: -0.32, z: 0.055 },
} as const

export const hiveTrafficStage = {
  crew: { x: -1.25, z: -0.42, id: 1 },
} as const

export const cloverStepStage = {
  ground: { y: -0.039, size: [4.25, 0.078, 2.5], color: '#698557' },
  patches: { count: 5, x: -0.61, z: -0.94, spacing: 0.43, xVariation: 0.072, zVariation: 0.094, xFrequency: 8, zFrequency: 3 },
} as const

export const looseSlateStage = {
  slope: { x: -0.31, y: 0.41, z: -0.25, size: [1.83, 0.21, 2.8], pitch: 0.26, color: '#707d82' },
  ground: { x: -0.27, y: -0.04, size: [4.2, 0.085, 4.35], color: '#637075' },
  slabs: {
    count: 8,
    x: -0.61,
    y: 0.52,
    z: -0.9,
    spacing: 0.285,
    xVariation: 0.46,
    xFrequency: 2.2,
    size: [0.48, 0.11, 0.38],
    colors: ['#62747c', '#7c8d93'],
    yawStep: 0.92,
    roll: -0.11,
  },
  rock: { x: -1.53, z: 0.98, size: 0.78, heading: 0.93 },
  crew: { x: 1.11, z: 0.35, id: 1 },
} as const

export const hedgeClippingStage = {
  shrubs: {
    count: 7,
    centreIndex: 3,
    spacing: 0.46,
    y: 0.76,
    yVariation: 0.095,
    variationFrequency: 3,
    z: 0.32,
    size: [0.78, 1.34, 1.02],
    colors: ['#527343', '#66854d'],
    segments: 8,
  },
  crew: { x: -0.54, z: 1.27 },
  shears: {
    handle: { z: -0.219, size: [0.059, 0.052, 0.438], color: '#98835f' },
    blade: { z: 0.158, size: [0.081, 0.027, 0.327], color: '#a0ada4' },
  },
} as const
