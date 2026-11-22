// Published constants for converting OKLCH to sRGB hex. Björn Ottosson's
// OKLab matrices and the sRGB transfer function (IEC 61966-2-1).

// OKLab (L, a, b) to the cube roots of LMS cone responses.
export const oklabToLmsRoot = [
  [1, 0.3963377774, 0.2158037573],
  [1, -0.1055613458, -0.0638541728],
  [1, -0.0894841775, -1.291485548],
] as const

// The cone responses are the cube of those roots.
export const lmsRootExponent = 3

// LMS cone responses to linear sRGB.
export const lmsToLinearSrgb = [
  [4.0767416621, -3.3077115913, 0.2309699292],
  [-1.2684380046, 2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147, 1.707614701],
] as const

export const srgbTransfer = {
  linearLimit: 0.0031308,
  linearSlope: 12.92,
  scale: 1.055,
  offset: 0.055,
  gamma: 2.4,
} as const

export const degreesPerHalfTurn = 180

// A linear channel this far outside 0..1 still counts as displayable.
export const gamutTolerance = 1e-6

// Bisection for the largest in-gamut chroma at a lightness and hue.
export const chromaSearch = { ceiling: 0.4, steps: 24, split: 0.5 } as const

export const hexChannel = { max: 255, radix: 16, digits: 2 } as const
