import { falls, meadowHill, pool, streamX, tidePool } from '../terrain.ts'
import { juniperCenter } from '../juniper-habitat.ts'
import { market } from '../farm.ts'
import { harborDock, harborDockPiles, lookout } from '../world.ts'
import { lampPosts, ridgeLichenSite } from '../worlds/starter/sites.ts'
import type { Point } from '../world.ts'

export const shaderGroups = ['Water and shore', 'Vegetation and terrain', 'Built surfaces', 'Weather and light'] as const
type ShaderGroup = typeof shaderGroups[number]

interface FieldView {
  site: string
  point: Point
  height: number
  radius: number
  alpha: number
  beta: number
  hour: number
  rain: number
}

interface Study {
  name: string
  description: string
  control: string
  baseline: string
  preset: string
  value: number
  fieldDefault?: number
  field: FieldView
  camera: { radius: number, beta: number, alpha: number, height: number }
}

const view = (site: string, x: number, z: number, height: number, radius: number, alpha: number, beta: number, hour: number, rain = 0): FieldView => ({ site, point: { x, z }, height, radius, alpha, beta, hour, rain })
const camera = (radius: number, beta: number, alpha = -1.3, height = 0.14) => ({ radius, beta, alpha, height })
const shore = 'Shellglass'
const dock = 'Harbor Dock'
const wetland = 'Mirror Pool'
const fernfall = 'Fernfall'
const meadow = 'Meadow slope'
const seabrook = 'Seabrook Market'
const timber = 'Harbor Road'

export const saltBloomPile = harborDockPiles.find((pile) => pile.x === harborDock.x - 1.6 && pile.z === -34)!

const water = {
  'skiff-wake': {
    name: 'Skiff wake',
    description: 'Follow the twin crests and churning water as the skiff gains speed.',
    control: 'Skiff speed',
    baseline: 'At rest',
    preset: 'Under way',
    value: 0.82,
    fieldDefault: 0,
    field: view(dock, -48, -41, 0.1, 14, -2.33, 0.76, 12),
    camera: camera(13, 0.73, -2.33),
  },
  'wading-rings': {
    name: 'Wading ripples',
    description: 'Watch a wader send expanding concentric pulses across the shallows.',
    control: 'Stroke strength',
    baseline: 'Quiet water',
    preset: 'Brisk wade',
    value: 0.84,
    field: view(shore, 46.2, -33.05, 0.1, 6.5, -1.65, 0.8, 12),
    camera: camera(6, 0.78),
  },
  'seabed-caustics': {
    name: 'Seabed caustics',
    description: 'Sunlit wave lenses draw swimming bands on sand and stones beneath clear water.',
    control: 'Focused sunlight',
    baseline: 'Overcast bed',
    preset: 'Clear shallows',
    value: 0.87,
    field: view(shore, tidePool.x + 0.2, tidePool.z - 0.6, 0.08, 5.8, -1.6, 0.71, 11.5),
    camera: camera(6, 0.76),
  },
  'water-rain-rings': {
    name: 'Raindrop impacts',
    description: 'Rain makes staggered impulses that expand and disappear on the water.',
    control: 'Rain intensity',
    baseline: 'Dry surface',
    preset: 'Steady shower',
    value: 0.8,
    field: view(wetland, pool.x - 2, pool.z, 0.16, 9, -0.48, 0.84, 13, 0.75),
    camera: camera(8, 0.85),
  },
  'waterfall-shear': {
    name: 'Waterfall shear',
    description: 'Watch fast channels stretch the ribbons differently from the edges of a spill.',
    control: 'Flow rate',
    baseline: 'Still sheet',
    preset: 'Spring spill',
    value: 0.85,
    field: view(fernfall, streamX(87), 86.6, 1, 12, 1.3, 1.06, 13),
    camera: camera(8.8, 1.03, 1.23, 1.45),
  },
} satisfies Record<string, Study>

