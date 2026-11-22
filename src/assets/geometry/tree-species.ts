// Highwood tree species for the cool-temperate maritime island, in metres and radians.
// Fractions are of the tree's height unless noted. Exposed trees lean toward +x,
// so placement should turn each instance until +x points downwind. Old trees are
// grown from the mature values with treeGrowth.old applied.

type Span = readonly [number, number]
interface ByAge<T> { readonly young: T, readonly mature: T }
// Pairs of (position up the crown 0–1, branch length relative to the widest point).
type CrownProfile = readonly (readonly [number, number])[]

export interface TreeForm {
  readonly habit: 'tree'
  readonly name: string
  readonly budget: 'tree' | 'shrub'
  readonly foliage: 'needles' | 'broadleaf'
  readonly height: ByAge<Span>
  readonly trunk: {
    readonly radius: ByAge<number>
    readonly topRadius: number
    readonly flare: number
    // Stems from the base, drawn per seed; birch and willow are often several.
    readonly stems: ByAge<Span>
    readonly stemLean: number
    readonly meander: number
  }
  readonly crown: {
    readonly base: ByAge<number>
    readonly radius: ByAge<number>
    // Foliage-bearing limbs for the whole tree, drawn per seed and shared between stems.
    readonly branches: ByAge<Span>
    readonly whorl: number
    readonly profile: ByAge<CrownProfile>
    // Branch arc slopes per unit length: departure rise, sag under foliage, lift at the tip.
    readonly arc: { readonly rise: number, readonly droop: number, readonly lift: number, readonly liftFrom: number }
    readonly branchRadius: number
    readonly fork: number
    readonly forkSpread: number
    // One clump per limb, centred at `at` along it; size is a fraction of the crown radius.
    readonly clump: { readonly at: number, readonly size: number, readonly flatten: number, readonly lift: number, readonly height: number }
    readonly top: { readonly size: number, readonly height: number }
  }
  readonly exposure: { readonly lean: number, readonly height: number, readonly windward: number, readonly leeward: number, readonly flatten: number, readonly drift: number }
  readonly bark: { readonly lower: string, readonly upper: string, readonly transition: number, readonly band?: { readonly color: string, readonly chance: number } }
  // Three clump tones from shaded to sunlit, and how dark undersides and inner clumps go.
  readonly leaves: { readonly colors: readonly [string, string, string], readonly underside: number, readonly inner: number }
  readonly far: { readonly masses: number, readonly mass: number }
  // Old trees: the chance the leading stem has snapped, and how much the crown flattens with age.
  readonly old: { readonly breakChance: number, readonly flatten: number }
  readonly accent?: { readonly color: string, readonly clusters: number, readonly size: number }
}

const pineBark = { lower: '#62544a', upper: '#c4723f', transition: 0.42 } as const
const pineArc = { rise: 0.3, droop: 0.55, lift: 0.5, liftFrom: 0.6 } as const

export const scotsPine: TreeForm = {
  habit: 'tree',
  name: 'Scots pine',
  budget: 'tree',
  foliage: 'needles',
  height: { young: [4, 7.5], mature: [11, 15] },
  trunk: { radius: { young: 0.02, mature: 0.024 }, topRadius: 0.16, flare: 0.35, stems: { young: [1, 1], mature: [1, 1] }, stemLean: 0, meander: 0.018 },
  crown: {
    base: { young: 0.18, mature: 0.56 },
    radius: { young: 0.3, mature: 0.27 },
    branches: { young: [6, 8], mature: [5, 7] },
    whorl: 2,
    profile: { young: [[0, 1], [0.6, 0.62], [1, 0.15]], mature: [[0, 0.62], [0.45, 1], [0.8, 0.85], [1, 0.4]] },
    arc: pineArc,
    branchRadius: 0.38,
    fork: 0.3,
    forkSpread: 0.6,
    clump: { at: 0.72, size: 0.46, flatten: 0.6, lift: 0.3, height: 0.48 },
    top: { size: 0.36, height: 0.6 },
  },
  exposure: { lean: 0.24, height: 0.62, windward: 0.35, leeward: 1.3, flatten: 0.55, drift: 0.32 },
  bark: pineBark,
  leaves: { colors: ['#34503d', '#42614a', '#58735a'], underside: 0.66, inner: 0.82 },
  far: { masses: 4, mass: 1.05 },
  old: { breakChance: 0.25, flatten: 0.4 },
}

