import type { ParticleRecipe } from './particle-recipes.ts'

export const wildfireParticleRecipes = {
  // A wildfire's plume, tall and dark enough to read from the Fire Watch across the island.
  'wildfire-smoke-column': {
    shape: 'smoke',
    rate: 34,
    life: [2.9, 3.3],
    spread: [1.3, 0.3, 1.3],
    // The emitter faces downwind, so forward speed leans the column with the island wind.
    velocity: [0, 11.5, 1.6],
    variation: [0.7, 1.6, 0.6],
    acceleration: [0, 0.6, 0.9],
    size: [1.8, 3],
    growth: 3,
    aspect: 1,
    color: [0.2, 0.19, 0.18],
    fadeTo: [0.75, 0.74, 0.72],
    opacity: 0.6,
    fadeIn: 0.12,
    spin: 0.35,
  },
} satisfies Record<string, ParticleRecipe>
