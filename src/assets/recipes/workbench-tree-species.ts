// Workbench study settings for the Highwood species generator.
export const treeSpeciesStudy = {
  seed: [1, 1, 99, 1],
  count: [4, 1, 6, 1],
  // Camera distance in metres where a tree swaps its near model for the far silhouette.
  tierSwitch: [100, 15, 250, 5],
  // Clear ground between neighbouring templates, in metres.
  gap: 1.2,
  // Silhouette view: black shapes against a pale sky, as a greyscale value check.
  silhouette: { shape: '#141615', sky: '#e9e5da' },
  layouts: {
    seeds: 'Several seeds',
    family: 'Several seeds, young and mature',
    growth: 'Every age, sheltered and exposed',
    tiers: 'Near beside far',
    distance: 'Tier switch by camera distance',
    lineup: 'Every species',
  },
  looks: { colour: 'Colour', greyscale: 'Greyscale', silhouette: 'Silhouette' },
} as const
