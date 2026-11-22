export const environmentalMaterialPriority = 180

export const shaderPresets = {
  clearWater: { clarity: 1.35 },
  surfWash: { foamReach: 0.34 },
  seaBreeze: { gust: 0.65 },
  rollingMeadow: { grassDistance: 26, patchContrast: 0.32 },
  rainPolished: { wetness: 1, reflection: 0.72 },
  dawnSilver: { mistDensity: 1, scattering: 1.5 },
} as const
