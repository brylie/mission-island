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
// Trees stay off ground steeper than this rise per metre, and every plant off wetter, sandier ground.
export const highwoodPlantingLimits = { treeSlope: 0.9, sand: 0.4 }
// Plants keep this far, in metres, from routes and the Fire Watch so paths stay clear.
export const highwoodRouteClearanceM = 3
// A plant's height varies by up to this share either way, so stands don't look cloned.
export const highwoodScaleSpread = 0.12

const pine = 'scots-pine', birch = 'birch', aspen = 'aspen', rowan = 'rowan', alder = 'alder', willow = 'willow'
const juniper = 'juniper', heather = 'heather', bilberry = 'bilberry', bracken = 'bracken'
const pineSapling = 'pine-sapling', birchSapling = 'birch-sapling', snag = 'pine-snag', log = 'deadfall-log'

export const highwoodPlantingLayers = {
  // The canopy: tall trees, one candidate per 5 m cell.
  canopy: {
    cellM: 5,
    stands: {
      pinewood: { cover: 0.62, mix: [{ species: pine, weight: 8, ages: { mature: 6, old: 3, young: 1 } }, { species: birch, weight: 1, ages: { mature: 1 } }, { species: rowan, weight: 1, ages: { mature: 1, young: 1 } }] },
      edge: { cover: 0.3, mix: [{ species: pine, weight: 3, ages: { young: 3, mature: 1 } }, { species: birch, weight: 3, ages: { young: 2, mature: 1 } }, { species: rowan, weight: 1, ages: { young: 1 } }] },
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
      pinewood: { cover: 0.22, mix: [{ species: bilberry, weight: 5, ages: { mature: 1 } }, { species: heather, weight: 1, ages: { mature: 1 } }, { species: pineSapling, weight: 1, ages: { young: 1 } }] },
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
