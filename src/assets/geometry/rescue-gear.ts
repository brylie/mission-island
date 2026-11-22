// Seabrook Fire and Rescue wilderness gear. Each model's origin is on the
// ground under its base, +Z forward. The first aid kit uses the green and white
// first aid sign, not the protected red cross.

export const firstAidKitModel = {
  case: { y: 0.11, size: [0.36, 0.22, 0.24], color: '#3f8f5a' },
  // A pale band keeps the green case readable on grass.
  band: { y: 0.06, size: [0.365, 0.035, 0.245], color: '#f5efe2' },
  lid: { y: 0.225, size: [0.37, 0.02, 0.25], color: '#357a4c' },
  // Each cross's upright is a hair thicker than its bar so their faces never coincide.
  cross: { bar: [0.16, 0.012, 0.05], upright: [0.05, 0.016, 0.16], y: 0.24, color: '#f5efe2' },
  frontCross: { bar: [0.11, 0.035, 0.01], upright: [0.035, 0.11, 0.014], y: 0.11, z: 0.125 },
  handle: { y: 0.255, z: -0.09, size: [0.14, 0.025, 0.03], color: '#344944' },
  latch: { x: 0.12, y: 0.17, z: 0.122, size: [0.04, 0.035, 0.01], color: '#a6b2a4' },
} as const

export const flashlightModel = {
  body: { y: 0.035, z: -0.02, diameter: 0.055, length: 0.24, color: '#e8b23a' },
  grip: { y: 0.035, z: -0.06, diameter: 0.058, length: 0.1, color: '#344944' },
  head: { y: 0.035, z: 0.12, diameter: 0.08, length: 0.06, color: '#344944' },
  lens: { y: 0.035, z: 0.152, diameter: 0.064, length: 0.006, color: '#fff4c1' },
  segments: 12,
  // The beam starts at the lens and points along +Z.
  beam: { z: 0.16, angle: 0.55, exponent: 2, color: '#fff1c6', range: 18, nightIntensity: 1.6, minimumNight: 0.05 },
} as const

// A squat yellow bag with its rope coil showing at the open top, unlike the
// tall red extinguishers beside it.
export const throwBagModel = {
  bag: { y: 0.1, diameter: 0.24, height: 0.2, color: '#eaa63a' },
  coil: { y: 0.215, diameter: 0.2, height: 0.04, color: '#f1dfb3' },
  hub: { y: 0.24, diameter: 0.08, height: 0.02, color: '#eaa63a' },
  tail: { x: 0.11, y: 0.23, size: [0.12, 0.018, 0.018], color: '#f1dfb3' },
  toggle: { x: 0.17, y: 0.23, size: [0.03, 0.03, 0.03], color: '#344944' },
  segments: 12,
} as const

// A ring buoy lies flat with a grab line looped around it.
export const ringBuoyModel = {
  ring: { y: 0.055, diameter: 0.56, thickness: 0.11, segments: 20, color: '#e0773a' },
  bands: { count: 4, radius: 0.28, y: 0.055, size: [0.12, 0.118, 0.04], color: '#f5efe2' },
  // The grab line loops just outside the tube so it shows.
  line: { y: 0.055, diameter: 0.68, thickness: 0.018, segments: 20, color: '#f1dfb3' },
} as const

export const radioModel = {
  body: { y: 0.1, size: [0.08, 0.2, 0.05], color: '#2f3a36' },
  screen: { y: 0.15, z: 0.026, size: [0.055, 0.04, 0.004], color: '#cfe3c4' },
  keypad: { y: 0.07, z: 0.026, size: [0.055, 0.06, 0.004], color: '#4a5a55' },
  antenna: { x: 0.025, y: 0.26, diameter: 0.012, height: 0.12, color: '#2f3a36' },
  knob: { x: -0.02, y: 0.205, diameter: 0.022, height: 0.012, color: '#e0773a' },
  segments: 8,
} as const

export const whistleModel = {
  barrel: { y: 0.015, size: [0.03, 0.03, 0.06], color: '#e0773a' },
  mouthpiece: { y: 0.012, z: -0.04, size: [0.022, 0.016, 0.03], color: '#e0773a' },
  ring: { y: 0.015, z: 0.035, diameter: 0.025, height: 0.006, color: '#a6b2a4' },
  lanyard: { y: 0.003, z: 0.07, size: [0.006, 0.006, 0.06], color: '#d65847' },
  segments: 8,
} as const

// Gear is drawn a little larger than life so it reads from the chase camera;
// the ring buoy is already large and stays life-size.
export const rescueGearScale = 1.4
export const ringBuoyScale = 1
