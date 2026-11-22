export const farmPlotGeometry = {
  earth: { centreY: 0.025, height: 0.05, color: '#788e62' },
  edging: { centreY: 0.054, xMargin: 0.039, zMargin: 0.037, thickness: 0.066, height: 0.081, sideExtension: 0.17, color: '#aa8562' },
  furrow: { rows: [-0.49, 0, 0.49], centreY: 0.053, size: [0.095, 0.03, 1.34], color: '#694935' },
  carrot: {
    rows: [-0.47, 0, 0.47],
    columns: [-0.46, 0, 0.46],
    crown: { centreY: 0.073, size: [0.131, 0.11, 0.131], color: '#e89951' },
    leaf: { offset: 0.038, centreY: 0.14, size: [0.048, 0.18, 0.052], color: '#6ba463', tilt: 0.42 },
    segments: 5,
  },
  cultivatedSoil: { dry: '#98704f', wet: '#6e4a38' },
} as const

export const farmOrderSignGeometry = {
  timber: '#6a5039',
  post: { centreY: 0.48, size: [0.075, 0.96, 0.075] },
  board: { centreY: 0.93, size: [1.05, 0.32, 0.1] },
  face: {
    halfWidth: 0.495,
    halfDepth: 0.052,
    lowerY: 0.805,
    upperY: 1.055,
    indices: [0, 1, 2, 0, 2, 3],
    uvs: [0, 0, 1, 0, 1, 1, 0, 1],
  },
  label: { width: 512, height: 128, baseline: 85, font: 'bold 62px sans-serif', ink: '#fcebd0', background: '#325b50' },
} as const
