// Parameters for the Highwood generator. Each layer follows an era in
// docs/design/island-story.md; the method is docs/design/island-generation.md.
// Distances are metres, heights are metres on the island's datum, and bearings
// are the original coast's angles in degrees, counterclockwise from east.

// Named places the generator pins or carves. The Fire Watch moves to Cairn Summit later.
export const highwoodPlaces = {
  // The summit pin's centre, and the crown the bake raises there (the pin is warped with the land).
  cairnSummit: { x: -95, z: 215 },
  cairnCrown: { x: -92, z: 219 },
  fallowRidge: { x: -220, z: 380 },
  bracken: { x: -175, z: 285 },
  birchFlats: { x: -420, z: 300 },
  pineDraw: { x: -225, z: 445 },
  creekHead: { x: -255, z: 345 },
  westCove: { x: -350, z: 255 },
} as const

// Region names shown on the island view and the map, at a point in each.
export const highwoodLabels = [
  { name: 'Highwood', at: { x: -250, z: 300 } },
  { name: 'Cairn Summit', at: highwoodPlaces.cairnCrown },
  { name: 'Fallow Ridge', at: highwoodPlaces.fallowRidge },
  { name: 'Pine Draw', at: highwoodPlaces.pineDraw },
] as const

export const highwoodGeneration = {
  seed: 9137,
  // The baked grid. Everything outside it is open sea.
  grid: { west: -580, south: -40, cell: 1, columns: 720, rows: 740 },
  // The baked asset keeps every `storeStep`th node, and its layers every
  // `layerStep`th stored node, to stay under the repository's 500 KB file limit.
  storeStep: 2,
  layerStep: 2,
  seaLevel: -0.115,
  seabed: -4.3,
  // Underwater, the generated field falls this many metres per metre below zero.
  shelf: 0.55,
  // Where the new land may replace the old shore: the original island's north-west,
  // between Windstone's seaward flank and the old west shoulder. Inside `innerRadius` of the
  // old coast the authored island is kept exactly.
  // `landFade` is how many degrees inside the sector the land's likelihood fades
  // in, so the noise, not the sector's edge, draws the coast there.
  join: { fromBearing: 86, toBearing: 165, fade: 5, landFade: 18, innerRadius: 0.865, outerRadius: 1.0 },

  // Era 1: the granite and sandstone block. Each mass is a soft likelihood of
  // land, from 1 at its centre to 0 at its rim; `weight` scales it. Land stands
  // where the combined influence beats `threshold`, shifted by the fractal noise,
  // so the noise, not these ellipses, draws the coast.
  masses: [
    { x: -235, z: 365, rx: 330, rz: 330, weight: 1 },
    { x: -150, z: 540, rx: 190, rz: 150, weight: 0.85 },
    { x: -410, z: 320, rx: 160, rz: 230, weight: 0.85 },
    { x: -100, z: 190, rx: 160, rz: 150, weight: 0.95 },
    // Highwood's southern flank wraps the old island's north-west shore.
    { x: -170, z: 115, rx: 160, rz: 120, weight: 0.8 },
  ],
  continent: { relief: 34, threshold: 0.4 },
  warp: { wavelength: 360, amplitude: 70, octaves: 3, lacunarity: 2, gain: 0.5 },
  // Broad fractal shape: big bays and headlands.
  detail: { wavelength: 300, octaves: 3, lacunarity: 2, gain: 0.6, amplitude: 11 },
  // Fine fractal roughness. A gain near 0.7 roughens the coastline toward a
  // fractal dimension above 1.1; it is strongest within `coastBand` metres of
  // sea level and on hard rock, so the interior stays walkable.
  roughness: { wavelength: 37, octaves: 5, lacunarity: 2, gain: 0.6, amplitude: 3.6, coastBand: 5, interior: 0.25 },
  // The grid's outer margin is always open sea, sinking by up to `edgeSink` metres.
  edgeMargin: 80,
  edgeSink: 30,

  // Hard granite cores that the ice could not wear down: ridged crests, rock
  // bands and the summit. Strength fades over each core's radius.
  uplift: {
    cores: [
      // Cairn Summit's granite runs north-east to south-west, so it weathers into a ridge, not a cone.
      { from: { x: -128, z: 196 }, to: { x: -72, z: 238 }, radius: 58, strength: 1 },
      { from: { x: -320, z: 330 }, to: { x: -120, z: 415 }, radius: 70, strength: 0.9 },
      { from: { x: -215, z: 540 }, to: { x: -110, z: 480 }, radius: 55, strength: 0.6 },
      { from: { x: -430, z: 520 }, to: { x: -380, z: 500 }, radius: 60, strength: 0.6 },
    ],
    ridged: { wavelength: 210, octaves: 6, lacunarity: 2.1, gain: 0.6 },
    height: 22,
  },
  // Cairn Summit's crown is pinned so the Fire Watch sees over Fallow Ridge. The
  // crag is lopsided: a steep face toward Fallow Ridge (`faceRadius`), a long
  // shoulder the other way (`shoulderRadius`), and `radius` across. `plateau` is
  // the share of the crag that stays near the top. `shield` is how much of the
  // crown erosion leaves alone.
  pins: [{ ...highwoodPlaces.cairnSummit, height: 50, toward: highwoodPlaces.fallowRidge, faceRadius: 16, shoulderRadius: 80, radius: 30, plateau: 0.25, shield: 0.15 }],

  // Era 2: glaciers carved broad U-shaped valleys toward the sea. Each valley has
  // a flat floor of `floorWidth` and walls rising over `wallWidth`.
  valleys: [
    // Alder Creek, from Fallow Ridge's west flank to the west cove.
    {
      points: [highwoodPlaces.creekHead, { x: -290, z: 318 }, { x: -325, z: 285 }, highwoodPlaces.westCove],
      floorWidth: 16,
      wallWidth: 46,
      depth: 16,
    },
    // Pine Draw, between Fallow Ridge and the northern strait.
    {
      points: [{ x: -140, z: 440 }, highwoodPlaces.pineDraw, { x: -305, z: 438 }],
      floorWidth: 20,
      wallWidth: 50,
      depth: 13,
    },
  ],

  // Rain carves the drainage and drops sediment into fans and flats.
  erosion: {
    droplets: 320000,
    lifetime: 70,
    inertia: 0.15,
    capacity: 4,
    minimumCapacity: 0.01,
    erosion: 0.12,
    deposition: 0.2,
    evaporation: 0.011,
    gravity: 4,
    radius: 3,
    floor: 0.5,
    maxSpeed: 6,
    deltaShare: 0.25,
  },
  // Frost: steepest stable rise per metre on soft ground and on granite.
  // Soft ground rests near a 35° scree slope; granite holds cliffs.
  // Granite weathers in layers `strataMetres` thick, so hard ground breaks into
  // benches and rock bands rather than even slopes.
  thermal: { iterations: 36, rate: 0.5, softTalus: 0.7, hardTalus: 2.4, strataMetres: 6, strataContrast: 0.5 },

  // Era 4: waves cut exposed headlands and leave sand in sheltered bays.
  // Exposure is compared with the shore within `compareRadius`: a cell that stands
  // out by `headlandAbove` is a headland, one that falls short by `bayBelow` a bay.
  coast: { rays: 16, reach: 150, reachInland: 14, compareRadius: 70, headlandAbove: 0.07, bayBelow: 0.015, hardRock: 0.45, cliffSlope: 0.9, beachRise: 1.5, beachFlatten: 0.55, rockReach: 7 },
  // The spill slope outlasts the asset's height rounding, so the baked grid drains too.
  drainage: { spill: 0.002, wetFlow: 400 },
  // How the generated island is measured: box sizes in cells for the coastline's
  // fractal dimension, slope bands as rise per metre, and what counts as steep.
  metrics: { boxSizes: [8, 16, 32, 64], slopeBands: [0.15, 0.3, 0.6, 1], steepRise: 0.6 },
} as const
