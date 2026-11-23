// A crew mark is a tall column of light in the placer's crew colour over a ring on the ground,
// tall enough to pick out above trees from the Fire Watch deck, and fading as it rises.
// A blended core keeps it visible against a bright sky; an additive halo makes it glow at dusk and night.
export const crewMarkBeacon = {
  height: 28,
  rows: 12,
  segments: 16,
  // The core is shaded down from the crew colour, so the halo over it brightens toward the hue instead of white.
  core: { diameterBottom: 0.36, diameterTop: 0.2, opacity: 0.8, fadePower: 0.7, alphaIndex: 3, shade: 0.7 },
  halo: { diameterBottom: 0.95, diameterTop: 0.4, opacity: 0.4, fadePower: 1.3, alphaIndex: 4, shade: 1 },
  // Lifted clear of sloping ground, so the whole ring shows.
  ring: { diameter: 2.4, thickness: 0.16, segments: 48, lift: 0.25 },
  // The name and distance tag floats this far above the mark's ground, clear of the flames and smoke it may mark.
  labelRise: 7,
} as const
