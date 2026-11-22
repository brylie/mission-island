const trayHalfWidth = 0.39
const trayHalfDepth = 0.5
const trayRimHeight = 0.82
const trayNoseWidthScale = 0.76
const trayNoseDrop = 0.04

export const barrowTray = {
  halfWidth: trayHalfWidth,
  halfDepth: trayHalfDepth,
  rimHeight: trayRimHeight,
  rim: [
    [-trayHalfWidth, trayRimHeight, -trayHalfDepth],
    [trayHalfWidth, trayRimHeight, -trayHalfDepth],
    [trayHalfWidth * trayNoseWidthScale, trayRimHeight - trayNoseDrop, trayHalfDepth],
    [-trayHalfWidth * trayNoseWidthScale, trayRimHeight - trayNoseDrop, trayHalfDepth],
  ],
  floor: [[-0.255, 0.53, -0.32], [0.255, 0.53, -0.32], [0.19, 0.53, 0.34], [-0.19, 0.53, 0.34]],
  base: { y: 0.518, size: [0.52, 0.024, 0.67], color: '#395c50' },
  innerRim: { insetScale: 0.97, drop: 0.016 },
  panels: { triangles: [0, 1, 2, 0, 2, 3], steel: '#39665a', interior: '#50776a' },
  lip: { width: 0.029, height: 0.026, overhang: 0.025, color: '#75978a' },
} as const

export const barrowWheel = {
  radius: 0.26,
  axleZ: 0.55,
  halfWidth: 0.095,
  tire: { segments: 24, color: '#303431' },
  rim: { diameter: 0.315, extraWidth: 0.013, segments: 16, color: '#857759' },
  axle: { diameter: 0.095, width: 0.239, segments: 10, color: '#4d514b' },
  spokes: { x: 0.104, size: [0.018, 0.273, 0.025], angles: [0, Math.PI / 3, 2 * Math.PI / 3], color: '#b39b6f' },
} as const

// The foot pads also determine the two ground contacts used to pitch the tray.
export const barrowFeet = { halfWidth: 0.326, z: -0.355 } as const

export const barrowFrame = {
  rail: { center: [0.31, 0.617, 0.029], size: [0.057, 0.059, 1.04], pitch: 0.43, splay: 0.29, color: '#8b6947' },
  grip: { center: { x: 0.46, y: 0.9, z: -0.48 }, size: [0.07, 0.074, 0.18], color: '#5d4934' },
  axleStrut: { center: [0.205, 0.39, 0.44], size: [0.039, 0.32, 0.049], splay: 0.51, color: '#485954' },
  leg: { x: 0.28, y: 0.249, size: [0.05, 0.494, 0.052], splay: 0.19, color: '#50605a' },
  legBrace: { center: [0.25, 0.246, -0.239], size: [0.039, 0.54, 0.042], pitch: -0.46, color: '#50605a' },
  footPad: { y: 0.031, size: [0.097, 0.052, 0.066], color: '#39413e' },
  crossBrace: { y: 0.32, z: -0.31, size: [0.65, 0.036, 0.043], color: '#51605a' },
} as const

// The view reveals these slots in packing order and staggers their fall into the tray.
export const packedCarrotSlots = [
  { center: [-0.148, 0.575, -0.167], heading: 0.62, scale: 0.91 },
  { center: [0, 0.601, -0.167], heading: -0.14, scale: 0.97 },
  { center: [0.148, 0.575, -0.167], heading: 0.35, scale: 1.03 },
  { center: [-0.148, 0.601, 0.15], heading: -0.66, scale: 0.91 },
  { center: [0, 0.575, 0.15], heading: 0.16, scale: 0.97 },
  { center: [0.148, 0.601, 0.15], heading: 0.48, scale: 1.03 },
] as const
