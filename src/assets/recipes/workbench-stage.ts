const highSun = [0.55, -1, 0.6] as const
const lowSun = [1, -0.17, 0.35] as const
export const studioLightingPresets = {
  daylight: { ambient: 0.58, sun: 0.86, color: '#fff3d7', direction: highSun },
  overcast: { ambient: 0.92, sun: 0.22, color: '#dbeafa', direction: highSun },
  grazing: { ambient: 0.48, sun: 1.1, color: '#fff0d6', direction: lowSun },
  dusk: { ambient: 0.06, sun: 0.05, color: '#a9bddb', direction: lowSun },
  golden: { ambient: 0.5, sun: 0.92, color: '#ffd6a5', direction: [1, -0.46, 0.55] },
} as const

export const studioCrewLighting = { ambientDaylight: 0.84, keyDirectionZ: -1.3, shadows: 0.50, lightZ: 16 } as const

export const studioCamera = {
  alpha: 0.88,
  beta: 1.1,
  fov: 0.8,
  topBeta: 0.04,
  smallSampleRadius: 1,
  smallSampleMinimumHeight: 0.01,
  minimumSubjectHeight: 0.4,
  aimHeightRatio: 0.43,
  landscapeRadius: 24,
  landscapeFocusHeight: 0.25,
  biomeRadiusScale: 1.15,
  subjectRadius: { min: 3, spanScale: 1.55, heightScale: 0.6 },
  zoom: { minRadius: 0.55, closeMin: 0.02, closeScale: 0.15, minSpanScale: 0.12, range: 450, rangeScale: 5, wheelStep: 0.045 },
  orbit: { minBeta: 0.035, nadirInset: 0.06, panSensitivity: 840, panSpan: 5, turntableRate: 0.38 },
  clipping: { closeNear: 0.004, near: 0.025, nearSpanDivisor: 2000, landscapeFar: 950, far: 600, farRadiusScale: 8, fieldNear: 0.04, fieldNearDivisor: 360 },
  fit: { aspect: 0.92, minAspect: 0.3 },
  // A rebuild that changes the default orbit radius by more than this factor reframes the subject.
  reframeRatio: 1.35,
} as const

export const studioGrid = {
  minimumSpan: 14,
  spanScale: 2.25,
  coarseThreshold: 45,
  coarseSpacing: 5,
  mediumThreshold: 12,
  mediumSpacing: 2,
  lift: 0.005,
  opacity: 0.21,
  color: '#758d86',
  ground: { drop: 0.19, thickness: 0.36 },
} as const

export const studioSunlight = { x: -14, z: -16, minimumHeight: 21, biomeShadowRange: 160, shadowRange: 55, shadowSpanScale: 4 } as const

export const studioFieldAtmosphere = { saltwindSkySize: 3350, saltwindFogScale: 7, defaultHour: 13 } as const

export const studioPlayback = { stepHz: 60, maximumFrameSeconds: 0.08, millisecondsPerSecond: 1000 } as const