const vegetation = {
  'canopy-dapple': {
    name: 'Canopy dapple',
    description: 'Small gaps in the canopy send moving, broken sunlight across the shaded forest floor.',
    control: 'Sunfleck contrast',
    baseline: 'Solid shade',
    preset: 'Broken canopy',
    value: 0.86,
    field: view('Juniper Hollow', juniperCenter.x + 2, juniperCenter.z - 3, 0.25, 8, -1.85, 0.91, 14),
    camera: camera(7.3, 0.9),
  },
  'reed-transmission': {
    name: 'Backlit reeds',
    description: 'Thin leaf tips transmit sunlight as you move around the clump.',
    control: 'Leaf transmission',
    baseline: 'Opaque leaf',
    preset: 'Lit through',
    value: 0.92,
    field: view(wetland, pool.x - 13, pool.z - 3, 0.68, 4.7, 0.24, 1.33, 8),
    camera: camera(5, 1.24, 0.3, 0.63),
  },
  'sand-footprints': {
    name: 'Fading sand tracks',
    description: 'Boot pressure leaves a heel and toe in damp sand. Rain and time erase the trail.',
    control: 'Track persistence',
    baseline: 'Soft wash',
    preset: 'Readable tracks',
    value: 0.9,
    field: view('Driftwood Beach', 36.7, -36.8, 0.12, 5.5, -1.48, 0.67, 14),
    camera: camera(5.8, 0.68),
  },
  'ridge-lichen': {
    name: 'Rain on ridge lichen',
    description: 'Lichen on upward-facing rock darkens and takes on a deeper color as it drinks rain.',
    control: 'Lichen moisture',
    baseline: 'Dry crust',
    preset: 'Rain-fed lichen',
    value: 0.9,
    field: view('Windstone Ridge', ridgeLichenSite.x, ridgeLichenSite.z, 0.85, 5.5, -1.45, 1.13, 14, 0.44),
    camera: camera(5.45, 1.04, -1.48, 0.94),
  },
  'closing-flowers': {
    name: 'Flowers close at dusk',
    description: 'Petals fold around an anchored cup as daylight fades and unfold when the sun returns.',
    control: 'Bloom opening',
    baseline: 'Night cups',
    preset: 'Open meadow',
    value: 0.92,
    field: view(meadow, meadowHill.x - 2.2, meadowHill.z - 1, 0.38, 3.9, -1.9, 1.12, 15),
    camera: camera(4.35, 1.12, -1.9, 0.45),
  },
} satisfies Record<string, Study>

const surfaces = {
  'timber-salt-bloom': {
    name: 'Salt bloom on timber',
    description: 'Drying brine leaves a ragged white band above the waterline on harbor pilings.',
    control: 'Dry salt deposit',
    baseline: 'Freshly wetted',
    preset: 'Salt bloom',
    value: 0.9,
    field: view(dock, saltBloomPile.x, saltBloomPile.z, -0.08, 3.6, 2.86, 1.33, 12),
    camera: camera(4.4, 1.17, -1.3, 0.83),
  },
  'awning-rain-load': {
    name: 'Rain-loaded canvas',
    description: 'Collected rain sags the canvas between fixed supports and darkens the pooled fabric.',
    control: 'Water load',
    baseline: 'Taut canvas',
    preset: 'After a shower',
    value: 0.89,
    field: view(seabrook, market.x - 3.9, market.z + 1.1, 1.55, 5.9, 1.42, 1.07, 13, 0.55),
    camera: camera(6.5, 0.96, -1.5, 1.35),
  },
  'window-parallax': {
    name: 'Inset window parallax',
    description: 'A back wall and foreground sash shift at different rates as you walk past the glass.',
    control: 'Interior depth',
    baseline: 'Flat glass',
    preset: 'Lit recess',
    value: 0.83,
    field: view('Blue cottage', -43.605, -6.765, 2.074, 4.4, -1.52, 1.32, 17.3),
    camera: camera(4.9, 1.28, -1.5, 1.31),
  },
  'road-retroreflector': {
    name: 'Roadside retroreflector',
    description: 'Road studs return the flatbed headlight beam toward its source at night.',
    control: 'Headlamp output',
    baseline: 'Lamp off',
    preset: 'Dipped beam',
    value: 0.94,
    field: view(timber, -33.5, -11, 0.28, 5.2, -2.83, 1.43, 19.4),
    camera: camera(4.7, 1.4, -2.78, 0.18),
  },
  'rope-fiber-sheen': {
    name: 'Rope fiber sheen',
    description: 'Twisted jute catches a long streak of sun when you look along its fibers.',
    control: 'Fiber sheen',
    baseline: 'Matte jute',
    preset: 'Combed fibers',
    value: 0.92,
    field: view(dock, harborDock.x + 1.12, -32.45, 0.55, 4.5, -0.87, 1.17, 12),
    camera: camera(4.3, 1.08, -1.15, 0.73),
  },
} satisfies Record<string, Study>

