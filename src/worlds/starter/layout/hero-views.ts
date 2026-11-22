// Highwood's five hero views (docs/backcountry.md#hero-views). Each phase is
// captured from the same eye, target, hour and weather, so captures compare like
// for like. Heights are metres above the ground under each point. Views of
// places that are not built yet (the fire road, the ford) use their planned
// ground until those land.
export const highwoodHeroViews = [
  {
    id: 'hero-tower-north',
    label: 'Hero · Cairn Summit looking north at dawn',
    feeling: 'Vastness: layered, fading ridges',
    // Aimed over Fallow Ridge's crest, behind which Pine Draw hides its smoke.
    eye: { x: -95, z: 224, above: 10 },
    target: { x: -215, z: 385, above: 12 },
    hour: 6.4,
    rain: 0,
  },
  {
    id: 'hero-fire-road',
    label: 'Hero · Into the forest at midday',
    feeling: 'The threshold from open meadow into tall trunks',
    eye: { x: -128, z: 252, above: 1.7 },
    target: { x: -160, z: 290, above: 4 },
    hour: 12,
    rain: 0,
  },
  {
    id: 'hero-creek-ford',
    label: 'Hero · Alder Creek after rain',
    feeling: 'Intimacy: wet stones, moss, alder roots',
    eye: { x: -300, z: 312, above: 2.6 },
    target: { x: -328, z: 284, above: 1.4 },
    hour: 11,
    rain: 0.2,
  },
  {
    id: 'hero-birch-flats',
    label: 'Hero · Birch Flats in evening sun',
    feeling: 'Beauty: pale trunks glowing amber, long shadows',
    // From the crown of the bench, looking down its western slope to the sea.
    eye: { x: -402, z: 291, above: 1.8 },
    target: { x: -436, z: 318, above: 3 },
    hour: 17.4,
    rain: 0,
  },
  {
    id: 'hero-ridge-south',
    label: 'Hero · Fallow Ridge looking home',
    feeling: 'Belonging: harbor, Seabrook and the farm small in the distance',
    // The crest point with a clear line past Cairn Summit to the harbor.
    eye: { x: -210, z: 390, above: 2 },
    target: { x: -35, z: -5, above: 2 },
    hour: 16.5,
    rain: 0,
  },
] as const
