// The generated island's shaded-relief preview (docs/images/highwood-generated.png):
// colours as RGB bytes, light direction and the PNG format's fixed numbers.
export const islandPreview = {
  palette: {
    deep: [34, 78, 104],
    shallow: [86, 160, 170],
    sand: [222, 205, 160],
    low: [110, 140, 82],
    mid: [128, 124, 80],
    high: [150, 140, 128],
    rock: [128, 126, 124],
  },
  light: { x: -0.6, z: 0.6, y: 0.55 },
  highMetres: 40,
  depthMetres: 4.3,
  shadeFloor: 0.35,
  shadeGain: 1.4,
} as const

export const pngFormat = {
  signature: [137, 80, 78, 71, 13, 10, 26, 10],
  crcPolynomial: 0xedb88320,
  headerBytes: 13,
  bitDepth: 8,
  truecolour: 2,
  channels: 3,
  // Chunk layout: 4 length bytes, 4 type bytes, data, then 4 CRC bytes.
  lengthBytes: 4,
  typeBytes: 4,
  crcBytes: 4,
  heightOffset: 4,
  bitDepthOffset: 8,
  colourTypeOffset: 9,
} as const

// How the baked heightmap module is encoded.
export const heightmapEncoding = {
  u16Max: 65535,
  bytesPerSample: 2,
  byteRange: 256,
  layerCentre: 128,
  seaMarginM: 60,
  reachAngles: 720,
  reachStepM: 0.5,
  reachLimitM: 950,
  reachUnitM: 0.1,
} as const
