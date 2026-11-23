// A crew mark is a tall column of light in the placer's crew colour over a ring on the ground,
// tall enough to pick out above trees from the Fire Watch deck, and fading as it rises.
// A blended core keeps it visible against a bright sky; an additive halo makes it glow at dusk and night.
export const crewMarkBeacon = {
  height: 28,
  rows: 12,
  segments: 16,
  core: { diameterBottom: 0.36, diameterTop: 0.2, opacity: 0.8, fadePower: 0.7, alphaIndex: 3 },
  halo: { diameterBottom: 0.95, diameterTop: 0.4, opacity: 0.55, fadePower: 1.3, alphaIndex: 4 },
  ring: { diameter: 2.4, thickness: 0.16, segments: 48, lift: 0.08 },
  // The name and distance tag floats this far above the mark's ground, clear of the flames and smoke it may mark.
  labelRise: 7,
} as const
