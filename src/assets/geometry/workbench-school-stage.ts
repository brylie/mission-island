const diameter = 16
const sides = 64

export const schoolStage = {
  ground: { height: -1.1, color: '#485b57' },
  basin: { y: -0.74, diameter, height: 0.55, sides },
  water: { diameter, height: 0.015, sides, color: '#4d9fa6', opacity: 0.20 },
  stones: { count: 15, angleStep: 2.4, radius: 6.6, ripple: 0.48, rate: 3.1, y: -0.49, width: 0.58, widthVariation: 0.3, height: 0.32, depth: 0.42 },
  trail: { y: -0.14, opacity: 0.65, color: '#b7d7cd' },
  leader: { diameter: 1.05, thickness: 0.045, tessellation: 40 },
  fishY: -0.09,
  crewY: -0.44,
  boatY: 0.02,
} as const
