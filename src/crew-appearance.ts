export const uniforms = {
  amber: { name: 'Harbor amber', color: '#ffb54d', trim: '#fff3d0', unlock: '' },
  blue: { name: 'Coastal blue', color: '#77dffc', trim: '#e4faff', unlock: '' },
  courier: { name: 'Delivery crew', color: '#488a73', trim: '#e8d397', unlock: 'Deliver all three crates' },
  rescue: { name: 'Fire crew', color: '#be4540', trim: '#ffe18a', unlock: 'Put out the lookout fire' },
  angler: { name: 'Harbor angler', color: '#537d8c', trim: '#ccead7', unlock: '' },
} as const
export const anglerCost = 3

export const skinTones = {
  light: { name: 'Light', color: '#efbb99' },
  warm: { name: 'Warm', color: '#d99c6c' },
  medium: { name: 'Medium', color: '#b57a57' },
  deep: { name: 'Deep', color: '#81503a' },
} as const

export const everydayColors = {
  amber: uniforms.amber,
  blue: uniforms.blue,
  coral: { color: '#d86565', trim: '#ffddbc' },
  lagoon: { color: '#327d78', trim: '#b5eacf' },
} as const

export const hairColors = {
  chestnut: '#4c352e', black: '#252729', blond: '#b17c41',
} as const

export const appearanceParts = {
  hair: { label: 'Hair', choices: { short: 'Swept curls', bare: 'Shaved' } },
  hairColor: { label: 'Hair color', choices: { chestnut: 'Chestnut', black: 'Black', blond: 'Honey blond' } },
  eyes: { label: 'Eyes', choices: { round: 'Round', narrow: 'Narrow' } },
  nose: { label: 'Nose', choices: { round: 'Round', small: 'Small' } },
  mouth: { label: 'Mouth', choices: { soft: 'Soft smile', wide: 'Wide smile' } },
  shirt: { label: 'Shirt or swimsuit', choices: { amber: 'Harbor amber', blue: 'Coastal blue', coral: 'Coral shirt', lagoon: 'Lagoon swimsuit' } },
  hat: { label: 'Hat', choices: { none: 'Bareheaded', amber: 'Amber cap', blue: 'Blue cap' } },
  trousers: { label: 'Trousers', choices: { slate: 'Slate blue', sand: 'Sand' } },
  shoes: { label: 'Shoes', choices: { dark: 'Dark deck shoes', brown: 'Brown deck shoes', bare: 'Bare feet' } },
} as const

type AppearancePart = keyof typeof appearanceParts
export const appearancePartKeys = Object.keys(appearanceParts) as AppearancePart[]

export type Uniform = keyof typeof uniforms | 'default'
export type CrewAppearance = {
  uniform: Uniform
  skin: keyof typeof skinTones | 'default'
} & { [Part in AppearancePart]?: keyof typeof appearanceParts[Part]['choices'] }

export const defaultAppearance: CrewAppearance = { uniform: 'default', skin: 'default' }

export function isEveryday(uniform: Uniform) {
  return uniform === 'default' || uniform === 'amber' || uniform === 'blue'
}

export function wearsSwimsuit(appearance: CrewAppearance) {
  return isEveryday(appearance.uniform) && appearance.shirt === 'lagoon'
}

export function uniformPalette(uniform: Uniform, id: number) {
  return uniforms[uniform === 'default' ? (id === 0 ? 'amber' : 'blue') : uniform]
}

export function shirtColor(appearance: CrewAppearance, id: number) {
  return isEveryday(appearance.uniform) && appearance.shirt ? everydayColors[appearance.shirt]
    : uniformPalette(appearance.uniform, id)
}

export function outfitRequirement(uniform: Uniform, mission: 'delivery' | 'fire' | 'complete', ownsAngler: boolean) {
  if (uniform === 'courier' && mission === 'delivery') return uniforms.courier.unlock
  if (uniform === 'rescue' && mission !== 'complete') return uniforms.rescue.unlock
  if (uniform === 'angler' && !ownsAngler) return 'Buy at the Seabrook clothing counter'
}

export function cleanCrewName(input: unknown) {
  if (typeof input !== 'string') return ''
  const cleaned = input.replace(/\p{White_Space}+/gu, ' ').replace(/[\p{Cc}\p{Cf}]/gu, '').replace(/ +/g, ' ').trim()
  return Array.from(cleaned).slice(0, 24).join('').trim()
}

export function readAppearance(raw: unknown): CrewAppearance {
  if (!raw || typeof raw !== 'object') return defaultAppearance
  const { uniform, skin } = raw as Partial<CrewAppearance>
  const parts = raw as Record<string, unknown>
  const choices = appearancePartKeys.flatMap<[AppearancePart, string]>(key => {
    const value = parts[key]
    return typeof value === 'string' && Object.hasOwn(appearanceParts[key].choices, value) ? [[key, value]] : []
  })
  return {
    uniform: typeof uniform === 'string' && Object.hasOwn(uniforms, uniform) ? uniform : 'default',
    skin: typeof skin === 'string' && Object.hasOwn(skinTones, skin) ? skin : 'default',
    ...Object.fromEntries(choices),
  }
}
