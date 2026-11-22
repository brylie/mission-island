// The model origin is on the ground. Local +Z is forward, +Y up, and +X right.
const helicopterSpan = 10.2
const airplaneSpan = 10.8

export const saltwindVehicleDimensions = {
  ambulance: { name: 'Ambulance', width: 2.32, length: 6.1, height: 2.9, track: 1.78, axles: [-1.75, 1.95], wheel: 0.40 },
  engine: { name: 'Fire engine', width: 2.55, length: 8.2, height: 3.25, track: 2.06, axles: [-2.62, -1.42, 2.7], wheel: 0.52 },
  patrol: { name: 'Patrol car', width: 1.92, length: 4.75, height: 1.65, track: 1.48, axles: [-1.49, 1.37], wheel: 0.32 },
  logger: {
    name: 'Logging truck',
    width: 2.55,
    length: 10.2,
    height: 3.6,
    track: 2.04,
    axles: [-3.6, -2.35, 3.28],
    wheel: 0.54,
    cargo: { width: 2.22, length: 6.55, height: 1.9, floor: 1.29, z: -1.35 },
  },
  helicopter: { name: 'Rescue helicopter', width: helicopterSpan, length: 11.65, height: 3.35, skids: [-0.90, 0.90] },
  airplane: { name: 'Utility airplane', width: airplaneSpan, length: 7.6, height: 2.8, gear: [[-0.98, 0.4], [0.98, 0.4], [0, 2.42]] },
} as const

// Fleet trim (glass, rubber, frame, lamps) comes from the shared vehicle kit.
export const saltwindVehiclePaint = {
  cream: '#fff0d0',
  steel: '#8da3a0',
  helicopter: '#e7a54c',
  airplaneWing: '#e6bb66',
  airplaneFin: '#cf7355',
  ambulanceStripe: '#d85846',
  engine: '#c54d3e',
  engineBody: '#c64f41',
  patrol: '#385563',
  logger: '#537d62',
  loggerBed: '#48534d',
  leftBeacon: '#d65847',
  rightBeacon: '#498bc2',
} as const

export const rescueHelicopter = {
  shellSegments: 10,
  cabin: { center: [0, 1.65, 1.02], size: [2.18, 2.03, 4.25] },
  windshield: { center: [0, 1.95, 2.04], size: [1.88, 1.37, 2.17] },
  tailBoom: { center: [0, 1.72, -2.44], size: [0.57, 0.6, 4.76] },
  tailFin: { center: [0, 2.18, -4.48], size: [0.20, 1.36, 0.88], rake: -0.27 },
  tailRotor: { center: [0.15, 2.05, -4.58], size: [0.09, 1.45, 0.14], rake: -0.55 },
  rotorMast: { center: [0, 2.83, 0.75], size: [0.18, 0.61, 0.18] },
  rotorBlades: [
    { center: [0, 3.17, 0.75], size: [helicopterSpan, 0.07, 0.24] },
    { center: [0, 3.2, 0.75], size: [0.24, 0.07, helicopterSpan] },
  ],
  skid: { y: 0.11, z: 0.68, size: [0.17, 0.22, 3.67] },
  skidStrut: { xRatio: 0.83, y: 0.43, z: [-0.55, 1.84], size: [0.12, 0.66, 0.13], splay: 0.27 },
  // Upturned skid tips and a boarding step between the struts.
  skidTip: { y: 0.2, z: 2.62, size: [0.17, 0.12, 0.36], rake: -0.6 },
  skidStep: { xRatio: 0.95, y: 0.3, z: 0.65, size: [0.25, 0.05, 0.6] },
  // Red rescue bands wrap the tail boom behind the cabin.
  rescueBands: [
    { z: -1.45, diameter: 0.6, length: 0.26 },
    { z: -1.9, diameter: 0.64, length: 0.26 },
  ],
  bandSegments: 12,
  doorGlass: { x: 1.01, y: 1.85, z: 0.55, size: [0.06, 0.46, 0.62] },
  // The winch arm hangs over the right-hand door.
  winch: {
    arm: { center: [1.22, 2.45, 0.6], size: [0.5, 0.08, 0.08] },
    hoist: { center: [1.46, 2.35, 0.6], size: [0.14, 0.18, 0.14] },
    cable: { center: [1.46, 2.06, 0.6], size: [0.015, 0.4, 0.015] },
    hook: { center: [1.46, 1.85, 0.6], size: [0.07, 0.07, 0.07] },
  },
  landingLight: { center: [0, 0.95, 2.95], size: [0.2, 0.1, 0.1] },
  strobe: { center: [0, 2.92, -4.62], size: [0.12, 0.1, 0.16] },
} as const

