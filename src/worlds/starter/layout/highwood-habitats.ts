// How Highwood's ground divides into habitats (docs/field-guide/highwood-habitats.md).
// Each habitat rises over a [start, full] range of one measure of the ground: soil
// water, height, slope, bare rock or wind exposure. Heights are metres above the
// island datum, slopes are rise per metre, and moisture, rock and exposure run 0 to 1.

export const highwoodHabitatIds = ['pinewood', 'edge', 'heath', 'ridge', 'wet', 'bracken', 'birch', 'shore'] as const

export const highwoodHabitatRules = {
  // Spray, sand and salt keep trees back from the sea, in metres inland from the shore.
  shore: { inland: [2, 14] },
  // Waterlogged ground by the creeks and in the valley floors, where pine can't root.
  // Drainage lines are narrow, so a bank reads the wettest ground within `bankM`.
  wet: { moisture: [0.7, 0.95], highest: [10, 18], bankM: 6 },
  // Wind exposure: height, ground facing into the prevailing wind, and a convex crest.
  exposure: { height: [24, 46], windward: [0.05, 0.45], windwardShare: 0.35, crestShare: 0.25, crestRadiusM: 12, crest: [0.4, 2.5] },
  // Bare, exposed tops: wind-bent pine, low juniper and heather among rock.
  ridge: { exposure: [0.55, 0.85], rock: [0.3, 0.7] },
  // Thin, stony, open ground below the ridge: heather and juniper.
  heath: { exposure: [0.3, 0.6], rock: [0.1, 0.45] },
  // Deep, well-drained, gentle slopes take bracken where the canopy opens.
  bracken: { slope: [0.08, 0.2], steepest: [0.35, 0.55], patch: [0.56, 0.74] },
  // Birch and aspen groves, strongest on Birch Flats and in a few scattered stands.
  birch: { patch: [0.6, 0.78], placeRadiusM: 110, placeShare: 0.8 },
  // Openings in the pinewood: windthrow gaps and clearings that become edge habitat.
  gaps: { patch: [0.6, 0.76] },
} as const

// Patch noise: broad, soft-edged blobs so stands vary without lining up. The
// wavelengths are metres; each habitat draws from its own seed.
export const highwoodHabitatNoise = {
  seed: 4417,
  bracken: { wavelength: 70, octaves: 3, lacunarity: 2, gain: 0.5 },
  birch: { wavelength: 90, octaves: 3, lacunarity: 2, gain: 0.5 },
  gaps: { wavelength: 45, octaves: 3, lacunarity: 2, gain: 0.55 },
} as const

// Slope is measured across this many metres either side of a point.
export const highwoodHabitatSlopeSpanM = 2
