export const landscapeMapArt = {
  sea: '#23494e',
  coast: [
    { radius: 1.07, color: '#2b595a' },
    { radius: 1.025, color: '#427471' },
    { radius: 1, color: '#c9b987' },
  ],
  terrain: {
    coastInset: 0.966,
    samplePixels: 4,
    elevationScale: 15,
    slopeSampleOffset: 1.4,
    slopeContrast: 28,
    minLight: -10,
    maxLight: 14,
    lowland: { red: 113, green: 147, blue: 97 },
    elevationTint: { red: 68, green: 31, blue: 46 },
    submerged: '#558780',
  },
  tree: { minRadius: 2, sizeScale: 0.34, color: '#456d50' },
  prop: { minRadius: 1.6, sizeScale: 0.68, tree: '#4a7155', rock: '#9a9e80' },
  paths: { trail: '#c4b98c', walkway: '#c8caab' },
  road: { outsideWidth: 6.8, insideWidth: 4.9, edge: '#534f45', surface: '#b5ab90' },
  dock: { endInset: 0.3, color: '#a98a64' },
  building: '#e2c8a0',
} as const

export const landscapeMapGuides = {
  color: '#f1e6bb',
  north: {
    label: { edge: 33, y: 34, font: 'bold 20px system-ui' },
    outline: [[33, 45], [41, 65], [33, 60], [25, 65]],
  },
  scale: {
    distances: [25, 10, 5, 2, 1],
    widthFraction: 0.14,
    x: 23,
    label: { bottom: 33, font: '18px system-ui' },
    bar: { bottom: 24, thickness: 3 },
  },
} as const

export const landscapeMapTracking = {
  focusRing: { radius: 12, outline: 6, width: 3, edge: '#203d3c', color: '#f5fff1' },
  crosshair: { radius: 10, width: 2, color: '#ffdf91' },
} as const
