// Art decisions behind the crew dye swatches. Change these, then run
// `npm run dyes:generate`. See docs/design/color-direction.md#player-dyes.

// OKLCH lightness and target chroma for each row.
export const dyeRows = [
  { row: 'pale', lightness: 0.87, chroma: 0.08 },
  { row: 'mid', lightness: 0.66, chroma: 0.12 },
  { row: 'deep', lightness: 0.48, chroma: 0.1 },
] as const

// Eight hues 45 degrees apart. Starting at 31 degrees keeps hue pairs that
// mirror across the yellow-blue axis, which red-green color blindness merges,
// away from the swatch set.
export const dyeHues = [31, 76, 121, 166, 211, 256, 301, 346] as const

export const dyeHueNames = {
  31: 'Brick', 76: 'Ochre', 121: 'Moss', 166: 'Jade', 211: 'Tide', 256: 'Cornflower', 301: 'Heather', 346: 'Rose',
} as const

export const dyeRowNames = { pale: 'Pale', mid: 'Mid', deep: 'Deep' } as const

// Share of the sRGB chroma limit a swatch may use, so none sits at the display's edge.
export const dyeGamutMargin = 0.98

// Offered beside the rows instead of pure white and black, each trimmed with the other.
export const dyeNeutrals = {
  'off-white': { name: 'Off-white', color: '#f5efe2', trim: '#2a2e33' },
  charcoal: { name: 'Charcoal', color: '#2a2e33', trim: '#f5efe2' },
} as const
