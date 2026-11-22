export const canopyDappleGrid = { width: 10, depth: 8, divisions: 28, studioLift: 0.025, islandLift: 0.04 } as const
export const reedStudyModel = {
  seed: 19335,
  blades: 32,
  width: 2.6,
  depth: 1.7,
  length: { base: 0.56, spread: 0.97 },
  bladeWidth: { base: 0.044, spread: 0.068, edges: 0.25, belly: 0.81, point: 0.92 },
  sections: 5,
  bend: 0.45,
  bendDrop: 0.3,
} as const
export const ridgeLichenSegments = 8
export const foldingFlowers = {
  seed: 8765,
  count: 15,
  width: 3.5,
  depth: 2.4,
  height: { min: 0.26, spread: 0.42 },
  stalk: { top: 0.018, bottom: 0.034, sides: 5, color: '#578044' },
  center: { size: [0.112, 0.063, 0.112], sides: 6, color: '#c98235' },
  petals: { count: 6, angleJitter: 0.14, shoulder: { reach: 0.125, halfWidth: 0.062, rise: 0.031, uv: 0.63 }, tip: { reach: 0.196, rise: 0.053 } },
} as const
export const footprintModel = { width: 0.31, length: 0.48, halfTrack: 0.117, toeOut: 0.59 } as const

export const rainCanvas = {
  grid: { width: 3.35, depth: 2.1, divisions: 28, height: 2.18, slope: 0.19 },
  posts: { x: [-1.66, 1.66], z: 1.04, lowY: 0.98, highY: 1.18, width: 0.069, lowHeight: 1.98, highHeight: 2.38, color: '#566457' },
  rail: { z: [-1.05, 1.05], height: 2.176, size: [3.46, 0.061, 0.068], color: '#756854' },
} as const
export const parallaxWindow = {
  pane: { width: 0.958, height: 0.766 },
  upright: { x: [-0.56, 0.56], z: 0.028, size: [0.14, 0.96, 0.12], color: '#e7cda1' },
  crossbar: { y: [-0.475, 0.475], z: 0.022, size: [1.25, 0.11, 0.14], color: '#dfc89e' },
  mullion: { z: -0.013, size: [0.04, 0.85, 0.04], color: '#d4bf97' },
  walls: { x: [-0.93, 0.93], z: 0.18, size: [0.65, 2.1, 0.24], color: '#71958e' },
} as const
export const roadsideReflectors = {
  x: [-1.2, -0.15, 0.9, 1.95],
  heading: 1.15,
  body: { y: 0.09, size: [0.42, 0.16, 0.21], color: '#555950' },
  lens: { xInset: 0.111, y: 0.104, z: -0.050, width: 0.35, height: 0.105 },
} as const
export const ropeCoil = {
  lengthSegments: 132,
  sides: 12,
  turns: 3,
  radius: 0.67,
  taper: 0.21,
  strandRadius: 0.075,
  floor: 0.095,
  rise: 0.36,
} as const
