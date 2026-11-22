export const textureGallery = {
  cameraRadius: 10.9,
  sampleHeight: 0.57,
  palette: ['grass', 'gravel', 'sand', 'concrete', 'wood', 'stone', 'leaves', 'metal', 'water'],
  grid: { columns: 3, spacing: 2.48 },
  tile: { y: 0.07, size: [2.25, 0.14, 2.25] },
} as const

export const materialSample = {
  sphere: { y: 1.4, size: [2.8, 2.8, 2.8], segments: 36 },
  cylinder: { y: 1.4, diameter: 2.2, height: 2.8, sides: 64 },
  tile: { y: 0.1, size: [3.6, 0.2, 3.6] },
  block: { y: 1.25, size: [3.6, 2.5, 3.6] },
} as const

export const surfaceSwatch = {
  width: { min: 0.12, max: 2.4, repeats: 2.55 },
  cameraDistance: 1.5,
  cylinder: { diameterRatio: 0.65, heightRatio: 0.89, sides: 96 },
  tile: { centerRatio: 0.043, heightRatio: 0.086 },
} as const

export const surfaceGallery = {
  columns: 3,
  familySpacing: 4.65,
  sampleSpacing: 1.46,
  rowSpacing: 2.4,
  textureResolution: 128,
  tile: { centerRatio: 0.035, heightRatio: 0.07, displayWidth: 1.34, displayHeight: 0.85 },
  label: {
    offsetZ: 0.86,
    width: 256,
    height: 64,
    fontSize: 29,
    textWidth: 234,
    baseline: 43,
    ink: '#f0e9dc',
    background: '#233331',
    y: 0.09,
    halfWidth: 0.67,
    halfDepth: 0.155,
    triangles: [0, 2, 1, 0, 3, 2],
    uvs: [0, 1, 1, 1, 1, 0, 0, 0],
  },
} as const

export const surfaceFieldViews = {
  meadow: { location: { x: -9, z: 35.7 }, aboveGround: 0.12, radius: 5.4, alpha: 2.3, beta: 1.1 },
  trail: { location: { x: -45, z: -23 }, aboveGround: 0.08, radius: 3.1, alpha: 2.05, beta: 0.98 },
  dock: { z: -33.25, radius: 3.1, alpha: 0.88, beta: 0.98 },
} as const
