// How the roads' culverts are drawn (`src/assets/culverts.ts`). Each end of a culvert is a dressed
// stone headwall across the pipe's line, its pipe's dark mouth on the face the water meets. The
// outlet has a scatter of apron stones below it, so the water doesn't scour the bank. Lengths are
// metres. A headwall stands `clearOfRoadM` clear of the road's formation, found by walking back
// along the pipe's line up to `searchM`.
export const culvertModel = {
  headwall: { widthM: 1.5, heightM: 0.5, thicknessM: 0.3, embedM: 0.3, tone: [0.78, 0.76, 0.72] },
  pipe: { radiusM: 0.22, sides: 12, centreM: 0.26, proudM: 0.01, shade: 0.07 },
  apron: { stones: 5, sizeM: [0.22, 0.42], reachM: 1.6, spreadM: 0.9, heightShare: 0.45, sides: [5, 8], jitter: 0.3, shoulder: 0.55, tone: [0.7, 0.68, 0.64] },
  // Culvert ends closer than this share one headwall and apron.
  shareM: 1.5,
  clearOfRoadM: 0.5,
  searchStepM: 0.5,
  searchM: 12,
  repeatsPerMetre: 1.6,
  seed: 4417,
} as const
