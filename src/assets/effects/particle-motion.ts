// Motion styling shared by the authored particle recipes.
export const particleMotionStyle = {
  windTilt: 0.08,
  orbitPeel: 0.73,
  flutter: { frequency: 7, ramp: 4, crossAxis: 0.42 },
  reboundTravel: 0.6,
  stretchStartsAt: 0.24,
  wingbeat: { minimumWidth: 0.31, widthVariation: 0.69 },
} as const
