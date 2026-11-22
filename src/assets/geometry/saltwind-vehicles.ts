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

export type SaltwindVehiclePart = {
  center: readonly [x: number, y: number, z: number]
  size: readonly [width: number, height: number, depth: number]
}

export const saltwindVehiclePaint = {
  cream: '#fff0d0',
  glass: '#407783',
  rubber: '#303c39',
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
  headlamp: '#ffeab1',
  tailLamp: '#d95d48',
  grille: '#394b4a',
  leftBeacon: '#d65847',
  rightBeacon: '#498bc2',
} as const

export const saltwindVehicleWheel = {
  tireSegments: 12,
  hubSegments: 10,
  hubDiameterPerRadius: 1.08,
  hubThickness: 0.04,
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

export const roadVehicleProfiles = {
  low: {
    shell: { y: 0.61, height: 0.54 },
    cab: { y: 1.16, height: 0.62, depth: 2, inset: 1.63 },
    windshield: { y: 1.28, offsetZ: 0.91, height: 0.39 },
    sideGlass: { y: 1.26, height: 0.35, depth: 1.45 },
    beaconHeight: 1.51,
  },
  tall: {
    shell: { y: 1.0, height: 0.57 },
    cab: { y: 1.87, height: 1.48, depth: 2.18, inset: 1.18 },
    windshield: { y: 2.2, offsetZ: 1.096, height: 0.58 },
    sideGlass: { y: 2.19, height: 0.55, depth: 1.55 },
    beaconHeight: 2.69,
  },
} as const

export const roadVehicleGeometry = {
  shell: { widthRatio: 0.92, lengthInset: 0.13 },
  sill: { widthRatio: 0.80, height: 0.25, drop: 0.27, lengthInset: 0.38 },
  cabWidthRatio: 0.88,
  windshield: { widthRatio: 0.76, thickness: 0.035 },
  sideGlass: { lateralWidthRatio: 0.444, thickness: 0.035 },
  headlamp: { lateralWidthRatio: 0.35, raise: 0.04, frontInset: 0.043, size: [0.28, 0.23, 0.063] },
  tailLamp: { lateralWidthRatio: 0.39, rearInset: 0.034, size: [0.22, 0.15, 0.060] },
  wheelClearance: 0.10,
  grille: { widthRatio: 0.39, raise: 0.03, frontInset: 0.035, height: 0.28, depth: 0.06 },
  beaconMount: { widthRatio: 0.63, raise: 0.035, height: 0.13, depth: 0.24 },
  beacon: { lateralWidthRatio: 0.23, raise: 0.13, size: [0.38, 0.15, 0.23] },
} as const

export const ambulanceBody = {
  compartment: { y: 1.79, z: -1.03, height: 2.17, depth: 3.9 },
  stripe: { y: 1.11, z: -1.045, extraWidth: 0.025, height: 0.19, depth: 3.94 },
  careEmblem: {
    bar: { center: [0, 2.15, -3.005], size: [0.56, 0.16, 0.035] },
    upright: { center: [0, 2.15, -3.005 + 0.018], size: [0.16, 0.51, 0.035] },
  },
  doorSeam: { center: [0, 1.92, -3.025], size: [0.032, 1.29, 0.034] },
} as const

const ladderHeight = 2.92
export const fireEngineBody = {
  compartment: { y: 1.87, z: -1.24, height: 1.81, depth: 5.11 },
  lockers: { y: 1.92, z: [-2.85, -1.32, 0.20], size: [0.035, 0.85, 1.34] },
  ladderRails: { x: [-0.39, 0.39], y: ladderHeight, z: -0.86, size: [0.10, 0.12, 4.65] },
  ladderRungs: { y: ladderHeight, firstZ: -2.85, count: 9, spacing: 0.49, size: [0.73, 0.08, 0.08] },
} as const

export const patrolDoorStripe = { lateralWidthRatio: 0.463, y: 0.72, z: -0.25, size: [0.035, 0.41, 1.59] } as const

export const loggingBed = {
  floor: { drop: 0.095, extraWidth: 0.23, thickness: 0.19 },
  stake: { extraWidth: 0.13, lengthRatios: [-0.42, -0.13, 0.16, 0.45], width: 0.13, depth: 0.17 },
} as const