export const pineSapling: TreeForm = {
  ...scotsPine,
  name: 'Pine sapling',
  budget: 'shrub',
  height: { young: [0.55, 0.85], mature: [1.5, 2.2] },
  trunk: { ...scotsPine.trunk, radius: { young: 0.03, mature: 0.028 }, flare: 0.2 },
  crown: {
    ...scotsPine.crown,
    base: { young: 0.15, mature: 0.12 },
    radius: { young: 0.36, mature: 0.34 },
    branches: { young: [3, 4], mature: [5, 6] },
    profile: { young: [[0, 1], [1, 0.3]], mature: [[0, 1], [0.6, 0.6], [1, 0.2]] },
    fork: 0,
    clump: { ...scotsPine.crown.clump, size: 0.55 },
    top: { size: 0.42, height: 0.75 },
  },
  bark: { ...pineBark, upper: '#9a6a48', transition: 0.6 },
  far: { masses: 2, mass: 1.1 },
}

export const birch: TreeForm = {
  habit: 'tree',
  // Silver birch (Betula pendula): weeping twig tips and strongly marked bark. Keep it to drier ground.
  name: 'Silver birch',
  budget: 'tree',
  foliage: 'broadleaf',
  height: { young: [3.4, 4.6], mature: [9, 12] },
  trunk: { radius: { young: 0.016, mature: 0.019 }, topRadius: 0.12, flare: 0.25, stems: { young: [1, 2], mature: [1, 3] }, stemLean: 0.13, meander: 0.022 },
  crown: {
    base: { young: 0.5, mature: 0.62 },
    radius: { young: 0.17, mature: 0.17 },
    branches: { young: [4, 5], mature: [4, 5] },
    whorl: 0,
    profile: { young: [[0, 0.75], [0.4, 1], [1, 0.3]], mature: [[0, 0.7], [0.35, 1], [0.75, 0.8], [1, 0.3]] },
    arc: { rise: 1.3, droop: 1.3, lift: 0, liftFrom: 1 },
    branchRadius: 0.32,
    fork: 0.45,
    forkSpread: 0.5,
    // Clumps hang below the arching limbs and stand taller than wide: an airy, weeping oval.
    clump: { at: 0.9, size: 0.45, flatten: 0.15, lift: -0.3, height: 1.5 },
    top: { size: 0.36, height: 1.3 },
  },
  exposure: { lean: 0.16, height: 0.72, windward: 0.5, leeward: 1.15, flatten: 0.3, drift: 0.25 },
  bark: { lower: '#55504a', upper: '#e2ded3', transition: 0.1, band: { color: '#46423d', chance: 0.3 } },
  leaves: { colors: ['#80965e', '#97aa6d', '#b1bd84'], underside: 0.74, inner: 0.86 },
  far: { masses: 3, mass: 1.05 },
  old: { breakChance: 0.5, flatten: 0.15 },
}

export const birchSapling: TreeForm = {
  ...birch,
  name: 'Birch sapling',
  budget: 'shrub',
  height: { young: [0.7, 1.1], mature: [1.7, 2.5] },
  trunk: { ...birch.trunk, radius: { young: 0.018, mature: 0.018 }, stems: { young: [1, 1], mature: [1, 2] } },
  crown: { ...birch.crown, base: { young: 0.35, mature: 0.3 }, branches: { young: [2, 3], mature: [3, 4] }, fork: 0.2, clump: { ...birch.crown.clump, size: 0.6 }, top: { size: 0.45, height: 0.9 } },
  far: { masses: 2, mass: 1.05 },
}

export const aspen: TreeForm = {
  habit: 'tree',
  name: 'Aspen',
  budget: 'tree',
  foliage: 'broadleaf',
  height: { young: [3.8, 5], mature: [10, 13] },
  trunk: { radius: { young: 0.017, mature: 0.019 }, topRadius: 0.18, flare: 0.2, stems: { young: [1, 1], mature: [1, 1] }, stemLean: 0, meander: 0.012 },
  crown: {
    base: { young: 0.45, mature: 0.6 },
    radius: { young: 0.17, mature: 0.18 },
    branches: { young: [5, 6], mature: [5, 7] },
    whorl: 0,
    profile: { young: [[0, 0.6], [0.45, 1], [1, 0.5]], mature: [[0, 0.55], [0.4, 1], [0.8, 0.9], [1, 0.55]] },
    arc: { rise: 0.85, droop: 0.32, lift: 0.1, liftFrom: 0.7 },
    branchRadius: 0.36,
    fork: 0.35,
    forkSpread: 0.55,
    clump: { at: 0.68, size: 0.55, flatten: 0.2, lift: 0.1, height: 0.9 },
    top: { size: 0.5, height: 0.9 },
  },
  exposure: { lean: 0.12, height: 0.75, windward: 0.55, leeward: 1.1, flatten: 0.35, drift: 0.2 },
  bark: { lower: '#67665b', upper: '#cdcfba', transition: 0.14, band: { color: '#5f6056', chance: 0.22 } },
  leaves: { colors: ['#6c8a52', '#809d5f', '#9cb474'], underside: 0.74, inner: 0.84 },
  far: { masses: 4, mass: 1.05 },
  old: { breakChance: 0.3, flatten: 0.15 },
}

