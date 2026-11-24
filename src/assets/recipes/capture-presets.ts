// Named camera presets for `npm run capture`. Eye and look points are map metres with heights above the ground.
// Landscape presets open the Workbench landscape view; specimen presets open a Workbench subject and can sweep seeds and angles.
// +z is north and +x is east, as on the island map.

export const captureViewport = { width: 1280, height: 720 } as const

// The Workbench and the game render weather as a rain level. Each named sky is a fixed level.
export const captureWeather = { clear: 0, mist: 0.03, overcast: 0.08, rain: 0.85 } as const

export const captureSettle = { firstFrameTimeoutMs: 60000, settleMs: 800, perfSampleMs: 1200 } as const

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
export const differenceHeatmap = { changeThreshold: 24, gain: 3, channelMax: 255, rgbaStride: 4, rgbChannels: 3, backgroundShade: 0.25, decimals: 4 } as const

export const capturePresets = {
  'tower-dawn-north': {
    label: 'Fire Watch deck looking north at dawn',
    kind: 'landscape',
    eye: { x: 21, z: 38.5, height: 11.5 },
    look: { x: 21, z: 70, height: 0.5 },
    fov: 0.9,
    hour: 6.7,
    weather: 'mist',
  },
  'forest-edge-threshold': {
    label: 'Meadow into the Pinewoods edge',
    kind: 'landscape',
    eye: { x: -13, z: 17, height: 1.7 },
    look: { x: -30, z: 26, height: 2.2 },
    fov: 0.85,
    hour: 10,
    weather: 'clear',
  },
  'fernfall-crossing': {
    label: 'Fernfall crossing below the falls',
    kind: 'landscape',
    eye: { x: 22, z: 78, height: 7 },
    look: { x: 11, z: 86, height: 0.5 },
    fov: 0.85,
    hour: 13,
    weather: 'overcast',
  },
  'pale-grove-evening': {
    label: 'Juniper grove trunks at evening',
    kind: 'landscape',
    eye: { x: -36, z: 60, height: 3 },
    look: { x: -50, z: 72, height: 1.2 },
    fov: 0.85,
    hour: 17.2,
    weather: 'clear',
  },
  'ridge-to-harbor': {
    label: 'Windstone Ridge looking back at the harbor',
    kind: 'landscape',
    eye: { x: 36.5, z: 134, height: 4.5 },
    look: { x: -40, z: -14, height: 0 },
    fov: 0.6,
    hour: 17.9,
    weather: 'clear',
  },
  'fire-watch-overview': {
    label: 'Fire Watch and the meadow fire sites from above',
    kind: 'landscape',
    eye: { x: 20, z: 5, height: 38 },
    look: { x: -10, z: 40, height: 0 },
    fov: 0.9,
    hour: 11,
    weather: 'clear',
    overlays: ['sightlines', 'wildfire', 'protected'],
  },
  // Road junctions, from a few metres up, to check the network joins without seams: the
  // trailhead off the harbor road, the summit spur leaving the fire road, and the ridge road
  // leaving the Pine Draw road.
  'road-trailhead': {
    label: 'Fire road trailhead off the harbor road',
    kind: 'landscape',
    eye: { x: 26, z: 2, height: 6 },
    look: { x: 4, z: 18, height: 0 },
    fov: 0.8,
    hour: 11,
    weather: 'clear',
  },
  'road-spur-junction': {
    label: 'Summit spur leaving the fire road',
    kind: 'landscape',
    eye: { x: -230, z: 212, height: 7 },
    look: { x: -250, z: 232, height: 0 },
    fov: 0.8,
    hour: 11,
    weather: 'clear',
  },
  'road-ridge-junction': {
    label: 'Cairn ridge road leaving the Pine Draw road',
    kind: 'landscape',
    eye: { x: -300, z: 392, height: 7 },
    look: { x: -318, z: 372, height: 0 },
    fov: 0.8,
    hour: 11,
    weather: 'clear',
  },
  // Cairn from the village: the landmark has to read as a mountain from home.
  'landmark-cairn-from-village': {
    label: 'Cairn Summit from the village',
    kind: 'landscape',
    eye: { x: -20, z: 30, height: 2 },
    look: { x: -110, z: 225, height: 30 },
    fov: 0.8,
    hour: 16.5,
    weather: 'clear',
  },
  // Highwood's hero views (docs/backcountry.md#hero-views), captured at every phase to compare like for like.
  'highwood-tower-north': {
    label: 'Cairn Summit looking north at dawn',
    kind: 'landscape',
    eye: { x: -95, z: 224, height: 10 },
    look: { x: -215, z: 385, height: 12 },
    fov: 0.8,
    hour: 6.4,
    weather: 'mist',
  },
  'highwood-fire-road': {
    label: 'Into the Highwood forest at midday',
    kind: 'landscape',
    // On the fire road below Cairn's south-west flank, looking up it toward Alder Creek.
    eye: { x: -214, z: 193, height: 1.7 },
    look: { x: -260, z: 243, height: 4 },
    fov: 0.8,
    hour: 12,
    weather: 'clear',
  },
  'highwood-creek-ford': {
    label: 'Alder Creek after rain',
    kind: 'landscape',
    // From the bank above the alders, down the creek's wet ribbon toward the cove.
    eye: { x: -270, z: 300, height: 1.7 },
    look: { x: -310, z: 280, height: 1.2 },
    fov: 0.8,
    hour: 11,
    weather: 'overcast',
  },
  'highwood-birch-flats': {
    label: 'Birch Flats in evening sun',
    kind: 'landscape',
    eye: { x: -402, z: 291, height: 1.8 },
    look: { x: -436, z: 318, height: 3 },
    fov: 0.8,
    hour: 17.4,
    weather: 'clear',
  },
  // From Cairn Summit, beside the Fire Watch's site, south over the massif's flank to the settled south.
  'highwood-summit-home': {
    label: 'Home from Cairn Summit',
    kind: 'landscape',
    eye: { x: -95, z: 210, height: 1.7 },
    look: { x: -35, z: -5, height: 2 },
    fov: 0.8,
    hour: 16.5,
    weather: 'clear',
  },
  // The landmark from the side: Cairn Summit's crag on its ridge, whose broad south-west flank carries the summit road.
  'highwood-cairn-southwest': {
    label: 'Cairn Summit from the south-west shore',
    kind: 'landscape',
    eye: { x: -212, z: 129, height: 1.7 },
    look: { x: -92, z: 219, height: 12 },
    fov: 0.8,
    hour: 15,
    weather: 'clear',
  },
  // Ground texture checks: the summit overlook down Cairn's rocky north-east face, the same face at walking height, and the face from the ridge foot below.
  'ground-cairn-summit': {
    label: 'Overlook of Cairn Summit\'s rocky north-east face from above the ridge foot',
    kind: 'landscape',
    eye: { x: -52, z: 292, height: 32 },
    look: { x: -104, z: 238, height: 0 },
    fov: 0.85,
    hour: 15,
    weather: 'clear',
  },
  'ground-cairn-slope': {
    label: 'Bare granite and crags on Cairn\'s north-east face at walking height',
    kind: 'landscape',
    eye: { x: -104, z: 252, height: 1.7 },
    look: { x: -122, z: 240, height: 2 },
    fov: 0.85,
    hour: 15,
    weather: 'clear',
  },
  'ground-cairn-northeast': {
    label: 'Cairn Summit\'s steep north-east face, crags and clitter above the ridge foot',
    kind: 'landscape',
    eye: { x: -84, z: 288, height: 1.7 },
    look: { x: -102, z: 256, height: 4 },
    fov: 0.85,
    hour: 15,
    weather: 'clear',
  },
  'specimen-tussock': {
    label: 'Grass tussock specimen',
    kind: 'specimen',
    subject: 'tussock',
    target: { x: 0, y: 0.25, z: 0 },
    radius: 1.2,
    beta: 1.15,
    fov: 0.8,
    options: { growth: 100 },
    seeds: 4,
  },
} as const
