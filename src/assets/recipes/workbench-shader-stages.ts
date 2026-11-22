type SliderBounds = readonly [minimum: number, maximum: number, step: number]

export const previewShaderSliders = {
  clarity: [0, 2.5, 0.05],
  foamReach: [0, 0.75, 0.01],
  gust: [0, 1.8, 0.05],
  grassDistance: [6, 80, 1],
  patchContrast: [0, 0.55, 0.01],
  wetness: [0, 1, 0.01],
  reflection: [0, 1.5, 0.01],
  hour: [4, 10, 0.1],
  mistDensity: [0, 1.5, 0.05],
  scattering: [0, 3, 0.1],
  response: [0, 1, 0.01],
} as const satisfies Record<string, SliderBounds>

export const previewShaderComparisons = {
  cloudedWater: { clarity: 0.25 },
  smallWash: { foamReach: 0.12 },
  bladeDetail: { grassDistance: 65, patchContrast: 0.1 },
} as const

export const previewShaderPlayback = {
  effects: { duration: 16, rainLimit: 0.22, groundColor: '#435749', waterGroundHeight: -1.58 },
  shore: { duration: 24, angle: -2.04, cameraBeta: 0.94, cameraRadius: 9.2, focusLift: 0.05, ground: { height: -1.9, color: '#5c7c77' }, hour: 11.5 },
  meadow: { duration: 24, angle: -2.37, cameraBeta: 1.34, hour: 15 },
  foliageWind: { cameraBeta: 1.15, cameraRadius: 4.4, grassDistance: 90 },
  paving: { angle: -2.78, cameraBeta: 1.37, cameraRadius: 7.5, hour: 13 },
  dawnMist: { angle: 0.30, cameraBeta: 1.52, cameraRadius: 23, duration: 24, hour: 6.6 },
} as const