export const rowan: TreeForm = {
  habit: 'tree',
  name: 'Rowan',
  budget: 'tree',
  foliage: 'broadleaf',
  height: { young: [2.4, 3.3], mature: [5.5, 7.5] },
  trunk: { radius: { young: 0.024, mature: 0.024 }, topRadius: 0.2, flare: 0.25, stems: { young: [1, 2], mature: [1, 3] }, stemLean: 0.22, meander: 0.025 },
  crown: {
    base: { young: 0.35, mature: 0.38 },
    radius: { young: 0.3, mature: 0.32 },
    branches: { young: [5, 6], mature: [5, 6] },
    whorl: 0,
    profile: { young: [[0, 0.7], [0.4, 1], [1, 0.45]], mature: [[0, 0.75], [0.45, 1], [1, 0.45]] },
    arc: { rise: 1.05, droop: 0.45, lift: 0.15, liftFrom: 0.7 },
    branchRadius: 0.4,
    fork: 0.35,
    forkSpread: 0.6,
    clump: { at: 0.7, size: 0.46, flatten: 0.35, lift: 0.1, height: 0.62 },
    top: { size: 0.42, height: 0.7 },
  },
  exposure: { lean: 0.14, height: 0.75, windward: 0.55, leeward: 1.15, flatten: 0.35, drift: 0.22 },
  bark: { lower: '#625e57', upper: '#8f8a80', transition: 0.3 },
  leaves: { colors: ['#58774a', '#698a55', '#819f67'], underside: 0.7, inner: 0.82 },
  far: { masses: 3, mass: 1.05 },
  accent: { color: '#c34a30', clusters: 4, size: 0.014 },
  old: { breakChance: 0.2, flatten: 0.15 },
}

export const alder: TreeForm = {
  habit: 'tree',
  name: 'Alder',
  budget: 'tree',
  foliage: 'broadleaf',
  height: { young: [3.4, 4.6], mature: [8, 11] },
  trunk: { radius: { young: 0.024, mature: 0.022 }, topRadius: 0.12, flare: 0.3, stems: { young: [1, 1], mature: [1, 2] }, stemLean: 0.14, meander: 0.015 },
  crown: {
    base: { young: 0.22, mature: 0.3 },
    radius: { young: 0.25, mature: 0.27 },
    branches: { young: [5, 6], mature: [5, 6] },
    whorl: 0,
    profile: { young: [[0, 1], [0.5, 0.7], [1, 0.2]], mature: [[0, 1], [0.5, 0.75], [1, 0.25]] },
    arc: { rise: 0.55, droop: 0.28, lift: 0.14, liftFrom: 0.65 },
    branchRadius: 0.34,
    fork: 0.2,
    forkSpread: 0.5,
    // Large clumps close along a central leader overlap into one dense cone with a pointed top.
    clump: { at: 0.5, size: 0.72, flatten: 0.15, lift: 0.1, height: 0.85 },
    top: { size: 0.36, height: 1.6 },
  },
  exposure: { lean: 0.12, height: 0.72, windward: 0.55, leeward: 1.1, flatten: 0.35, drift: 0.2 },
  bark: { lower: '#463f3a', upper: '#5c554d', transition: 0.4, band: { color: '#7a7268', chance: 0.12 } },
  leaves: { colors: ['#466341', '#53724b', '#68865b'], underside: 0.7, inner: 0.82 },
  far: { masses: 4, mass: 1.05 },
  old: { breakChance: 0.3, flatten: 0.15 },
}

