// Everything the baked Highwood terrain depends on. The bake records a hash of
// these files, and a test fails if any changed without `npm run island:generate`.
export const bakeSources = [
  'scripts/generate-island.mjs',
  'src/math/gradient-noise.ts',
  'src/math/noise.ts',
  'src/seeded-random.ts',
  'src/terrain.ts',
  'src/worlds/starter/beach-landforms.ts',
  'src/worlds/starter/coastline.ts',
  'src/worlds/starter/generation/erosion.ts',
  'src/worlds/starter/generation/island-generator.ts',
  'src/worlds/starter/generation/protection.ts',
  'src/worlds/starter/layout/island-generation.ts',
  'src/worlds/starter/layout/terrain.ts',
] as const
