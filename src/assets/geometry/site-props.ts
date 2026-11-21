export type SupportBox = readonly [width: number, depth: number, height: number, localX?: number, localZ?: number]

const rackWidth = 1.83
const rackPostHeight = 1.5
const planterRim = { width: 1.66, depth: 0.57, centerY: 0.30, height: 0.09 } as const
const crateBody = { width: 0.64, height: 0.52, depth: 0.53 } as const
const bottomCrate = { x: -0.36, y: 0.28, z: 0.02 } as const
const topCrate = { x: 0.30, y: 0.79, z: -0.07 } as const
const benchWidth = 1.7
const benchSeat = { depth: 0.54, top: 0.57, thickness: 0.12 } as const
const benchBack = { depth: 0.105, center: [0, 0.92, 0.22], thickness: 0.23 } as const
const benchLegX = [-0.65, 0.65] as const
const barrelModels = [{ x: -0.37, size: 0.81 }, { x: 0.34, size: 0.57 }] as const
const scopeBase = { diameter: 0.76, height: 0.16 } as const
const fallenLogLength = 2.4
const brokenBranch = { x: -0.45, z: 0.09, baseDiameter: 0.19 } as const
const cairnStones = [
  { x: 0, y: 0.10, width: 0.86, height: 0.25, turn: 0.4 },
  { x: 0.055, y: 0.31, width: 0.56, height: 0.19, turn: 1.1 },
  { x: 0.02, y: 0.46, width: 0.32, height: 0.13, turn: 2.3 },
] as const
const gaugePole = { width: 0.14, centerY: 0.65, height: 1.4 } as const
const gaugeTop = gaugePole.centerY + gaugePole.height / 2
const westernFin = {
  x: -1.73,
  z: 0.45,
  height: 2.08,
  outline: [[-0.94, -0.55], [-0.34, -1.32], [0.71, -0.94], [0.81, 0.96], [0.09, 1.44], [-0.78, 0.77]],
} as const
const easternFin = {
  x: 1.61,
  z: -0.22,
  height: 1.43,
  outline: [[-0.76, -1.09], [0.22, -1.21], [0.91, -0.35], [0.62, 0.82], [-0.12, 1.23], [-0.69, 0.72]],
} as const
const splitstoneCourses: readonly { level: number, width: number, color?: string }[] = [
  { level: -0.32, width: 1.04 },
  { level: 0.62, width: 0.98 },
  { level: 0.74, width: 0.95, color: '#c7a87f' },
]
const basketX = 0.66
const basketHandleZ = 0.01
const benchmarkCrossX = 0.025
const benchmarkCrossZ = 0.02
const shelterPostZ = 0.76
const shelterSignX = 0.89
const hoseCenterY = 0.86

