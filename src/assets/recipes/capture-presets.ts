// Named camera presets for `npm run capture`. Eye and look points are map metres with heights above the ground.
// Landscape presets open the Workbench landscape view; specimen presets open a Workbench subject and can sweep seeds and angles.
// +z is north and +x is east, as on the island map.

export const captureViewport = { width: 1280, height: 720 } as const

// The Workbench and the game render weather as a rain level. Each named sky is a fixed level.
export const captureWeather = { clear: 0, mist: 0.03, overcast: 0.3, rain: 0.85 } as const

export const captureSettle = { firstFrameTimeoutMs: 60000, settleMs: 1500, perfSampleMs: 2200 } as const

export const turntableAngles = 8

export const contactSheet = {
  thumbWidth: 320,
  gap: 6,
  labelHeight: 22,
  labelInset: 6,
  background: '#1b1f24',
  label: '#e9ecef',
  compareColumns: 3,
} as const

// Pixel difference heatmap: a channel change above the threshold counts as changed; gain brightens the red.
export const differenceHeatmap = { changeThreshold: 8, gain: 4, channelMax: 255, rgbaStride: 4, rgbChannels: 3, backgroundShade: 0.25, decimals: 4 } as const

export const capturePresets = {
  'tower-dawn-north': {
    label: 'Fire Watch deck looking north at dawn',
    kind: 'landscape',
    eye: { x: 21, z: 36, height: 10.2 },
    look: { x: 21, z: 76, height: 2 },
    fov: 0.9,
    hour: 6.3,
    weather: 'mist',
  },
  'forest-edge-threshold': {
    label: 'Meadow into the Pinewoods edge',
    kind: 'landscape',
    eye: { x: -13, z: 17, height: 1.7 },
    look: { x: -30, z: 23, height: 2.2 },
    fov: 0.85,
    hour: 10,
    weather: 'clear',
  },
  'fernfall-crossing': {
    label: 'Fernfall crossing below the falls',
    kind: 'landscape',
    eye: { x: 3, z: 78, height: 1.7 },
    look: { x: 11, z: 87, height: 1.6 },
    fov: 0.85,
    hour: 13,
    weather: 'overcast',
  },
  'pale-grove-evening': {
    label: 'Juniper grove trunks at evening',
    kind: 'landscape',
    eye: { x: -40, z: 64, height: 1.7 },
    look: { x: -50, z: 72, height: 2.5 },
    fov: 0.85,
    hour: 18.2,
    weather: 'clear',
  },
  'ridge-to-harbor': {
    label: 'Windstone Ridge looking back at the harbor',
    kind: 'landscape',
    eye: { x: 36.5, z: 134, height: 2.2 },
    look: { x: -40, z: -14, height: 0 },
    fov: 0.75,
    hour: 15.5,
    weather: 'clear',
  },
  'fire-watch-overview': {
    label: 'Fire Watch and the meadow fire sites from above',
    kind: 'landscape',
    eye: { x: 30, z: -10, height: 55 },
    look: { x: 0, z: 36, height: 0 },
    fov: 0.9,
    hour: 11,
    weather: 'clear',
    overlays: ['sightlines', 'wildfire', 'protected'],
  },
  'specimen-tussock': {
    label: 'Grass tussock specimen',
    kind: 'specimen',
    subject: 'tussock',
    target: { x: 0, y: 0.25, z: 0 },
    radius: 1.6,
    beta: 1.15,
    fov: 0.8,
    options: { growth: 100 },
    seeds: 4,
  },
} as const