export const utilityAirplane = {
  shellSegments: 10,
  fuselage: { center: [0, 1.41, 0], size: [1.33, 1.3, 7.25] },
  canopy: { center: [0, 1.92, 0.82], size: [1.16, 0.92, 2.65] },
  wing: { center: [0, 2.14, 0.45], size: [airplaneSpan, 0.19, 1.64] },
  tailplane: { center: [0, 1.58, -2.88], size: [3.24, 0.12, 0.92] },
  fin: { center: [0, 2.02, -2.85], size: [0.13, 1.55, 0.99], rake: -0.26 },
  propeller: { center: [0, 1.44, 3.66], size: [1.5, 0.12, 0.10], roll: 0.66 },
  gearStrut: { xRatio: 0.78, y: 0.66, size: [0.12, 0.86, 0.16], splay: 0.4 },
  gearWheel: { radius: 0.285, thickness: 0.16 },
} as const

// Each cab rakes its windshield back by `rakeRun` from `windshieldBase` to the
// roof. The patrol car also slopes its rear window forward by `rearRun`.
export const roadVehicleProfiles = {
  low: {
    shell: { y: 0.61, height: 0.54 },
    // The car's bonnet and boot slope down from the shell top.
    shellChamfer: { nose: 0.34, noseDrop: 0.16, tail: 0.26, tailDrop: 0.09 },
    cab: { y: 1.16, height: 0.62, depth: 2, inset: 1.63, windshieldBase: 1.07, rakeRun: 0.42, rearRun: 0.3 },
    dividedWindshield: false,
    mirrorScale: 0.6,
    mudFlaps: false,
    beaconHeight: 1.51,
  },
  tall: {
    shell: { y: 1.0, height: 0.57 },
    shellChamfer: { nose: 0, noseDrop: 0, tail: 0, tailDrop: 0 },
    cab: { y: 1.87, height: 1.48, depth: 2.18, inset: 1.18, windshieldBase: 1.9, rakeRun: 0.2, rearRun: 0 },
    dividedWindshield: true,
    mirrorScale: 1,
    mudFlaps: true,
    beaconHeight: 2.69,
  },
} as const

export const roadVehicleGeometry = {
  shell: { widthRatio: 0.92, lengthInset: 0.13 },
  sill: { widthRatio: 0.80, height: 0.25, drop: 0.27, lengthInset: 0.38 },
  cabWidthRatio: 0.88,
  windshield: { widthRatio: 0.76, paneGap: 0.07, baseInset: 0.05, topInset: 0.07, standoff: 0.012, thickness: 0.035 },
  wiper: { along: 0.07, standoff: 0.03, widthRatio: 0.62, singlePaneRatio: 0.36, size: [0.035, 0.03], sweep: -0.13 },
  sideGlass: { halfWidth: 0.009, standoff: 0.003, inset: { rear: 0.16, front: 0.09, bottom: 0.06, top: 0.1 } },
  mirror: {
    rise: 0.1,
    setback: 0.1,
    mount: { reach: 0.06, size: [0.16, 0.05, 0.05] },
    housing: { reach: 0.15, lift: 0.12, size: [0.11, 0.3, 0.16] },
    glass: { size: [0.09, 0.22, 0.02] },
  },
  headlamp: { lateralWidthRatio: 0.35, raise: 0.04, frontInset: 0.043, size: [0.28, 0.23, 0.063] },
  tailLamp: { lateralWidthRatio: 0.39, rearInset: 0.034, size: [0.22, 0.15, 0.060] },
  // Housings sit on the shell face; indicators sit inboard of each lamp.
  lampHousing: { margin: 0.05, inset: 0.045, depth: 0.04 },
  indicator: { gap: 0.012, inset: 0.045, size: [0.09, 0.14, 0.05] },
  tailIndicator: { gap: 0.012, inset: 0.02, size: [0.09, 0.11, 0.04] },
  wheelClearance: 0.10,
  grille: { widthRatio: 0.39, raise: 0.03, frontInset: 0.035, height: 0.28, depth: 0.06 },
  grilleBars: { offsets: [-0.08, 0, 0.08], inset: 0.1, standoff: 0.04, size: [0.026, 0.026] },
  bumper: { widthRatio: 0.96, raise: 0.03, inset: 0.02, size: [0.18, 0.2] },
  mudFlap: { gap: 0.12, widthRatio: 0.9, heightPerRadius: 0.95, thickness: 0.05 },
  beaconMount: { widthRatio: 0.63, raise: 0.035, height: 0.13, depth: 0.24 },
  beacon: { lateralWidthRatio: 0.23, raise: 0.13, size: [0.38, 0.15, 0.23] },
  // Each beacon sits in a frame base, with a clear takedown lamp between them.
  beaconHousing: { margin: 0.04, height: 0.06 },
  takedown: { raise: 0.11, size: [0.18, 0.08, 0.14] },
} as const

