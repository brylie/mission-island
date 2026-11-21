import { gameplaySurfaceRecipes } from './gameplay-surface-recipes.ts'
import { recipe } from './surface-recipe.ts'

export { gameplaySurfaceFamilies, standardSurfaceFamilies, surfaceFamilies } from './surface-recipe.ts'

const standardSurfaceRecipes = [
  recipe('meadow-turf', 'Meadow turf', 'Grass and forest ground', 471, ['Tuft spacing', 55, 16], ['Thinning', 0.27], ['#465636', '#778d4b', '#94805a'], 1.05, 0.87, 'Low green tufts break around worn and dry soil. Use on the grassy rise west of the lookout.'),
  recipe('dry-turf', 'Dry turf', 'Grass and forest ground', 773, ['Tuft spacing', 72, 16], ['Bare ground', 0.62], ['#74613a', '#a39756', '#af8e55'], 0.95, 0.93, 'Sparse curled straw exposes dusty earth during drought. Use on the sun-baked side of a footpath.'),
  recipe('pine-duff', 'Pine duff', 'Grass and forest ground', 283, ['Needle length', 48, 8], ['Decomposition', 0.4], ['#3f3127', '#886442', '#b48e59'], 1.25, 0.95, 'Broken russet needles and decaying litter cover dark soil. Use on the Pinewoods floor.'),
  recipe('path-gravel', 'Path gravel', 'Loose aggregate', 943, ['Stone size', 36, 16], ['Compaction', 0.58], ['#676356', '#b9b094', '#95816a'], 2.05, 0.95, 'Compacted angular chips sit in dusty fines. Use on Starter Island’s harbor gravel approach.'),
  recipe('scree', 'Scree', 'Loose aggregate', 667, ['Stone size', 115, 12], ['Fragmentation', 0.38], ['#515457', '#9d9b91', '#c0ab8b'], 2.8, 0.94, 'Loose, fractured wedges overlap on a steep slope. Use below an exposed ridge.'),
  recipe('cobbles', 'Cobbles', 'Loose aggregate', 138, ['Stone size', 174, 8], ['Joint exposure', 0.33], ['#504740', '#9e9e91', '#aba189'], 2.65, 0.89, 'Rounded river stones sit in wide, recessed joints. Use as a drainage strip beside a lane.'),
  recipe('dry-beach', 'Dry beach', 'Sand and sediment', 331, ['Grain size', 1.2, 48], ['Wind scouring', 0.22], ['#ad8d60', '#e4cb95', '#faf0ce'], 0.62, 0.92, 'Loose, wind-scoured sand with pale shell grains. Use on the dry upper beach.'),
  recipe('rippled-sand', 'Rippled sand', 'Sand and sediment', 228, ['Ripple spacing', 125, 8], ['Crest erosion', 0.27], ['#98714d', '#c5a573', '#e3c699'], 1.7, 0.88, 'Asymmetric ridges and softer troughs from tidal flow. Use below the last high-water mark.'),
  recipe('estuary-silt', 'Estuary silt', 'Sand and sediment', 741, ['Mud plate size', 105, 10], ['Drying cracks', 0.36], ['#484237', '#827968', '#605c4b'], 1.45, 0.69, 'Drying cracks separate shallow plates of damp mud. Use along the exposed stream mouth.'),
  recipe('poured-concrete', 'Poured concrete', 'Masonry', 999, ['Aggregate size', 12, 24], ['Pitting', 0.44], ['#7d817d', '#b2b5ad', '#535751'], 1.3, 0.82, 'Pinholes and exposed aggregate interrupt a troweled surface. Use on a poured ferry ramp.'),
  recipe('lime-plaster', 'Lime plaster', 'Masonry', 514, ['Trowel stroke width', 88, 10], ['Flaking', 0.33], ['#a08b70', '#dccdb2', '#eee2ca'], 1.25, 0.89, 'Overlapping trowel swaths and shallow flakes survive under chalky lime. Use on a sheltered wall.'),
  recipe('brick', 'Brick', 'Masonry', 111, ['Course height', 75, 12], ['Mortar recession', 0.49], ['#774534', '#b36b51', '#a19b86'], 2.25, 0.9, 'Staggered fired-clay courses have recessed mortar and chipped edges. Use on a chimney stack.'),
  recipe('granite', 'Granite', 'Exposed rock', 907, ['Crystal size', 8, 24], ['Crystal exposure', 0.45], ['#53565c', '#b0aaa6', '#e0d7cd'], 1.5, 0.8, 'Interlocking quartz and dark mica catch the light on a split face. Use on a headland boulder.'),
  recipe('slate', 'Slate', 'Exposed rock', 237, ['Cleavage spacing', 32, 16], ['Edge spalling', 0.32], ['#323a41', '#707c87', '#9d9a88'], 1.75, 0.78, 'Thin, angular cleavage sheets lift and split along their edges. Use on a fractured outcrop.'),
  recipe('sandstone', 'Sandstone', 'Exposed rock', 612, ['Bedding spacing', 60, 12], ['Differential erosion', 0.49], ['#916745', '#c6a17c', '#e0b890'], 1.65, 0.91, 'Grainy curved beds erode at different rates. Use on a low coastal bluff.'),
  recipe('fresh-cut-timber', 'Fresh cut', 'Timber', 672, ['Growth ring spacing', 4, 20], ['Saw marks', 0.37], ['#9f663d', '#d1a471', '#ebbd86'], 1.2, 0.68, 'Close annual rings show transverse saw marks and knot whorls. Use on a freshly cut beam.', 2.5),
  recipe('weathered-board', 'Weathered board', 'Timber', 931, ['Grain spacing', 8, 24], ['Salt bleaching', 0.59], ['#6d5241', '#9b8065', '#beb3a0'], 2.4, 0.84, 'Salt-worn timber with raised fibers and checks that open along the grain. Use on the harbor dock.', 5),
  recipe('bark', 'Bark', 'Timber', 175, ['Ridge spacing', 29, 16], ['Fissuring', 0.55], ['#453427', '#896245', '#aa8363'], 2.55, 0.97, 'Split outer bark rises in irregular plates outside deep fissures. Use around a mature pine trunk.', 2.3),
  recipe('broadleaf', 'Broadleaf', 'Foliage', 205, ['Leaf length', 105, 6], ['Edge curling', 0.31], ['#344d2b', '#749745', '#adbb65'], 1.65, 0.67, 'Overlapping blades show midribs, branching veins, and curved edges. Use on a broadleaf canopy card.'),
  recipe('needles', 'Needles', 'Foliage', 515, ['Needle length', 75, 8], ['Dry tips', 0.22], ['#2e432c', '#8fa653', '#b3a366'], 1.55, 0.82, 'Slender needles fan from branchlets with older dry tips. Use on a conifer spray.'),
  recipe('reed-blades', 'Reed blades', 'Foliage', 817, ['Blade spacing', 37, 16], ['Edge splitting', 0.35], ['#4b5c31', '#9da552', '#ccbd75'], 1.7, 0.72, 'Long folded blades show parallel ribs with split edges. Use around the marsh margin.', 2.2),
  recipe('brass', 'Brass', 'Metal', 351, ['Hammertone spacing', 14, 16], ['Tarnish', 0.32], ['#8f6832', '#d8b36d', '#6c6b47'], 1.45, 0.32, 'Shallow hammer dimples pick up uneven tarnish. Use on a worked mooring fitting.'),
  recipe('steel', 'Steel', 'Metal', 426, ['Brush spacing', 1.6, 40], ['Abrasion', 0.48], ['#7f8a91', '#c4ced2', '#e0e3dd'], 0.87, 0.34, 'Directional brushing is cut by finer cross-scratches. Use on a handrail worn by handling.', 2),
  recipe('copper', 'Copper', 'Metal', 633, ['Pit spacing', 11, 16], ['Patina', 0.51], ['#86523e', '#ca8c71', '#5b8d7a'], 1.55, 0.38, 'Pits and raised green corrosion break up the original sheet. Use on an exposed flashing or downpipe.'),
  recipe('canvas', 'Canvas', 'Cloth', 441, ['Yarn spacing', 1.6, 20], ['Fraying', 0.23], ['#887654', '#c9b98b', '#e2d1a1'], 1.85, 0.93, 'A coarse plain weave alternates over and under with loose fibers. Use on a sail repair patch.'),
  recipe('wool', 'Wool', 'Cloth', 117, ['Loop spacing', 2.8, 16], ['Pilling', 0.43], ['#5b5054', '#a39093', '#c9b4ab'], 1.6, 0.97, 'Felted loops and small raised pills give a fuzzy finish. Use on a wool blanket.'),
  recipe('workwear-twill', 'Workwear twill', 'Cloth', 387, ['Yarn spacing', 1.1, 24], ['Abrasion', 0.38], ['#3e5156', '#68848c', '#b1b8ad'], 1.85, 0.9, 'A two-over, one-under weave creates diagonal ribs that flatten under wear. Use on crew work trousers.'),
] as const

export type StandardSurfaceId = typeof standardSurfaceRecipes[number]['id']

export const surfaceRecipes = [...standardSurfaceRecipes, ...gameplaySurfaceRecipes] as const
export type SurfaceRecipe = typeof surfaceRecipes[number]

export function surfaceRecipe(id: SurfaceRecipe['id']) {
  return surfaceRecipes.find((recipe) => recipe.id === id)!
}

export interface SurfaceSettings {
  spacingMm?: number
  wear?: number
  relief?: number
  tint?: string
}

const millimetresPerMetre = 1000

export function surfaceRepeatMeters(recipe: SurfaceRecipe, settings: SurfaceSettings) {
  return (settings.spacingMm ?? recipe.spacing.mm) * recipe.spacing.cells / millimetresPerMetre
}
