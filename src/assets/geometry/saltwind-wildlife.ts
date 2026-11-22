type Ellipsoid = readonly [
  x: number,
  y: number,
  z: number,
  diameterX: number,
  diameterY: number,
  diameterZ: number,
  color: string,
]

export const saltwindRoostTree = {
  height: 6.4,
  support: { width: 0.53, depth: 0.53, heightRatio: 0.5 },
  perchHeightRatio: 1.015,
} as const

export const saltwindMallardModel = {
  segments: 6,
  body: [0, 0.05, 0, 0.33, 0.25, 0.78, '#598978'] satisfies Ellipsoid,
  head: [0, 0.18, 0.28, 0.25, 0.26, 0.23, '#426752'] satisfies Ellipsoid,
} as const

export const saltwindHareColor = '#ae8e73'
export const saltwindFlockColors = { bird: '#ae8075', bat: '#61576c' } as const
