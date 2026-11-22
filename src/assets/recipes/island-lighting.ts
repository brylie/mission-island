export const islandLightingPreset = {
  sun: {
    name: 'Afternoon sun',
    direction: [0.55, -1, 0.6],
    position: [-48, 86, -55],
    intensity: 0.86,
    diffuseColor: '#fff3d7',
  },
  skyFill: {
    name: 'Sky fill',
    direction: [0.1, 1, -0.35],
    intensity: 0.58,
    groundColor: '#8aaba1',
  },
  shadow: {
    minZ: 1,
    maxZ: 220,
    mapSize: 1536,
    bias: 0.0008,
    normalBias: 0.045,
    darkness: 0.22,
  },
} as const
