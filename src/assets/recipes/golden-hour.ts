// Golden hour light curves. Light colors belong to the lighting preset, never
// to material families. See docs/design/color-direction.md#light-and-grade.

export type Rgb = readonly [number, number, number]

export const goldenHourPreset = {
  // Sun elevation (sin of altitude) where warming begins.
  startElevation: 0.36,
  // Below the horizon the effect fades out, leaving dusk and night as they were.
  fadeBelowHorizon: 0.1,
  noonSun: [1, 0.953, 0.843] as Rgb, // #fff3d7
  goldSun: [1, 0.78, 0.5] as Rgb, // #ffc780
  emberSun: [1, 0.5, 0.26] as Rgb, // #ff8042
  noonFill: [1, 1, 1] as Rgb,
  // A soft blue: a saturated fill turns green ground muddy.
  coolFill: [0.702, 0.761, 0.902] as Rgb, // #b3c2e6
  // How far the fill dims at full golden hour, so the warm key reads while
  // the meadow stays green-gold rather than going to dusk early.
  fillDimming: 0.3,
  // Share of the warming spent reaching gold; ember arrives only near the horizon.
  goldShare: 0.6,
  // Low sun still carries most of its strength through clear air, so lift
  // the key above the plain elevation falloff while it is warm.
  sunBoost: 1.5,
  // Warm haze toward which fog and the horizon lean.
  haze: [0.93, 0.7, 0.52] as Rgb, // #edb385
  hazeStrength: 0.3,
} as const
