// What grows in each Highwood habitat (docs/field-guide/highwood-habitats.md).
// Planting runs in layers. Each layer scatters one candidate per `cellM` square
// cell; `cover` is the chance a candidate in that habitat becomes a plant, and
// `mix` weights the species and their ages. Distances are metres.

// The order ages and exposures are stored in the bake; they match the tree catalog's names.
export const plantingAges = ['young', 'mature', 'old'] as const
export const plantingExposures = ['sheltered', 'exposed'] as const
type Age = typeof plantingAges[number]
interface Pick { species: string, weight: number, ages: Partial<Record<Age, number>> }
interface Stand { cover: number, mix: readonly Pick[] }

export const highwoodPlantingSeed = 7121
// Seeded variants grown per species, age and exposure; placements reuse them.
export const highwoodTemplateVariants = 3
// Variant v grows from this seed plus v, on the host (collision) and on screen alike.
export const highwoodTemplateSeedBase = 1
// Wind exposure above which a tree or shrub grows its exposed, wind-bent form.
export const highwoodExposedAbove = 0.5
// Exposed forms lean downwind, each turned by up to this much either way so they don't line up exactly.
export const highwoodLeanJitter = 0.15
// Plants stand only where the authored island's share of the ground is below this.
export const highwoodAuthoredLimit = 0.5
// Trees stay off ground steeper than this rise per metre, and every plant off wetter, sandier ground.
export const highwoodPlantingLimits = { treeSlope: 0.9, sand: 0.4 }
// Plants keep this far, in metres, from the centreline of every path, and from the edge of a
// graded road's formation (its surface and shoulders), so paths and roads stay clear.
export const highwoodRouteClearanceM = 3
// Trees and deadwood keep off ground a road's grading moved by more than this many metres: its
// cut and fill banks, which builders leave to grass and ferns. Understory may grow on a bank
// no steeper than `highwoodBankCoverSlope` (rise per metre, tan 40 degrees): steeper batters
// are hard to revegetate (see docs/field-guide/practices/forest-roads.md).
export const highwoodEarthworksM = 0.15
export const highwoodBankCoverSlope = 0.84
// Sight lines kept open through the forest, as gaps on a crest would be, so the
// views players stop for stay open. Canopy and deadwood keep out of a corridor
// `halfWidthM` wide at the eye, widening by `spread` per metre, for `reachM` metres
// toward the look point. They match the capture presets of the same id. Wet woodland
// keeps its alders and willows inside a corridor: a creek bank stays wooded.
export const highwoodSightlines = [
  { id: 'highwood-summit-home', eye: { x: -95, z: 210 }, look: { x: -35, z: -5 }, reachM: 235, halfWidthM: 8, spread: 0.1 },
  { id: 'highwood-cairn-southwest', eye: { x: -212, z: 129 }, look: { x: -92, z: 219 }, reachM: 110, halfWidthM: 7, spread: 0.12 },
  { id: 'highwood-creek-ford', eye: { x: -270, z: 300 }, look: { x: -310, z: 280 }, reachM: 30, halfWidthM: 4, spread: 0.15 },
] as const
// Even a creek bank's trees keep this far back from a viewpoint, so the eye stands in the open.
export const highwoodSightlineEyeClearM = 12
// A plant's size varies by up to this share either way, so stands don't look cloned.
export const highwoodScaleSpread = 0.12
// Native pinewood grows in irregular clumps with glades between, not in rows. A
// layer's cover is scaled by soft noise patches: by up to `strength` either way,
// over patches about `wavelength` metres across. `scaleSpread` overrides the size spread.
export const highwoodClumping = {
  seed: 5303,
  canopy: { wavelength: 38, octaves: 2, lacunarity: 2, gain: 0.5, strength: 0.85, scaleSpread: 0.24 },
  understory: { wavelength: 18, octaves: 2, lacunarity: 2, gain: 0.5, strength: 0.6, scaleSpread: 0.2 },
} as const
// Fallen logs lie across a slope, along the contour, as windthrow comes to rest, and
// tilt to follow the ground between their ends. A log is placed only where the ground
// along `lengthM` stays within `reliefM` of that straight line, so it neither floats
// nor buries its middle.
export const highwoodLogLie = { species: 'deadfall-log', lengthM: 7, samples: 6, reliefM: 0.15 }
// Cover never rises above this share of candidates, however dense a clump.
export const highwoodMaximumCover = 0.92

const pine = 'scots-pine', birch = 'birch', aspen = 'aspen', rowan = 'rowan', alder = 'alder', willow = 'willow'
const juniper = 'juniper', heather = 'heather', bilberry = 'bilberry', bracken = 'bracken'
const pineSapling = 'pine-sapling', birchSapling = 'birch-sapling', snag = 'pine-snag', log = 'deadfall-log'

