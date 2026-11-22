const pocketWaterRadiusScale = 0.86

export const shellglassWaterShapes = {
  wash: { rx: 3.02, rz: 2.07 },
  rim: { steps: 38, rx: 3.15, rz: 2.22, yOffset: 0.024, alphaIndex: 1 },
  fan: { segments: 64, alphaIndex: 2 },
  pocket: {
    segments: 18,
    ringScales: [1.16, pocketWaterRadiusScale, 0.66],
    waterRadiusScale: pocketWaterRadiusScale,
    scallop: { innerFrequency: 3, innerAmplitude: 0.09, outerFrequency: 5, outerAmplitude: 0.07, outerPhaseStep: 2 },
    floorInset: 0.014,
    rimLift: 0.013,
    rimAboveWater: 0.028,
    rimVariation: 0.019,
    rimFrequency: 3,
    colors: ['#6a7866', '#77806b'],
  },
} as const

export const shellglassWrack = {
  count: 24,
  firstAngle: 0.65,
  angleStep: 0.123,
  search: { innerRadius: 0.55, step: 0.015, aboveHighWater: 0.012 },
  yOffset: 0.025,
  width: 0.19,
  widthJitter: 0.08,
  jitterFrequency: 1.7,
  height: 0.065,
  depth: 0.093,
  colors: { green: '#657049', dry: '#786c40', greenEvery: 3 },
  segments: 5,
} as const

export const shellglassStaffWaterMark = {
  strip: { shape: [0, 0.19, -0.14, 0.10, 1, 0.012], color: '#3b7e7c' },
  cap: { shape: [0, 0.35, -0.148, 0.134, 0.038, 0.012], color: '#c7e7ca' },
  scale: { minimum: 0.05, span: 0.60, baseY: 0.16 },
} as const
