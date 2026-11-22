// Highwood shrubs, groundcover and deadwood, in metres and radians. Exposed forms
// press down and stream toward +x, matching the trees in tree-species.ts.

type Span = readonly [number, number]
interface ByAge<T> { readonly young: T, readonly mature: T }

export interface MoundForm {
  readonly habit: 'mound'
  readonly name: string
  readonly foliage: 'needles' | 'broadleaf'
  readonly height: ByAge<Span>
  // Half-width of the whole plant.
  readonly spread: ByAge<Span>
  readonly clumps: ByAge<number>
  // Clump radius as a fraction of the spread, and vertical stretch for flame-shaped juniper.
  readonly clump: { readonly size: number, readonly stretch: number, readonly point: number, readonly flatten: number }
  readonly stems: number
  readonly stemRadius: number
  readonly exposure: { readonly height: number, readonly spread: number, readonly lean: number, readonly stretch: number }
  readonly leaves: { readonly colors: readonly [string, string, string], readonly underside: number, readonly inner: number }
  readonly bark: string
  readonly far: { readonly masses: number, readonly mass: number }
  // Clusters are separate berries in metres; cover blends the clump tops toward the color instead.
  readonly accent?: { readonly color: string, readonly clusters: number, readonly size: number, readonly cover: number }
  // The chance a sheltered plant grows as a low spreading vase instead of a column, and its proportions.
  readonly vase?: { readonly chance: number, readonly height: number, readonly spread: number, readonly stretch: number }
}

export interface FrondForm {
  readonly habit: 'fronds'
  readonly name: string
  readonly fronds: ByAge<number>
  readonly length: ByAge<Span>
  // The stipe climbs steeply, then the blade arches over and its tip falls.
  // The stipe stands nearly upright (height and lean per unit length over the stipe), then the
  // blade runs out nearly level: rise and droop are per unit length beyond the stipe.
  readonly arc: { readonly stipe: number, readonly lean: number, readonly rise: number, readonly droop: number }
  // Bracken fronds rise singly from creeping rhizomes, this far apart from the patch centre.
  readonly patch: Span
  readonly blade: { readonly start: number, readonly width: number, readonly lobes: number, readonly lobeDepth: number, readonly segments: number }
  readonly exposure: { readonly height: number, readonly spread: number }
  readonly leaves: { readonly colors: readonly [string, string, string], readonly tip: string }
  readonly far: { readonly fronds: number, readonly segments: number }
}

export interface SnagForm {
  readonly habit: 'snag'
  readonly name: string
  readonly height: ByAge<Span>
  // Base radius in metres: a dead pine keeps the girth of the mature tree it was.
  readonly radius: Span
  readonly topRadius: number
  readonly stubs: ByAge<number>
  readonly limbs: ByAge<number>
  readonly limb: { readonly length: number, readonly rise: number, readonly droop: number }
  readonly stub: { readonly length: number, readonly droop: number }
  readonly broken: { readonly jag: number }
  readonly lean: { readonly sheltered: number, readonly exposed: number }
  readonly bark: { readonly lower: string, readonly upper: string, readonly bare: string, readonly transition: ByAge<number> }
}

export interface LogForm {
  readonly habit: 'log'
  readonly name: string
  readonly length: ByAge<Span>
  readonly radius: ByAge<Span>
  readonly sink: ByAge<number>
  readonly bow: number
  readonly stubs: ByAge<number>
  readonly stub: { readonly length: number, readonly radius: number }
  readonly roots: { readonly size: number, readonly depth: number, readonly segments: number }
  readonly broken: { readonly jag: number }
  readonly bark: { readonly wood: string, readonly bare: string, readonly moss: string, readonly mossCover: ByAge<number> }
}

export const juniper: MoundForm = {
  habit: 'mound',
  name: 'Common juniper',
  foliage: 'needles',
  height: { young: [0.6, 0.9], mature: [1.6, 2.3] },
  spread: { young: [0.3, 0.42], mature: [0.45, 0.65] },
  clumps: { young: 7, mature: 11 },
  // Many small pointed clumps break the outline into spiky tips instead of one rock-like mass.
  clump: { size: 0.45, stretch: 1.9, point: 0.7, flatten: 0.15 },
  stems: 2,
  stemRadius: 0.035,
  exposure: { height: 0.3, spread: 2.6, lean: 0.4, stretch: 0.45 },
  leaves: { colors: ['#3b5753', '#4a6863', '#5f7d76'], underside: 0.68, inner: 0.82 },
  vase: { chance: 0.45, height: 0.55, spread: 1.7, stretch: 0.55 },
  bark: '#6a4f3c',
  far: { masses: 3, mass: 1 },
}

