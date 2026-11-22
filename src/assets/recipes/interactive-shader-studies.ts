interface FieldFraming {
  site: string
  height: number
  radius: number
  alpha: number
  beta: number
  hour: number
  rain: number
}

export interface ShaderStudyPreset {
  name: string
  description: string
  control: string
  baseline: string
  preset: string
  value: number
  fieldDefault?: number
  field: FieldFraming
  camera: { radius: number, beta: number, alpha: number, height: number }
}

const studioCameraDefaults = { alpha: -1.3, height: 0.14 }
const dryFieldRain = 0
const shore = 'Shellglass'
const dock = 'Harbor Dock'
const wetland = 'Mirror Pool'
const fernfall = 'Fernfall'
const meadow = 'Meadow slope'
const seabrook = 'Seabrook Market'
const timber = 'Harbor Road'

export const waterShaderPresets = {
  'skiff-wake': {
    name: 'Skiff wake',
    description: 'Follow the twin crests and churning water as the skiff gains speed.',
    control: 'Skiff speed',
    baseline: 'At rest',
    preset: 'Under way',
    value: 0.82,
    fieldDefault: 0,
    field: { site: dock, height: 0.1, radius: 14, alpha: -2.33, beta: 0.76, hour: 12, rain: dryFieldRain },
    camera: { radius: 13, beta: 0.73, alpha: -2.33, height: studioCameraDefaults.height },
  },
  'wading-rings': {
    name: 'Wading ripples',
    description: 'Watch a wader send expanding concentric pulses across the shallows.',
    control: 'Stroke strength',
    baseline: 'Quiet water',
    preset: 'Brisk wade',
    value: 0.84,
    field: { site: shore, height: 0.1, radius: 6.5, alpha: -1.65, beta: 0.8, hour: 12, rain: dryFieldRain },
    camera: { radius: 6, beta: 0.78, ...studioCameraDefaults },
  },
  'seabed-caustics': {
    name: 'Seabed caustics',
    description: 'Sunlit wave lenses draw swimming bands on sand and stones beneath clear water.',
    control: 'Focused sunlight',
    baseline: 'Overcast bed',
    preset: 'Clear shallows',
    value: 0.87,
    field: { site: shore, height: 0.08, radius: 5.8, alpha: -1.6, beta: 0.71, hour: 11.5, rain: dryFieldRain },
    camera: { radius: 6, beta: 0.76, ...studioCameraDefaults },
  },
  'water-rain-rings': {
    name: 'Raindrop impacts',
    description: 'Rain makes staggered impulses that expand and disappear on the water.',
    control: 'Rain intensity',
    baseline: 'Dry surface',
    preset: 'Steady shower',
    value: 0.8,
    field: { site: wetland, height: 0.16, radius: 9, alpha: -0.48, beta: 0.84, hour: 13, rain: 0.75 },
    camera: { radius: 8, beta: 0.85, ...studioCameraDefaults },
  },
  'waterfall-shear': {
    name: 'Waterfall shear',
    description: 'Watch fast channels stretch the ribbons differently from the edges of a spill.',
    control: 'Flow rate',
    baseline: 'Still sheet',
    preset: 'Spring spill',
    value: 0.85,
    field: { site: fernfall, height: 1, radius: 12, alpha: 1.3, beta: 1.06, hour: 13, rain: dryFieldRain },
    camera: { radius: 8.8, beta: 1.03, alpha: 1.23, height: 1.45 },
  },
} satisfies Record<string, ShaderStudyPreset>

