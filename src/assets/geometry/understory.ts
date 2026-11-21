export const juniperFern = { name: 'Juniper fern fans', height: 0.53, bend: 0.5, color: '#72925d', seed: 1632 } as const

export const understoryBladeGeometry = {
  leafAngleStep: 2.34,
  angleJitter: 0.26,
  heightScale: { base: 0.7, spread: 0.4 },
  bendScale: { base: 0.6, spread: 0.6 },
  halfWidth: { base: 0.03, bendRatio: 0.1 },
  rootReach: 0.07,
  shoulder: { reach: 0.42, height: 0.63 },
} as const