// Support boxes approximate the visible models in local metres. Separate boxes retain stepped surfaces.
export const sitePropGeometry = {
  'splitstone': {
    fins: [westernFin, easternFin],
    courses: splitstoneCourses,
    bedding: { lean: 0.06, xSlope: 0.14, zSlope: 0.09 },
    cap: { width: 0.82, undulation: 0.22, xFrequency: 2 },
    supportBoxes: [[1.72, 2.55, 2.035, -1.72, westernFin.z], [1.55, 2.29, 1.385, easternFin.x, easternFin.z]],
  },
  'bench': {
    feet: { x: benchLegX, y: 0.25, size: [0.18, 0.50, 0.52] },
    seat: { center: [0, benchSeat.top - benchSeat.thickness / 2, 0], size: [benchWidth, benchSeat.thickness, benchSeat.depth] },
    backPosts: { x: benchLegX, y: 0.69, z: 0.21, size: [0.13, 0.44, 0.13] },
    back: { center: benchBack.center, size: [benchWidth, benchBack.thickness, benchBack.depth] },
    supportBoxes: [[benchWidth, benchSeat.depth, benchSeat.top], [benchWidth, benchBack.depth, 1.035, 0, benchBack.center[2]]],
  },
  'crates': {
    body: [crateBody.width, crateBody.height, crateBody.depth],
    positions: [bottomCrate, { x: 0.35, y: 0.28, z: -0.05 }, topCrate],
    face: { distance: 0.275, size: [0.60, 0.41, 0.04] },
    badge: { lift: 0.03, distance: 0.303, size: [0.22, 0.14, 0.026] },
    supportBoxes: [
      [crateBody.width, 0.6, bottomCrate.y + crateBody.height / 2, bottomCrate.x, bottomCrate.z],
      [crateBody.width, 0.61, topCrate.y + crateBody.height / 2, 0.33, -0.065],
    ],
  },
  'barrels': {
    bodies: barrelModels,
    walls: { centerRatio: 0.47, topRatio: 0.66, baseRatio: 0.72, heightRatio: 0.95 },
    hoops: [
      { centerRatio: 0.8, diameterRatio: 0.72, height: 0.07 },
      { centerRatio: 0.24, diameterRatio: 0.75, height: 0.07 },
    ],
    lid: { centerRatio: 0.94, topRatio: 0.67, baseRatio: 0.65, height: 0.05 },
    supportBoxes: [[0.61, 0.61, 0.79, barrelModels[0].x], [0.43, 0.43, 0.56, barrelModels[1].x]],
  },
  'rack': {
    posts: { x: [-0.83, 0.83], y: rackPostHeight / 2, size: [0.12, rackPostHeight, 0.15] },
    beam: { center: [0, 1.42, 0], size: [rackWidth, 0.12, 0.14] },
    netWarps: { x: [-0.53, -0.26, 0, 0.26, 0.53], y: 0.96, z: 0.035, size: [0.025, 0.76, 0.025] },
    netWefts: { y: [0.62, 0.82, 1.02, 1.22], z: 0.058, size: [1.08, 0.025, 0.026] },
    floats: { x: [-0.53, 0, 0.53], y: 0.58, z: 0.053, size: [0.12, 0.12, 0.16] },
    supportBoxes: [[rackWidth, 0.16, rackPostHeight]],
  },
  'planter': {
    trough: { center: [0, 0.15, 0], size: [1.6, 0.30, 0.5] },
    rim: { center: [0, planterRim.centerY, 0], size: [planterRim.width, planterRim.height, planterRim.depth] },
    stalks: { x: [-0.56, -0.28, 0, 0.28, 0.56], baseY: 0.34, z: 0.03, baseHeight: 0.21, variations: 3, heightStep: 0.035, diameters: [0.025, 0.041] },
    leaves: { xOffset: 0.066, y: 0.37, heightRatio: 0.54, z: 0.055, zOffset: 0.014, tilt: 1.02, turnStep: 0.61, size: [0.091, 0.17, 0.045], segments: 5 },
    blossom: [0.133, 0.046, 0.075],
    supportBoxes: [[planterRim.width, planterRim.depth, planterRim.centerY + planterRim.height / 2]],
  },
  'scope': {
    base: { center: [0, scopeBase.height / 2, 0], size: [0.69, scopeBase.diameter, scopeBase.height] },
    post: { center: [0, 0.53, 0], size: [0.18, 0.20, 0.90] },
    barrel: { center: [0, 1.02, 0], size: [0.56, 0.39, 0.81], elevation: 0.15 },
    glass: { center: [0, 1.09, -0.407], size: [0.24, 0.20, 0.06] },
    supportBoxes: [[scopeBase.diameter, scopeBase.diameter, scopeBase.height], [0.22, 0.22, 1], [0.48, 0.82, 1.27]],
  },
  'log': {
    trunk: { center: [0, 0.2, 0], size: [0.34, 0.52, fallenLogLength] },
    branch: { center: [brokenBranch.x, 0.44, brokenBranch.z], size: [0.11, brokenBranch.baseDiameter, 0.51], tilt: -0.56, rake: 0.35 },
    supportBoxes: [[fallenLogLength, 0.45, 0.42], [brokenBranch.baseDiameter, 0.2, 0.64, brokenBranch.x, brokenBranch.z]],
  },
  'cairn': {
    stones: cairnStones,
    topDiameterRatio: 0.72,
    depthScale: 0.75,
    supportBoxes: [
      [cairnStones[0].width, 0.65, cairnStones[0].y + cairnStones[0].height / 2],
      [cairnStones[1].width, 0.42, cairnStones[1].y + cairnStones[1].height / 2, cairnStones[1].x],
      [cairnStones[2].width, 0.24, cairnStones[2].y + cairnStones[2].height / 2, cairnStones[2].x],
    ],
  },
  'tide-staff': {
    splice: { center: [0.02, 0.27, 0.081], size: [0.155, 0.48, 0.057] },
    clamps: { x: 0.005, y: [0.115, 0.402], z: 0.029, size: [0.173, 0.044, 0.19] },
    frontMark: { center: [0.01, 1.11, -0.099], size: [0.122, 0.042, 0.025] },
    backMark: { center: [0.005, 1.055, 0.076], size: [0.13, 0.035, 0.024] },
    supportBoxes: [[0.18, 0.24, gaugeTop]],
  },
  'gauge': {
    pole: { center: [0, gaugePole.centerY, 0], size: [gaugePole.width, gaugePole.height, 0.13] },
    face: { center: [0, 0.72, -0.075], size: [0.13, 1.08, 0.025] },
    ticks: { x: -0.02, startY: 0.26, spacing: 0.1, z: -0.093, count: 10, short: 0.045, long: 0.09, height: 0.022, depth: 0.012 },
    supportBoxes: [[gaugePole.width, 0.18, gaugeTop]],
  },
  'picnic': {
    footings: { x: [-0.82, 0.82], y: 0.19, size: [0.38, 0.46, 0.68] },
    seat: { center: [0, 0.46, 0], size: [2.16, 0.13, 0.60] },
    cloth: { center: [basketX, 0.54, 0.015], size: [0.65, 0.035, 0.64] },
    basket: { center: [basketX, 0.685, 0.012], size: [0.40, 0.255, 0.31] },
    basketBands: { x: basketX, y: [0.622, 0.713], z: 0.012, size: [0.413, 0.025, 0.32] },
    handleUprights: { x: basketX, offsets: [-0.15, 0.15], y: 0.865, z: basketHandleZ, size: [0.028, 0.03, 0.13] },
    handleGrip: { center: [basketX, 0.93, basketHandleZ], size: [0.32, 0.04, 0.045] },
  },
  'benchmark': {
    base: { center: [0, 0.18, 0], size: [0.90, 1.15, 0.47], depthScale: 0.80, uvDiameter: 0.92 },
    stone: { center: [benchmarkCrossX, 0.65, benchmarkCrossZ], size: [0.53, 0.77, 0.66], depthScale: 0.86 },
    cap: { center: [benchmarkCrossX, 0.997, benchmarkCrossZ], size: [0.43, 0.48, 0.044] },
    meridian: { center: [benchmarkCrossX, 1.025, benchmarkCrossZ], size: [0.024, 0.019, 0.35] },
    crossbar: { center: [benchmarkCrossX, 1.026, benchmarkCrossZ], size: [0.215, 0.020, 0.022] },
  },
  'marker': {
    base: { center: [0, 0.13, 0], size: [0.95, 0.26, 0.72] },
    post: { center: [0, 0.58, 0], size: [0.49, 0.67, 0.40] },
    cap: { center: [0, 0.91, 0], size: [0.70, 0.13, 0.56] },
    badge: { center: [0, 0.98, 0], size: [0.26, 0.26, 0.04] },
  },
  'shelter': {
    posts: { x: [-1.42, 1.42], y: 1.17, z: [-shelterPostZ, shelterPostZ], size: [0.11, 2.34, 0.11] },
    roof: { center: [0, 2.37, 0], size: [3.18, 0.15, 1.94], rake: -0.06 },
    backSlats: { y: [0.53, 0.76, 0.99, 1.22], z: shelterPostZ, size: [2.81, 0.18, 0.08] },
    seat: { center: [0, 0.47, 0.44], size: [2.61, 0.12, 0.47] },
    seatLegs: { y: 0.22, z: 0.43, size: [0.12, 0.44, 0.35] },
    sign: { center: [shelterSignX, 1.58, 0.75], size: [0.55, 0.67, 0.09] },
    signFace: { center: [shelterSignX, 1.58, 0.69], size: [0.46, 0.58, 0.025] },
    signLines: { x: shelterSignX, firstY: 1.73, step: 0.10, z: 0.67, count: 4, size: [0.31, 0.019, 0.012] },
  },
  'lifebuoy': {
    post: { center: [0, 0.88, 0], size: [0.14, 1.76, 0.16] },
    hanger: { center: [0, 1.48, -0.08], size: [0.45, 0.08, 0.12] },
    ring: { y: 1.16, z: -0.19, radius: 0.34, segments: 16, angleDivisor: 8, stripePeriod: 4, paleSegments: 2, size: [0.155, 0.151, 0.13] },
  },
  'rail': {
    posts: { x: [-0.85, 0, 0.85], y: 0.36, size: [0.14, 0.72, 0.16] },
    cap: { center: [0, 0.68, 0], size: [1.91, 0.16, 0.13] },
    crossbar: { center: [0, 0.38, 0], size: [1.77, 0.09, 0.10] },
  },
  'pennant': {
    posts: { x: [-0.81, 0.81], y: 0.95, size: [0.12, 0.15, 1.9] },
    cord: { center: [0, 1.77, 0], size: [1.63, 0.035, 0.038] },
    flags: { x: [-0.55, -0.20, 0.18, 0.51], y: 1.58, stagger: 0.06, size: [0.21, 0.36, 0.045] },
  },
  'hose': {
    uprights: { x: [-0.72, 0.72], y: 0.65, size: [0.14, 1.32, 0.23] },
    beam: { center: [0, 1.23, 0], size: [1.60, 0.14, 0.24] },
    mounts: { x: [-0.36, 0.36], y: hoseCenterY, z: 0.135, size: [0.65, 0.65, 0.17] },
    coils: { y: hoseCenterY, width: 0.068, rings: [{ diameter: 0.57, z: 0.25 }, { diameter: 0.46, z: 0.29 }, { diameter: 0.35, z: 0.323 }] },
    nozzle: { xOffset: 0.24, y: 0.57, z: 0.31, size: [0.079, 0.095, 0.32], tilt: -0.23 },
  },
} as const