export const vegetationShaderPresets = {
  'canopy-dapple': {
    name: 'Canopy dapple',
    description: 'Small gaps in the canopy send moving, broken sunlight across the shaded forest floor.',
    control: 'Sunfleck contrast',
    baseline: 'Solid shade',
    preset: 'Broken canopy',
    value: 0.86,
    field: { site: 'Juniper Hollow', height: 0.25, radius: 8, alpha: -1.85, beta: 0.91, hour: 14, rain: dryFieldRain },
    camera: { radius: 7.3, beta: 0.9, ...studioCameraDefaults },
  },
  'reed-transmission': {
    name: 'Backlit reeds',
    description: 'Thin leaf tips transmit sunlight as you move around the clump.',
    control: 'Leaf transmission',
    baseline: 'Opaque leaf',
    preset: 'Lit through',
    value: 0.92,
    field: { site: wetland, height: 0.68, radius: 4.7, alpha: 0.24, beta: 1.33, hour: 8, rain: dryFieldRain },
    camera: { radius: 5, beta: 1.24, alpha: 0.3, height: 0.63 },
  },
  'sand-footprints': {
    name: 'Fading sand tracks',
    description: 'Boot pressure leaves a heel and toe in damp sand. Rain and time erase the trail.',
    control: 'Track persistence',
    baseline: 'Soft wash',
    preset: 'Readable tracks',
    value: 0.9,
    field: { site: 'Driftwood Beach', height: 0.12, radius: 5.5, alpha: -1.48, beta: 0.67, hour: 14, rain: dryFieldRain },
    camera: { radius: 5.8, beta: 0.68, ...studioCameraDefaults },
  },
  'ridge-lichen': {
    name: 'Rain on ridge lichen',
    description: 'Lichen on upward-facing rock darkens and takes on a deeper color as it drinks rain.',
    control: 'Lichen moisture',
    baseline: 'Dry crust',
    preset: 'Rain-fed lichen',
    value: 0.9,
    field: { site: 'Windstone Ridge', height: 0.85, radius: 5.5, alpha: -1.45, beta: 1.13, hour: 14, rain: 0.44 },
    camera: { radius: 5.45, beta: 1.04, alpha: -1.48, height: 0.94 },
  },
  'closing-flowers': {
    name: 'Flowers close at dusk',
    description: 'Petals fold around an anchored cup as daylight fades and unfold when the sun returns.',
    control: 'Bloom opening',
    baseline: 'Night cups',
    preset: 'Open meadow',
    value: 0.92,
    field: { site: meadow, height: 0.38, radius: 3.9, alpha: -1.9, beta: 1.12, hour: 15, rain: dryFieldRain },
    camera: { radius: 4.35, beta: 1.12, alpha: -1.9, height: 0.45 },
  },
} satisfies Record<string, ShaderStudyPreset>

export const surfaceShaderPresets = {
  'timber-salt-bloom': {
    name: 'Salt bloom on timber',
    description: 'Drying brine leaves a ragged white band above the waterline on harbor pilings.',
    control: 'Dry salt deposit',
    baseline: 'Freshly wetted',
    preset: 'Salt bloom',
    value: 0.9,
    field: { site: dock, height: -0.08, radius: 3.6, alpha: 2.86, beta: 1.33, hour: 12, rain: dryFieldRain },
    camera: { radius: 4.4, beta: 1.17, alpha: -1.3, height: 0.83 },
  },
  'awning-rain-load': {
    name: 'Rain-loaded canvas',
    description: 'Collected rain sags the canvas between fixed supports and darkens the pooled fabric.',
    control: 'Water load',
    baseline: 'Taut canvas',
    preset: 'After a shower',
    value: 0.89,
    field: { site: seabrook, height: 1.55, radius: 5.9, alpha: 1.42, beta: 1.07, hour: 13, rain: 0.55 },
    camera: { radius: 6.5, beta: 0.96, alpha: -1.5, height: 1.35 },
  },
  'window-parallax': {
    name: 'Inset window parallax',
    description: 'A back wall and foreground sash shift at different rates as you walk past the glass.',
    control: 'Interior depth',
    baseline: 'Flat glass',
    preset: 'Lit recess',
    value: 0.83,
    field: { site: 'Blue cottage', height: 2.074, radius: 4.4, alpha: -1.52, beta: 1.32, hour: 17.3, rain: dryFieldRain },
    camera: { radius: 4.9, beta: 1.28, alpha: -1.5, height: 1.31 },
  },
  'road-retroreflector': {
    name: 'Roadside retroreflector',
    description: 'Road studs return the flatbed headlight beam toward its source at night.',
    control: 'Headlamp output',
    baseline: 'Lamp off',
    preset: 'Dipped beam',
    value: 0.94,
    field: { site: timber, height: 0.28, radius: 5.2, alpha: -2.83, beta: 1.43, hour: 19.4, rain: dryFieldRain },
    camera: { radius: 4.7, beta: 1.4, alpha: -2.78, height: 0.18 },
  },
  'rope-fiber-sheen': {
    name: 'Rope fiber sheen',
    description: 'Twisted jute catches a long streak of sun when you look along its fibers.',
    control: 'Fiber sheen',
    baseline: 'Matte jute',
    preset: 'Combed fibers',
    value: 0.92,
    field: { site: dock, height: 0.55, radius: 4.5, alpha: -0.87, beta: 1.17, hour: 12, rain: dryFieldRain },
    camera: { radius: 4.3, beta: 1.08, alpha: -1.15, height: 0.73 },
  },
} satisfies Record<string, ShaderStudyPreset>

