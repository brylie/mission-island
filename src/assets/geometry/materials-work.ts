export const repairMarker = {
  post: { width: 0.09, depth: 0.09, finish: '#625449' },
  tag: { margin: 0.08, size: [0.26, 0.26, 0.07], finish: '#e1ac58', tilt: Math.PI / 4 },
  source: { x: 0.4, height: 0.63, facing: -0.25 },
  site: { height: 0.75 },
  choice: { height: 0.89, shelf: { y: 0.62, size: [0.64, 0.07, 0.35], finish: '#736354' }, sampleY: 0.65 },
} as const

export const timberSample = {
  bark: '#765142',
  branch: { y: 0.07, shape: [0.09, 0.19, 0.69, 7], tilt: 1.48 },
  twig: { center: [0.08, 0.095, 0.1], shape: [0.035, 0.09, 0.32, 6], rotation: [1.1, 0, -0.48] },
  end: { center: [-0.34, 0.045, 0], shape: [0.12, 0.12, 0.025, 6], finish: '#d5ad7a' },
} as const

export const stoneSample = {
  main: { y: 0.072, size: [0.34, 0.21, 0.28], turn: 0.4, finish: '#827f74' },
  chip: { center: [-0.07, 0.025, 0.05], size: [0.24, 0.09, 0.21], finish: '#a29b87' },
  segments: 3,
} as const

export const repairEdging = {
  timber: {
    beam: { y: 0.11, size: [0.18, 0.23, 1.17], finish: '#ac855c' },
    stakes: { x: 0.086, y: 0.14, z: [-0.44, 0.44], size: [0.1, 0.28, 0.1], finish: '#745d46' },
  },
  stone: {
    rocks: [{ z: -0.42, finish: '#89867b' }, { z: 0, finish: '#a39e90' }, { z: 0.42, finish: '#96968b' }],
    y: 0.085,
    width: 0.29,
    height: 0.25,
    heightStep: 0.024,
    depth: 0.45,
    turnStep: 0.37,
    segments: 4,
  },
} as const

export const repairSampleTray = {
  legs: { x: [-0.22, 0.22], y: 0.31, size: [0.09, 0.62, 0.1], finish: '#604838' },
  shelf: { y: 0.63, size: [0.67, 0.09, 0.47], finish: '#a88667' },
  rails: { z: [-0.21, 0.21], y: 0.7, size: [0.67, 0.08, 0.055], finish: '#6e5240' },
} as const
