export type TopTrimOutline = [u: number, v: number][]

export interface TopApplique {
  readonly name: string
  readonly pigment: 'trim' | 'detail'
  readonly outline: TopTrimOutline
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly side?: 1 | -1
  readonly tilt?: number
  readonly lift?: number
}

// Welt and strip appliqués have different starting edges and winding.
const welt: TopTrimOutline = [[-0.5, 0.5], [0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]]
const strip: TopTrimOutline = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]
const narrowDiamond: TopTrimOutline = [[0, 0.5], [-0.36, 0], [0, -0.5], [0.36, 0]]
const symmetricDiamond: TopTrimOutline = [[0, -0.5], [0.5, 0], [0, 0.5], [-0.5, 0]]
const leaf: TopTrimOutline = [[0, 0.53], [-0.35, 0.19], [-0.39, -0.12], [-0.19, -0.40], [0, -0.52], [0.31, -0.15], [0.34, 0.14]]
const oilskinCollar: TopTrimOutline = [[-0.46, 0.40], [0.21, 0.50], [0.49, -0.23], [0.10, -0.50], [-0.36, -0.02]]
const stormFlap: TopTrimOutline = [[-0.5, 0.5], [0.5, 0.5], [0.5, -0.17], [0, -0.5], [-0.5, -0.17]]
const foxMask: TopTrimOutline = [[-0.50, 0.50], [-0.17, 0.30], [0.16, 0.30], [0.50, 0.50], [0.42, -0.14], [0, -0.5], [-0.42, -0.14]]
const pennant: TopTrimOutline = [[-0.5, 0.5], [0.5, 0.22], [-0.5, -0.5]]
const workPocket: TopTrimOutline = [[-0.5, 0.5], [0.5, 0.5], [0.5, -0.30], [0.25, -0.5], [-0.40, -0.5], [-0.5, -0.31]]

const smallStar = 0.043
const foxFaceX = -0.095
const workPocketX = 0.142
const workPocketWidth = 0.130

export const classicTopTrim = {
  chart: {
    star: { rays: 5, innerRadius: 0.23, outerRadius: 0.5 },
    front: {
      name: 'Star stitch',
      pigment: 'trim',
      placements: [[-0.154, 1.142, smallStar], [-0.080, 1.095, smallStar], [0.008, 1.144, 0.069], [0.127, 1.117, smallStar]],
    },
    connection: {
      name: 'Chart stitch',
      pigment: 'detail',
      samples: [0, 0.5, 1],
      halfWidth: 0.002,
      thickness: 0.0015,
      sides: 6,
    },
    back: { name: 'North star', pigment: 'trim', x: 0, y: 1.167, width: 0.074, height: 0.074, side: -1 },
  },
  slicker: {
    collar: { name: 'Oilskin collar', pigment: 'detail', outline: oilskinCollar, x: 0.102, y: 1.235, width: 0.142, height: 0.088, tilt: -0.048 },
    buttons: { pigment: 'trim', x: 0.065, y: [0.910, 1.032, 1.148], size: [0.030, 0.031, 0.012], segments: 10 },
    stormFlap: { name: 'Storm flap', pigment: 'detail', outline: stormFlap, x: 0.101, y: 1.153, width: 0.192, height: 0.083, side: -1 },
    pocketWelt: { name: 'Pocket welt', pigment: 'detail', outline: welt, x: 0.160, y: 0.877, width: 0.089, height: 0.011, tilt: 0.026 },
  },
  kelpVest: {
    quilting: { name: 'Kelp quilting', pigment: 'detail', outline: leaf, x: 0.110, y: 1.047, width: 0.121, height: 0.236, side: -1, tilt: 0.077 },
    pocket: { name: 'Leaf welt pocket', pigment: 'trim', outline: leaf, x: 0.136, y: 0.922, width: 0.075, height: 0.113, tilt: 0.036 },
    opening: { name: 'Bound opening', pigment: 'detail', outline: welt, x: 0, y: 1.01, width: 0.018, height: 0.342 },
  },
  fox: [
    { name: 'Fox mask stitch', pigment: 'detail', outline: foxMask, x: foxFaceX, y: 1.116, width: 0.126, height: 0.112 },
    { name: 'Ivory muzzle', pigment: 'trim', outline: narrowDiamond, x: foxFaceX, y: 1.102, width: 0.085, height: 0.037 },
    { name: 'Fox brush', pigment: 'detail', outline: leaf, x: 0.010, y: 1.030, width: 0.140, height: 0.226, side: -1, tilt: 0.116 },
    { name: 'Brush tip', pigment: 'trim', outline: narrowDiamond, x: 0.065, y: 1.117, width: 0.067, height: 0.051, side: -1 },
  ] satisfies readonly TopApplique[],
  beacon: { name: 'Beacon pennant', pigment: 'detail', outline: pennant, x: -0.132, y: 1.151, width: 0.076, height: 0.054 },
} as const

export const marketTopTrim = {
  picnic: {
    collar: { name: 'Camp collar', pigment: 'trim', outline: symmetricDiamond, x: 0.061, y: 1.230, width: 0.088, height: 0.106, tilt: -0.045 },
    placket: { name: 'Button placket', pigment: 'detail', outline: strip, x: 0, y: 1.030, width: 0.017, height: 0.333 },
  },
  cardigan: {
    diamonds: {
      name: 'Intarsia diamond',
      pigment: 'trim',
      outline: symmetricDiamond,
      placements: [[-0.124, 1.09], [0, 1.005], [0.124, 1.09]],
      width: 0.117,
      height: 0.144,
    },
    band: { name: 'Button band', pigment: 'detail', outline: strip, x: 0, y: 1.014, width: 0.026, height: 0.372, lift: 0.004 },
    buttons: { name: 'Pearl button', pigment: 'trim', outline: symmetricDiamond, x: 0, rows: [0.87, 0.97, 1.07, 1.17], width: 0.021, height: 0.025, lift: 0.008 },
  },
  dockJacket: {
    pocket: { name: 'Patch pocket', pigment: 'detail', outline: workPocket, x: workPocketX, y: 0.918, width: workPocketWidth, height: 0.106 },
    facing: { name: 'Pocket facing', pigment: 'trim', outline: strip, x: workPocketX, y: 0.967, width: workPocketWidth, height: 0.014, lift: 0.005 },
    collar: { name: 'Corduroy collar', pigment: 'detail', outline: symmetricDiamond, x: 0.080, y: 1.218, width: 0.112, height: 0.107, tilt: -0.045 },
    placket: { name: 'Storm placket', pigment: 'detail', outline: strip, x: 0, y: 1.014, width: 0.027, height: 0.446 },
    loop: { name: 'Locker loop', pigment: 'trim', outline: strip, x: 0, y: 1.188, width: 0.067, height: 0.021, side: -1 },
  },
  fernGilet: {
    quilting: { name: 'Quilted chevron', pigment: 'detail', outline: strip, x: 0.101, rows: [0.943, 1.028, 1.113], width: 0.022, height: 0.174, tilt: 0.171, lift: 0.002 },
    zip: { name: 'Zip tape', pigment: 'trim', outline: strip, x: 0, y: 1.03, width: 0.018, height: 0.420 },
  },
  squallKnit: {
    columns: [-0.176, -0.088, 0, 0.088, 0.176],
    yoke: { name: 'Fair Isle yoke', pigment: 'detail', outline: symmetricDiamond, y: 1.146, width: 0.073, height: 0.090 },
    snow: { name: 'Snow stitch', pigment: 'trim', outline: symmetricDiamond, y: 1.065, width: 0.029, height: 0.034 },
  },
} as const
