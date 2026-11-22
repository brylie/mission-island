export const marketAwningGeometry = {
  halfWidth: 1.465,
  backHeight: 3.13,
  hemHeight: 2.87,
  clothSag: 0.04,
  spout: { beyondEdge: 0.045, height: 2.73, aheadOfHem: 0.13 },
  splashOffset: 0.031,
  gutter: { aheadOfHem: 0.057, lowEndHeight: 2.783, slope: 0.019 },
  catchRise: 0.032,
  grateRise: 0.016,
} as const

export const marketAwningFabric = {
  stripeCount: 7,
  panelsPerStripe: 6,
  colors: [
    { dry: '#e5b087', wet: '#99765d' },
    { dry: '#bd654f', wet: '#844838' },
  ],
  hem: { belowEdge: 0.057, insetZ: 0.0125, widthGap: 0.007, height: 0.121, alternateDrop: 0.009, depth: 0.025 },
  seam: { startFromBack: 0.115, count: 7, spacing: 0.177, lift: 0.004, size: [0.012, 0.008, 0.060], pitch: 0.17, color: '#d6a482' },
  patch: {
    x: -1.16,
    beforeHem: 0.91,
    lift: 0.013,
    size: [0.25, 0.015, 0.22],
    pitch: 0.18,
    heading: 0.085,
    color: '#d79a76',
    stitches: { x: [-0.091, 0.10], firstZ: -0.069, count: 3, spacing: 0.065, lift: 0.026, size: [0.036, 0.008, 0.015], heading: -0.25, color: '#f0ce9e' },
  },
  support: {
    x: 1.33,
    rafter: { startFromBack: 0.045, contactFromBack: 0.075, belowCloth: 0.092, belowHem: 0.078, width: 0.072, thickness: 0.089, color: '#805c49' },
    brace: { startFromBack: 0.055, endFromBack: 0.845, startY: 2.52, endY: 2.84, width: 0.052, thickness: 0.058, color: '#977157' },
  },
} as const

const rainChainMetal = '#aa805d'
const rainChainLink = '#876951'
export const marketAwningDrainage = {
  gutter: {
    endOverhang: 0.035,
    color: '#6a8e83',
    pieces: [
      { z: 0, lift: 0, width: 0.11, thickness: 0.031 },
      { z: -0.049, lift: 0.040, width: 0.023, thickness: 0.069 },
      { z: 0.049, lift: 0.036, width: 0.024, thickness: 0.069 },
    ],
    straps: {
      positions: [{ x: -1.28, color: '#758072' }, { x: -0.27, color: '#ba895e' }, { x: 1.22, color: '#758072' }],
      lift: 0.004,
      size: [0.045, 0.056, 0.143],
    },
    rivet: { lift: 0.026, z: 0.076, diameter: 0.025, height: 0.014, sides: 8, color: '#cfa277' },
    outlet: { x: 0.028, rise: 0.06, width: 0.096, thickness: 0.060, color: '#a77354' },
  },
  chain: {
    firstDrop: 0.25,
    spacing: 0.265,
    count: 9,
    length: 0.267,
    width: 0.023,
    depth: 0.022,
    color: rainChainLink,
    hanger: { aboveSpout: 0.012, overlap: 0.016, width: 0.031, thickness: 0.030 },
    collar: { drop: 0.035, top: 0.065, bottom: 0.050, height: 0.049, color: rainChainMetal },
    cup: { drop: 0.058, top: 0.090, bottom: 0.051, height: 0.062, every: 2, accentIndex: 4, color: rainChainMetal, accent: '#759184' },
    sides: 9,
  },
  runnel: {
    bed: { drop: 0.011, width: 0.255, depth: 0.018, color: '#827c6b' },
    edging: {
      count: 5,
      firstFraction: 0.47,
      rise: 0.004,
      x: 0.16,
      variation: 0.011,
      ripple: 2,
      yawRate: 3,
      yaw: 0.10,
      width: 0.092,
      height: 0.040,
      gap: 0.009,
      colors: ['#c8b99c', '#b9aa89'],
    },
  },
  splashStone: { rise: 0.014, z: -0.03, size: [0.45, 0.033, 0.26], color: '#a69c83' },
  grate: {
    frame: { drop: 0.004, size: [0.36, 0.023, 0.25], color: '#545b54' },
    bars: { positions: [-2, -1, 0, 1, 2], spacing: 0.048, rise: 0.012, size: [0.319, 0.013, 0.018], color: '#9b9b82' },
    leaf: { x: 0.094, rise: 0.024, z: -0.03, size: [0.061, 0.008, 0.109], heading: -0.46, color: '#ac754c' },
  },
} as const
