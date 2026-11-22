export const wrackFragment = {
  paleEvery: 4,
  centreY: 0.026,
  width: 0.23,
  paleWidth: 0.10,
  height: 0.048,
  depth: 0.085,
  color: '#645d3d',
  paleColor: '#e9d4a9',
  segments: 5,
  turn: { base: -0.8, wave: 2.4, amplitude: 0.6 },
} as const

export const shellglassLimpet = {
  foot: { centreY: 0.015, size: [0.20, 0.09, 0.19], color: '#686e5d', segments: 6 },
  shell: { centreY: 0.066, tip: 0.027, base: 0.108, baseStep: 0.012, height: 0.065, sides: 9, color: '#d8c599' },
} as const
