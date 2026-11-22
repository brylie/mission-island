export const cellularChips = {
  center: 0.18,
  jitter: 0.65,
  seed: { x: 32, y: 43, tone: 18 },
  face: { x: 1.8, y: 0.95, threshold: 0.04 },
  gap: { inset: 0.04, contrast: 3.4 },
  shade: { base: 0.42, tone: 0.35, face: 0.23 },
} as const

export const tiledLeaves = {
  lanes: 10,
  seed: 81,
  angle: { spread: 2.4, base: 0.72 },
  blade: { length: 0.535, width: 0.19, widthVariation: 0.095, softness: 38 },
  midribSharpness: 34,
  veins: { slant: 0.76, repeat: 48, sharpness: 3.7 },
  shade: { blade: 0.44, variation: 0.29, midrib: 0.17, veins: 0.105 },
} as const

export const surfaceNoise = {
  fine: { cells: 48, seed: 8 },
  broad: { cells: 6, seed: 3 },
  fractal: { cells: 16, seed: 6, broad: 0.42, middle: 0.36, fine: 0.22 },
  ripple: { frequency: 9, distortion: 0.55 },
  chips: { cells: 18, chips: 0.91, fine: 0.09 },
  rippleFinish: { ripple: 0.72, fine: 0.28 },
  sand: { ripple: 0.39, fine: 0.24, fractal: 0.37 },
  grass: { cells: 64, seed: 10, fractal: 0.61, speckle: 0.39 },
  leaves: { leaves: 0.77, fractal: 0.23 },
  wood: { stretch: 4, cells: 12, seed: 51, grain: 0.52, lines: 0.48, striations: 25 },
  metal: { stretch: 7, cells: 17, seed: 52, grain: 0.7, fine: 0.3 },
  concrete: { cells: 24, seed: 37, fine: 0.6, chips: 0.4 },
  water: { ripple: 0.52, fractal: 0.48 },
  default: { fractal: 0.7, fine: 0.3 },
} as const

export const weatheredMetalSample = {
  broad: { cells: 7, seed: 70, weight: 0.69 },
  fine: { cells: 21, seed: 53, weight: 0.31 },
  oxidation: { threshold: 0.95, gain: 1.02, contrast: 6 },
  roughness: { base: 0.16, abrasionGain: 0.51, oxidized: 0.91 },
} as const

export const surfaceMapFinish = {
  oxidizedRoughnessGain: 0.55,
  roughAccentGain: 0.14,
  recessRoughnessGain: 0.09,
  oxideMetalLoss: 0.88,
} as const

export const surfacePresets = {
  water: { name: 'Water', color: '#237d8b', pattern: 0, scale: 1 },
  gravel: { name: 'Gravel', color: '#c4b285', pattern: 1, scale: 1.6 },
  sand: { name: 'Sand', color: '#e1c580', pattern: 2, scale: 1 },
  concrete: { name: 'Concrete', color: '#b9bdbb', pattern: 3, scale: 1.3 },
  wood: { name: 'Wood', color: '#78573a', pattern: 4, scale: 1 },
  stone: { name: 'Stone', color: '#939d89', pattern: 5, scale: 1 },
  leaves: { name: 'Leaves', color: '#5c904c', pattern: 6, scale: 1 },
  metal: { name: 'Metal', color: '#647975', pattern: 7, scale: 1.6 },
  grass: { name: 'Grass', color: '#739856', pattern: 8, scale: 1.35 },
} as const

export const materialDetail = {
  relief: { gravel: 2.4, concrete: 1.25, metal: 0.9, wood: 0.75, default: 0.44 },
  contrast: { gravel: 0.65, concrete: 0.35, default: 0.36 },
  roughness: { gravel: 0.97, concrete: 0.87, metal: 1 },
  metalAbrasion: 0.34,
} as const

export const studioReflectionLook = {
  resolution: 32,
  panel: { hiddenFace: 3, left: 5, right: 23, top: 4, bottom: 15, brightness: 247 },
  ambient: { floor: 46, brighterFace: 2, brighterAdd: 69, standardAdd: 19, heightGradient: 2 },
  tint: { red: 0.93, green: 0.98 },
} as const
export const surfaceTextureResolution = { preview: 128, full: 256 } as const
export type SurfaceTextureResolution = typeof surfaceTextureResolution[keyof typeof surfaceTextureResolution]