export const lightShaderPresets = {
  'fernfall-rainbow': {
    name: 'Fernfall rainbow',
    description: 'A spectral arc forms opposite the sun and moves relative to the spray as you orbit.',
    control: 'Sun on spray',
    baseline: 'Cloud shadow',
    preset: 'Sunlit spray',
    value: 0.91,
    field: { site: fernfall, height: 1.8, radius: 11.5, alpha: -2.17, beta: 1.06, hour: 7.5, rain: dryFieldRain },
    camera: { radius: 9.25, beta: 1.02, alpha: -2.17, height: 1.9 },
  },
  'cooling-embers': {
    name: 'Cooling ember bed',
    description: 'A red front retreats into cracks as the lookout fire is suppressed.',
    control: 'Heat in the bed',
    baseline: 'Cold ash',
    preset: 'Live embers',
    value: 0.88,
    field: { site: 'Forest Lookout', height: 0.16, radius: 5.4, alpha: -1.8, beta: 0.8, hour: 17, rain: dryFieldRain },
    camera: { radius: 5.65, beta: 0.8, ...studioCameraDefaults },
  },
  'streetlamp-droplets': {
    name: 'Streetlamp in rain',
    description: 'Droplets brighten near a lit globe and streak through its amber halo.',
    control: 'Droplets in the beam',
    baseline: 'Dry night',
    preset: 'Lamplit shower',
    value: 0.89,
    field: { site: 'Harbor Road lamps', height: 2.16, radius: 5.5, alpha: 0.17, beta: 1.36, hour: 20.2, rain: 0.65 },
    camera: { radius: 6.2, beta: 1.22, alpha: -0.8, height: 1.7 },
  },
  'meadow-pollen': {
    name: 'Pollen in a sunbeam',
    description: 'Seeded motes lift out of the grass in a coherent afternoon draft and settle toward evening.',
    control: 'Pollen density',
    baseline: 'Still clearing',
    preset: 'Afternoon drift',
    value: 0.9,
    field: { site: meadow, height: 0.8, radius: 7.5, alpha: -1.7, beta: 1.24, hour: 15.3, rain: dryFieldRain },
    camera: { radius: 7.9, beta: 1.22, alpha: -1.7, height: 0.82 },
  },
  'moon-glitter': {
    name: 'Moon glitter on water',
    description: 'Wave facets catch the moon in a narrow path that shifts as you change viewing angle.',
    control: 'Moon brightness',
    baseline: 'Moon behind cloud',
    preset: 'Clear moon',
    value: 0.93,
    field: { site: dock, height: 0.05, radius: 13.5, alpha: -1.28, beta: 1.34, hour: 22.4, rain: dryFieldRain },
    camera: { radius: 11.3, beta: 1.27, alpha: -1.28, height: 0.11 },
  },
} satisfies Record<string, ShaderStudyPreset>
