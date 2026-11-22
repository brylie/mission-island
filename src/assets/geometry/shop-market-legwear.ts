const stripOutline: number[][] = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]
const shieldOutline: number[][] = [[-0.5, 0.5], [0.5, 0.5], [0.47, -0.12], [0, -0.5], [-0.47, -0.12]]

export const marketTrimOutlines = { strip: stripOutline, shield: shieldOutline, oval: { samples: 12, radius: 0.5 } }

const linenPleatHeight = 0.182
const linenPleatY = -0.141
const linenPleatLean = 0.015

export const marketTrouserTrim = {
  frontSeamZ: 0.14,
  linenPleat: {
    body: { x: 0.046, y: linenPleatY, width: 0.012, height: linenPleatHeight, lean: linenPleatLean },
    highlight: { x: 0.057, y: linenPleatY, width: 0.007, height: linenPleatHeight, lean: linenPleatLean },
  },
  pressedCrease: { x: [-0.032, 0.018], y: -0.225, width: 0.011, height: 0.347, lean: 0.014 },
  engineerStripe: { x: [-0.069, -0.024, 0.021, 0.066], y: -0.244, width: 0.009, height: 0.344, lean: 0 },
  fernPocket: { x: 0.13, y: -0.124, height: 0.103, z: 0.007, width: 0.138 },
  pencilLoop: { x: 0.057, y: -0.092, height: 0.069, z: 0.13, width: 0.020 },
  hemBraid: { y: [-0.379, -0.407], z: 0.135, width: 0.167, height: 0.012, lift: 0.038 },
} as const

const ribbonZ = 0.133

export const marketShoeTrim = {
  vampY: -0.57,
  shaftX: 0.12,
  ribbon: {
    loops: { x: 0.036, z: ribbonZ, width: 0.069, depth: 0.056, tilt: 0.030 },
    knot: { x: 0, z: ribbonZ, width: 0.032, depth: 0.032 },
  },
  loafer: {
    saddle: { x: 0, z: 0.129, width: 0.188, depth: 0.040 },
    penny: { x: 0, z: 0.159, width: 0.043, depth: 0.020 },
  },
  sneaker: {
    laces: { x: 0, z: [0.124, 0.154], width: 0.119, depth: 0.009 },
    toeGuard: { x: 0, z: 0.203, width: 0.155, depth: 0.037 },
  },
  hiker: {
    crossLaces: { x: 0.029, z: [0.142, 0.169], width: 0.057, depth: 0.009, tilt: 0.026 },
    ankleGuard: { y: -0.466, z: 0.016, width: 0.103, height: 0.085 },
  },
  wellies: {
    stamp: { y: -0.400, z: 0.018, width: 0.075, height: 0.071 },
    toeCap: { x: 0, z: 0.193, width: 0.162, depth: 0.047 },
  },
} as const