export const highwoodPlantingLayers = {
  // The canopy: tall trees, one candidate per 5 m cell.
  canopy: {
    cellM: 5,
    stands: {
      pinewood: { cover: 0.62, mix: [{ species: pine, weight: 8, ages: { mature: 6, old: 4 } }, { species: birch, weight: 1, ages: { mature: 1 } }, { species: rowan, weight: 1, ages: { mature: 1, young: 1 } }] },
      edge: { cover: 0.35, mix: [{ species: pine, weight: 4, ages: { young: 3, mature: 1 } }, { species: birch, weight: 3, ages: { young: 2, mature: 1 } }, { species: rowan, weight: 1, ages: { young: 1 } }] },
      birch: { cover: 0.55, mix: [{ species: birch, weight: 6, ages: { mature: 3, young: 1 } }, { species: aspen, weight: 3, ages: { mature: 2, young: 1 } }, { species: rowan, weight: 1, ages: { mature: 1 } }] },
      wet: { cover: 0.45, mix: [{ species: alder, weight: 3, ages: { mature: 2, young: 1 } }, { species: willow, weight: 2, ages: { mature: 1, young: 1 } }] },
      heath: { cover: 0.06, mix: [{ species: pine, weight: 1, ages: { young: 1, mature: 1 } }, { species: birch, weight: 1, ages: { young: 1 } }] },
      ridge: { cover: 0.05, mix: [{ species: pine, weight: 1, ages: { mature: 1, young: 1 } }] },
      bracken: { cover: 0.04, mix: [{ species: birch, weight: 1, ages: { young: 1 } }, { species: rowan, weight: 1, ages: { young: 1 } }] },
      shore: { cover: 0, mix: [] },
    } satisfies Record<string, Stand>,
  },
  // Shrubs, saplings and bracken under and between the trees, one candidate per 2.5 m cell.
  understory: {
    cellM: 2.5,
    stands: {
      pinewood: { cover: 0.22, mix: [{ species: bilberry, weight: 5, ages: { mature: 1 } }, { species: heather, weight: 1, ages: { mature: 1 } }] },
      edge: { cover: 0.45, mix: [{ species: bracken, weight: 3, ages: { mature: 1 } }, { species: pineSapling, weight: 2, ages: { young: 1 } }, { species: birchSapling, weight: 2, ages: { young: 1 } }, { species: juniper, weight: 1, ages: { mature: 1 } }] },
      birch: { cover: 0.3, mix: [{ species: bracken, weight: 2, ages: { mature: 1 } }, { species: birchSapling, weight: 1, ages: { young: 1 } }, { species: bilberry, weight: 1, ages: { mature: 1 } }] },
      wet: { cover: 0.2, mix: [{ species: willow, weight: 1, ages: { young: 1 } }] },
      heath: { cover: 0.55, mix: [{ species: heather, weight: 6, ages: { mature: 1 } }, { species: juniper, weight: 2, ages: { mature: 2, young: 1 } }, { species: bilberry, weight: 1, ages: { mature: 1 } }] },
      ridge: { cover: 0.35, mix: [{ species: heather, weight: 3, ages: { mature: 1 } }, { species: juniper, weight: 1, ages: { mature: 1 } }] },
      bracken: { cover: 0.7, mix: [{ species: bracken, weight: 1, ages: { mature: 1 } }] },
      shore: { cover: 0.05, mix: [{ species: heather, weight: 1, ages: { mature: 1 } }] },
    } satisfies Record<string, Stand>,
  },
  // Standing and fallen deadwood, which a healthy pinewood keeps, one candidate per 12 m cell.
  deadwood: {
    cellM: 12,
    stands: {
      pinewood: { cover: 0.25, mix: [{ species: snag, weight: 1, ages: { mature: 1 } }, { species: log, weight: 2, ages: { mature: 1 } }] },
      edge: { cover: 0.2, mix: [{ species: log, weight: 1, ages: { mature: 1 } }] },
      ridge: { cover: 0.15, mix: [{ species: log, weight: 1, ages: { mature: 1 } }, { species: snag, weight: 1, ages: { mature: 1 } }] },
      birch: { cover: 0.08, mix: [{ species: log, weight: 1, ages: { mature: 1 } }] },
      heath: { cover: 0, mix: [] },
      wet: { cover: 0.08, mix: [{ species: log, weight: 1, ages: { mature: 1 } }] },
      bracken: { cover: 0, mix: [] },
      shore: { cover: 0, mix: [] },
    } satisfies Record<string, Stand>,
  },
} as const