const jobBoardPanel = { width: 1.75, depth: 0.14, height: 0.93, centreY: 1.38 } as const
export const jobBoardGeometry = { panel: jobBoardPanel, supportBoxes: [[jobBoardPanel.width, jobBoardPanel.depth, 1.95]] } as const

const lampPole = { baseDiameter: 0.14, topDiameter: 0.10, height: 2.74, centreY: 1.37, segments: 8 } as const
export const streetLampGeometry = {
  pole: lampPole,
  arm: { y: 2.71, z: -0.17, size: [0.1, 0.09, 0.42] },
  hood: { y: 2.65, topDiameter: 0.21, baseDiameter: 0.39, height: 0.15, segments: 10 },
  bulb: { y: 2.53, z: -0.31, size: [0.24, 0.20, 0.24] },
  supportBoxes: [[lampPole.baseDiameter, lampPole.baseDiameter, lampPole.height]],
} as const

const umbrellaPole = { baseDiameter: 0.16, topDiameter: 0.12, height: 2.5, centreY: 1.25 } as const
export const beachUmbrellaGeometry = { pole: umbrellaPole, supportBoxes: [[umbrellaPole.baseDiameter, umbrellaPole.baseDiameter, 2.27]] } as const

export const shellRockProfile = { depthRatio: 0.65, height: 0.23, centreHeight: 0.055, supportHeight: 0.17 } as const
export const lichenStoneProfile = { depthRatio: 0.91, heightRatio: 0.74, centreHeightRatio: 0.23, headingPerMetre: 0.62 } as const