export const heather: MoundForm = {
  habit: 'mound',
  name: 'Heather',
  foliage: 'needles',
  height: { young: [0.18, 0.26], mature: [0.32, 0.46] },
  spread: { young: [0.22, 0.3], mature: [0.38, 0.52] },
  clumps: { young: 4, mature: 6 },
  clump: { size: 0.48, stretch: 0.8, point: 0.1, flatten: 0.4 },
  stems: 0,
  stemRadius: 0,
  exposure: { height: 0.7, spread: 1.3, lean: 0.15, stretch: 0.85 },
  leaves: { colors: ['#5e4d4a', '#6e5b55', '#806b61'], underside: 0.72, inner: 0.82 },
  bark: '#4b3a2e',
  far: { masses: 3, mass: 1 },
  accent: { color: '#8e6283', clusters: 0, size: 0, cover: 0.6 },
}

export const bilberry: MoundForm = {
  habit: 'mound',
  name: 'Bilberry',
  foliage: 'broadleaf',
  height: { young: [0.18, 0.24], mature: [0.3, 0.45] },
  spread: { young: [0.2, 0.28], mature: [0.32, 0.45] },
  clumps: { young: 4, mature: 6 },
  clump: { size: 0.5, stretch: 0.9, point: 0.15, flatten: 0.35 },
  stems: 0,
  stemRadius: 0,
  exposure: { height: 0.7, spread: 1.25, lean: 0.12, stretch: 0.85 },
  leaves: { colors: ['#5b893e', '#6c9a47', '#86ad56'], underside: 0.74, inner: 0.84 },
  bark: '#4d5a32',
  far: { masses: 3, mass: 1 },
  accent: { color: '#2e3256', clusters: 6, size: 0.012, cover: 0 },
}

export const bracken: FrondForm = {
  habit: 'fronds',
  name: 'Bracken',
  fronds: { young: 5, mature: 9 },
  length: { young: [0.45, 0.65], mature: [1, 1.4] },
  arc: { stipe: 2.2, lean: 0.2, rise: 0.4, droop: 0.6 },
  patch: [0.2, 0.5],
  blade: { start: 0.32, width: 0.42, lobes: 4, lobeDepth: 0.45, segments: 8 },
  exposure: { height: 0.65, spread: 1.3 },
  leaves: { colors: ['#6b7a3e', '#7b8a46', '#919850'], tip: '#a8733f' },
  far: { fronds: 4, segments: 3 },
}

export const pineSnag: SnagForm = {
  habit: 'snag',
  name: 'Standing dead pine',
  height: { young: [7, 9.5], mature: [4.5, 7] },
  radius: [0.24, 0.36],
  topRadius: 0.38,
  stubs: { young: 8, mature: 10 },
  limbs: { young: 4, mature: 2 },
  limb: { length: 0.16, rise: 0.35, droop: 0.7 },
  stub: { length: 0.07, droop: 0.3 },
  broken: { jag: 2.4 },
  lean: { sheltered: 0.03, exposed: 0.11 },
  bark: { lower: '#5b4b40', upper: '#97653f', bare: '#a49e92', transition: { young: 0.55, mature: 0.15 } },
}

export const deadfallLog: LogForm = {
  habit: 'log',
  name: 'Deadfall log',
  // Storms mostly throw mature trees, so a fresh log is long and stout; an old one has lost its crown end.
  length: { young: [9, 13], mature: [5.5, 7.5] },
  radius: { young: [0.26, 0.36], mature: [0.18, 0.24] },
  sink: { young: 0.15, mature: 0.4 },
  bow: 0.05,
  stubs: { young: 7, mature: 4 },
  stub: { length: 0.55, radius: 0.28 },
  roots: { size: 2.4, depth: 0.42, segments: 8 },
  broken: { jag: 2.2 },
  bark: { wood: '#6a5444', bare: '#9c968a', moss: '#5f7a3c', mossCover: { young: 0.15, mature: 0.55 } },
}

export const shrubGrowth = {
  clumpJitter: 0.18,
  clumpLift: 0.45,
  accentCover: 0.35,
  frondFan: 0.4,
  frondTilt: 0.45,
  // How far each frond's tip turns from rust-green toward bronze; young fronds turn half as far.
  frondBronze: [0.25, 0.75],
  stipeWidth: 0.025,
  // A frond blade narrows from its base to the tip with this power.
  bladeTaper: 0.8,
  logSides: 8,
  logRings: 7,
  farLogSides: 4,
  farLogRings: 2,
  snagSides: 8,
  snagRings: 8,
  farSnagSides: 4,
  farSnagRings: 3,
  stubSides: 3,
  // Heights up the stem where snag stubs and dead limbs, or log stubs, can grow.
  stubRange: [0.2, 0.95],
  limbRange: [0.45, 0.85],
  berrySize: [0.75, 1.25],
  roughness: 0.12,
  deadwood: {
    // Stub and dead-limb thickness as a share of the trunk where they leave it, and their tip taper.
    stubRadius: 0.22,
    limbRadius: 0.3,
    limbTip: 0.25,
    limbRings: 3,
    // A log narrows toward its snapped crown end.
    logTip: 0.65,
    // The torn root plate sits partly sunk, ragged, and darker than the bark.
    rootSink: 0.45,
    rootJitter: 0.28,
    rootShade: 0.55,
    // How sharply moss gives way to bare wood around the log.
    mossSharpness: 2,
  },
} as const