export const willow: TreeForm = {
  habit: 'tree',
  name: 'Grey willow',
  budget: 'tree',
  foliage: 'broadleaf',
  height: { young: [2, 2.8], mature: [4, 5.5] },
  trunk: { radius: { young: 0.026, mature: 0.028 }, topRadius: 0.25, flare: 0.2, stems: { young: [2, 3], mature: [3, 4] }, stemLean: 0.6, meander: 0.03 },
  crown: {
    base: { young: 0.1, mature: 0.1 },
    radius: { young: 0.44, mature: 0.5 },
    branches: { young: [4, 5], mature: [5, 6] },
    whorl: 0,
    profile: { young: [[0, 1], [0.5, 1], [1, 0.75]], mature: [[0, 1], [0.5, 1], [1, 0.75]] },
    arc: { rise: 0.6, droop: 0.45, lift: 0.2, liftFrom: 0.6 },
    branchRadius: 0.45,
    fork: 0.25,
    forkSpread: 0.65,
    // Broad, low, soft-edged clumps merge into one wide mound over the stems.
    clump: { at: 0.7, size: 0.75, flatten: 0.15, lift: 0.1, height: 0.85 },
    top: { size: 0.42, height: 0.85 },
  },
  exposure: { lean: 0.16, height: 0.7, windward: 0.5, leeward: 1.2, flatten: 0.4, drift: 0.3 },
  bark: { lower: '#5d594f', upper: '#7d796b', transition: 0.3 },
  leaves: { colors: ['#7a8b72', '#90a088', '#a9b7a1'], underside: 0.76, inner: 0.86 },
  far: { masses: 3, mass: 1.15 },
  old: { breakChance: 0, flatten: 0.1 },
}

// Triangles per template. Shrubs are scattered far more densely, so they get less.
export const templateBudgets = {
  // Far trees run to 160 so each mass keeps two rings: one-ring masses read as diamonds and pop at the switch.
  tree: { near: [600, 1500], far: [60, 160] },
  shrub: { near: [100, 800], far: [24, 120] },
  // Bare wood carries no foliage, so a full near model needs fewer triangles than a tree.
  deadwood: { near: [150, 800], far: [24, 120] },
} as const

export const treeDetail = {
  near: { trunkSides: 7, trunkRings: 7, stemSides: 6, stemRings: 6, branchSides: 4, branchRings: 5, twigSides: 3, twigRings: 2, padSegments: 8, padRings: 4, accentSegments: 4 },
  far: { trunkSides: 4, trunkRings: 4, stemSides: 3, stemRings: 2, branchSides: 3, branchRings: 1, twigSides: 3, twigRings: 1, padSegments: 5, padRings: 2, accentSegments: 0 },
} as const

export const treeGrowth = {
  // Depth the trunk continues below its origin, as a fraction of base radius, so slopes never show a gap.
  embed: 1.5,
  goldenAngle: 2.39996,
  azimuthJitter: 0.5,
  heightJitter: 0.35,
  lengthJitter: [0.82, 1.15],
  // Low-frequency lobes and fine facet noise keep clumps from reading as spheres.
  padJitter: 0.1,
  lobeDepth: 0.17,
  lobes: [2, 3],
  padSize: [0.85, 1.15],
  // Per-clump thickness, so neighbouring pads in one crown are not identical discs.
  clumpThickness: [0.75, 1.25],
  // The art brief asks for three to nine clumps in a crown.
  clumpLimit: 9,
  minimumStemBranches: 2,
  forkAt: [0.45, 0.6],
  forkLength: [0.45, 0.6],
  forkRise: 0.35,
  branchTipRadius: 0.2,
  minimumBranchRadius: 0.012,
  topReach: 0.97,
  stemHeight: [0.72, 0.9],
  stemOffset: 0.6,
  bendPower: 1.6,
  // Root flare swells the bottom quarter of a trunk, easing out with this power.
  flareFalloff: 4,
  flareCurve: 2,
  // Limbs at least this many times the thinnest branch keep the full ring of sides.
  roundLimbRatio: 2,
  // Half-waves of gentle trunk meander from base to top.
  meanderWaves: 1.5,
  // A sheltered trunk still sweeps a little off vertical, as a fraction of its height.
  sweep: [0.03, 0.065],
  barkBandShade: 0.6,
  farLimbs: 2,
  // Distant masses carry flatter, slightly lighter values than the near clumps.
  farFlatten: 0.55,
  farLift: 1.08,
  accentSpread: 0.6,
  accentBerries: 3,
  old: {
    height: 1.06,
    girth: 1.4,
    branches: 0.72,
    // An old crown keeps a few heavy limbs, never fewer than this.
    fewestLimbs: 4,
    limb: 1.8,
    spread: 1.15,
    droop: 1.25,
    fork: 0.8,
    // Old crowns snap here, as a fraction of height, and the stem ends in a ragged break.
    breakAt: 0.9,
    jag: 1.6,
    humps: 4,
    humpSize: [0.9, 1.4],
    humpReach: 1.25,
    humpHeight: 0.45,
    humpShade: 0.85,
  },
} as const
