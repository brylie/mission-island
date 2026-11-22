// Counts describe individual patches, props or animals in a 16 m clearing.
export const codex = [
  { key: 'clover', label: 'Clover patches', group: 'Ground cover', max: 24, note: 'Hares graze the leaves. Daylight and rain help cropped patches grow back.' },
  { key: 'grass', label: 'Tall tussocks', group: 'Ground cover', max: 24, note: 'Tall blades conceal a hare from a pursuing fox.' },
  { key: 'trees', label: 'Pines', group: 'Habitat', max: 8, note: 'A hare can wait out heavy rain under the canopy.' },
  { key: 'logs', label: 'Fallen logs', group: 'Habitat', max: 8, note: 'The hollow beside a trunk offers shelter from rain and pursuit.' },
  { key: 'stones', label: 'Boulders', group: 'Habitat', max: 10, note: 'A hare can break a fox’s line of sight at the foot of a rock.' },
  { key: 'hares', label: 'Hares', group: 'Wildlife', max: 10, note: 'Seek clover, flee nearby foxes and shelter in a downpour.' },
  { key: 'foxes', label: 'Foxes', group: 'Wildlife', max: 4, note: 'Patrol until a hare is in range. At dusk and at night they range farther for prey.' },
] as const

export const coastalCodex = [
  { key: 'foxgloves', label: 'Foxglove stems', group: 'Coastal meadow', max: 32, note: 'Seeded flower spikes grow in loose patches along the bank.' },
  { key: 'oystercatchers', label: 'Oystercatchers', group: 'Coastal meadow', max: 12, note: 'Forage together and step away from a nearby walker.' },
] as const
export const habitatCodex = [...codex, ...coastalCodex]

type Counts = Record<typeof habitatCodex[number]['key'], number>
export type BiomeRecipe = Counts & { seed: number, hour: number, rain: number, ground: 'grass' | 'soil' | 'stone' }

export const presets = {
  'Meadow edge': { seed: 42, hour: 15, rain: 0, ground: 'grass', foxgloves: 0, oystercatchers: 0, clover: 12, grass: 8, trees: 2, logs: 2, stones: 3, hares: 5, foxes: 1 },
  'Pine hollow': { seed: 73, hour: 8, rain: 75, ground: 'soil', foxgloves: 0, oystercatchers: 0, clover: 5, grass: 3, trees: 7, logs: 4, stones: 1, hares: 3, foxes: 1 },
  'Stony heath': { seed: 115, hour: 18, rain: 0, ground: 'stone', foxgloves: 0, oystercatchers: 0, clover: 4, grass: 9, trees: 0, logs: 1, stones: 9, hares: 4, foxes: 2 },
  'Coastal meadow': { seed: 86, hour: 14, rain: 0, ground: 'grass', clover: 2, grass: 6, trees: 0, logs: 0, stones: 0, hares: 0, foxes: 0, foxgloves: 12, oystercatchers: 5 },
} satisfies Record<string, BiomeRecipe>
