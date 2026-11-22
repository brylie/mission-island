// Each fallen twig records its world anchor, length, and heading.
export const lookoutCharredTwigs = [[4.77, 28.58, 0.67, 0.69], [4.38, 28.94, 0.31, -0.48], [5.38, 29.74, 0.51, 1.41], [7.25, 31.23, 0.56, -0.21]] as const

export const lookoutRecoveryBeds = [
  { x: 3.85, z: 28.75, rx: 1.55, rz: 1.66 },
  { x: 7.23, z: 31.4, rx: 1.26, rz: 0.65 },
] as const

export const northernScatter = {
  seed: 41132,
  regions: {
    juniper: { id: 'juniper', name: 'Juniper Hollow', biome: 'Pine forest', spread: 28, color: '#37675a', count: 38, trees: true },
    fernfall: { id: 'fernfall', name: 'Fernfall', biome: 'Stream valley', spread: 17, color: '#548a58', count: 24, trees: true },
    pool: { id: 'pool', name: 'Mirror Pool', biome: 'Wetlands', spread: 22, color: '#6d8e58', count: 28, trees: true },
    ridge: { id: 'ridge', name: 'Windstone Ridge', biome: 'Rocky ridge', spread: 27, color: '#958878', count: 36, trees: false },
  },
  discoveries: { x: -5, poolX: 21, z: -6 },
  scale: { min: 0.8, span: 1.35 },
} as const

export const starterScatter = {
  seed: 14757,
  trees: {
    count: 92,
    forest: { count: 48, width: 44, depth: 34 },
    island: { width: 129, depth: 83 },
    height: { min: 3.2, span: 4.6 },
    // Keep the harbor, town, and beach approach open.
    harborClear: { x: -34, z: 0 },
    townClear: { x: 18, z: -1 },
    beachClear: { x: 2, z: -10 },
  },
  rocks: {
    count: 82,
    coast: { count: 49, firstRadius: 0.955, radiusRange: 0.082, sizeRange: 2.7 },
    inland: { firstRadius: 0.26, radiusRange: 0.63, sizeRange: 1.2 },
    minSize: 0.65,
    lightEvery: 3,
  },
  ledgeStones: {
    embedRatio: 0.08,
    // Embedded stones flank the spring outlet, ledges and plunge pool.
    placements: [[9.7, 80.7, 1.65, 0.8], [9.2, 82.6, 1.45, -0.5], [12.55, 83.8, 1.9, 0.3], [10.63, 85.2, 1.25, 1.5], [14.06, 86.6, 1.7, 0.75], [12.16, 88.3, 1.15, -0.8], [16.8, 90.2, 1.06, 0.8]],
  },
} as const

export const strandedPatchDressing = { count: 14, width: 2.4, depth: 1.3 } as const

export const driftwoodDressing = {
  foxglove: { firstSeed: 173, seedStep: 37, scaleStep: 0.075 },
  wrack: { count: 19, middle: 7, spacingX: 0.12, spacingZ: 0.22, ripple: 2.7, rippleWidth: 0.13 },
} as const
