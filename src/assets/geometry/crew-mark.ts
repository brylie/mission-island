// A crew mark is a tall column of light in the placer's crew colour over a ring on the ground,
// tall enough to pick out above trees from the Fire Watch deck, and fading as it rises.
export const crewMarkBeacon = {
  column: { height: 28, diameterBottom: 0.55, diameterTop: 0.18, segments: 16, rows: 12, opacity: 0.85, fadePower: 1.3, alphaIndex: 3 },
  ring: { diameter: 2.4, thickness: 0.16, segments: 48, lift: 0.08 },
  glowOpacity: 0.9,
  // The name and distance tag floats this far above the mark's ground.
  labelRise: 3.4,
} as const