const light = {
  'fernfall-rainbow': {
    name: 'Fernfall rainbow',
    description: 'A spectral arc forms opposite the sun and moves relative to the spray as you orbit.',
    control: 'Sun on spray',
    baseline: 'Cloud shadow',
    preset: 'Sunlit spray',
    value: 0.91,
    field: view(fernfall, falls.x + 2, 89.3, 1.8, 11.5, -2.17, 1.06, 7.5),
    camera: camera(9.25, 1.02, -2.17, 1.9),
  },
  'cooling-embers': {
    name: 'Cooling ember bed',
    description: 'A red front retreats into cracks as the lookout fire is suppressed.',
    control: 'Heat in the bed',
    baseline: 'Cold ash',
    preset: 'Live embers',
    value: 0.88,
    field: view('Forest Lookout', lookout.x + 0.4, lookout.z + 0.2, 0.16, 5.4, -1.8, 0.8, 17),
    camera: camera(5.65, 0.8),
  },
  'streetlamp-droplets': {
    name: 'Streetlamp in rain',
    description: 'Droplets brighten near a lit globe and streak through its amber halo.',
    control: 'Droplets in the beam',
    baseline: 'Dry night',
    preset: 'Lamplit shower',
    value: 0.89,
    field: view('Harbor Road lamps', lampPosts[0].x, lampPosts[0].z - 0.31, 2.16, 5.5, 0.17, 1.36, 20.2, 0.65),
    camera: camera(6.2, 1.22, -0.8, 1.7),
  },
  'meadow-pollen': {
    name: 'Pollen in a sunbeam',
    description: 'Seeded motes lift out of the grass in a coherent afternoon draft and settle toward evening.',
    control: 'Pollen density',
    baseline: 'Still clearing',
    preset: 'Afternoon drift',
    value: 0.9,
    field: view(meadow, meadowHill.x - 0.4, meadowHill.z + 1.6, 0.8, 7.5, -1.7, 1.24, 15.3),
    camera: camera(7.9, 1.22, -1.7, 0.82),
  },
  'moon-glitter': {
    name: 'Moon glitter on water',
    description: 'Wave facets catch the moon in a narrow path that shifts as you change viewing angle.',
    control: 'Moon brightness',
    baseline: 'Moon behind cloud',
    preset: 'Clear moon',
    value: 0.93,
    field: view(dock, -44, -45, 0.05, 13.5, -1.28, 1.34, 22.4),
    camera: camera(11.3, 1.27, -1.28, 0.11),
  },
} satisfies Record<string, Study>

const families = [
  { group: shaderGroups[0], source: 'water', entries: water },
  { group: shaderGroups[1], source: 'vegetation', entries: vegetation },
  { group: shaderGroups[2], source: 'surfaces', entries: surfaces },
  { group: shaderGroups[3], source: 'light', entries: light },
] as const

export type StudyId = keyof typeof water | keyof typeof vegetation | keyof typeof surfaces | keyof typeof light

interface StudyEntry extends Study {
  id: StudyId
  group: ShaderGroup
  source: string
}

export const interactiveStudies: readonly StudyEntry[] = families.flatMap(({ group, source, entries }) =>
  Object.entries(entries).map(([id, study]) => ({ ...study, id: id as StudyId, group, source: 'src/interactive-shaders/' + source + '.ts' })))