const ambulanceRear = -2.98
const ambulanceSide = 1.16
export const ambulanceBody = {
  compartment: { y: 1.79, z: -1.03, height: 2.17, depth: 3.9 },
  stripe: { y: 1.11, z: -1.045, extraWidth: 0.025, height: 0.19, depth: 3.94 },
  // The care cross sits high on both sides of the box body.
  careEmblem: {
    x: ambulanceSide + 0.018,
    bar: { center: [0, 2.15, -1.6], size: [0.035, 0.16, 0.56] },
    upright: { center: [0, 2.15, -1.6], size: [0.035, 0.51, 0.16] },
  },
  // Rear double doors in a frame surround, with windows, handles and the stripe carried across.
  rearDoors: {
    surround: { center: [0, 1.8, ambulanceRear - 0.01], size: [2.14, 1.7, 0.02] },
    door: { x: 0.53, y: 1.8, z: ambulanceRear - 0.025, size: [1.02, 1.62, 0.03] },
    window: { x: 0.53, y: 2.25, z: ambulanceRear - 0.045, size: [0.62, 0.42, 0.02] },
    handle: { x: 0.12, y: 1.65, z: ambulanceRear - 0.05, size: [0.05, 0.22, 0.04] },
    band: { x: 0.53, y: 1.11, z: ambulanceRear - 0.045, size: [0.98, 0.19, 0.02] },
    hinge: { x: 1.02, ys: [1.2, 2.4], z: ambulanceRear - 0.045, size: [0.04, 0.14, 0.03] },
  },
  rearStep: { center: [0, 0.52, -3.17], size: [1.5, 0.08, 0.32] },
  // Red marker beacons at the top rear corners of the box.
  cornerBeacon: { x: 1.0, y: 2.83, z: -2.9, size: [0.2, 0.12, 0.14] },
  // A curbside door with glass, a handle and frame seams.
  sideDoor: {
    x: ambulanceSide + 0.012,
    seam: { y: 1.7, z: [-0.2, -1.2], size: [0.02, 1.62, 0.03] },
    header: { center: [0, 2.52, -0.7], size: [0.02, 0.03, 1.03] },
    glass: { center: [0, 2.12, -0.7], size: [0.02, 0.45, 0.62] },
    handle: { center: [0, 1.62, -0.33], size: [0.03, 0.05, 0.2] },
  },
} as const

const engineLadderHeight = 2.92
const engineBodyTop = 2.775
const engineRear = -4.1
export const fireEngineBody = {
  compartment: { y: 1.87, z: -1.24, height: 1.81, depth: 5.11 },
  // Roller-shutter lockers with a frame surround, ribs and a lift bar.
  lockers: {
    y: 1.92,
    z: [-2.85, -1.32, 0.20],
    surround: [0.03, 0.95, 1.42],
    shutter: [0.05, 0.85, 1.34],
    ribs: { offsets: [-0.3, -0.18, -0.06, 0.06, 0.18, 0.3], size: [0.07, 0.018, 1.3] },
    liftBar: { drop: 0.36, size: [0.09, 0.04, 0.6] },
  },
  ladderRails: { x: [-0.39, 0.39], y: engineLadderHeight, z: -0.86, size: [0.10, 0.12, 4.65] },
  ladderRungs: { y: engineLadderHeight, firstZ: -2.85, count: 9, spacing: 0.49, size: [0.73, 0.08, 0.08] },
  ladderBrackets: { z: [-2.6, 0.9], y: (engineBodyTop + engineLadderHeight) / 2, size: [0.12, 0.16, 0.12] },
  // The pump panel fills the gap between cab and body on each side.
  pumpPanel: {
    panel: { x: 1.2, y: 1.5, z: 1.57, size: [0.04, 0.74, 0.44] },
    outlets: { x: 1.23, y: 1.32, z: [1.45, 1.69], diameter: 0.12, length: 0.08 },
    gauges: { x: 1.225, y: 1.68, z: [1.47, 1.67], size: [0.02, 0.1, 0.1] },
    segments: 10,
  },
  // A hose reel on the rear face, with grab rails and a step below.
  hoseReel: { center: [0, 2.2, engineRear + 0.24], hose: 0.4, flange: 0.5, length: 1.1, flangeWidth: 0.04, segments: 14 },
  grabRails: { x: 1.12, y: 1.75, z: engineRear + 0.27, size: [0.05, 1.0, 0.05] },
  rearStep: { center: [0, 0.58, engineRear + 0.05], size: [2.2, 0.08, 0.34] },
} as const

// The patrol car keeps a cream door livery with a silver badge, a pinstripe,
// arch lips over each wheel and a push bar on the nose.
export const patrolBody = {
  livery: { lateralWidthRatio: 0.463, y: 0.64, z: 0.5, size: [0.035, 0.32, 1.7] },
  badge: { lateralWidthRatio: 0.472, y: 0.66, z: 0.62, size: [0.02, 0.17, 0.15] },
  pinstripe: { lateralWidthRatio: 0.462, y: 0.82, z: 0, size: [0.03, 0.035, 4.3] },
  archLip: { lateralWidthRatio: 0.465, radiusLift: 0.045, size: [0.04, 0.06], lengthPerRadius: 2.3 },
  pushBar: {
    uprights: { x: [-0.32, 0.32], y: 0.66, z: 2.47, size: [0.06, 0.5, 0.06] },
    rails: { ys: [0.56, 0.84], z: 2.5, size: [0.82, 0.06, 0.06] },
  },
} as const

export const loggingBed = {
  floor: { drop: 0.095, extraWidth: 0.23, thickness: 0.19 },
  stake: { extraWidth: 0.13, lengthRatios: [-0.42, -0.13, 0.16, 0.45], width: 0.13, depth: 0.17 },
} as const
