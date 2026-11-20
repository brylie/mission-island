export const uniforms = {
  amber: { name: 'Harbor amber', color: '#ffb54d', trim: '#fff3d0', milestone: 0, unlock: '' },
  blue: { name: 'Coastal blue', color: '#77dffc', trim: '#e4faff', milestone: 0, unlock: '' },
  courier: { name: 'Delivery crew', color: '#488a73', trim: '#e8d397', milestone: 1, unlock: 'Deliver all three crates' },
  rescue: { name: 'Fire crew', color: '#be4540', trim: '#ffe18a', milestone: 2, unlock: 'Put out the lookout fire' },
  angler: { name: 'Harbor angler', color: '#537d8c', trim: '#ccead7', milestone: 0, unlock: '' },
} as const
export const anglerCost = 3

export const skinTones = {
  light: { name: 'Light', color: '#efbb99' },
  warm: { name: 'Warm', color: '#d99c6c' },
  medium: { name: 'Medium', color: '#b57a57' },
  deep: { name: 'Deep', color: '#81503a' },
} as const

export type CrewAppearance = {
  uniform: keyof typeof uniforms | 'default'
  skin: keyof typeof skinTones | 'default'
}

export const defaultAppearance: CrewAppearance = { uniform: 'default', skin: 'default' }

export function cleanCrewName(input: unknown) {
  if (typeof input !== 'string') return ''
  const cleaned = input.replace(/\p{White_Space}+/gu, ' ').replace(/[\p{Cc}\p{Cf}]/gu, '').replace(/ +/g, ' ').trim()
  return Array.from(cleaned).slice(0, 24).join('').trim()
}

export function readAppearance(raw: unknown): CrewAppearance {
  if (!raw || typeof raw !== 'object') return defaultAppearance
  const { uniform, skin } = raw as Partial<CrewAppearance>
  return {
    uniform: typeof uniform === 'string' && Object.hasOwn(uniforms, uniform) ? uniform : 'default',
    skin: typeof skin === 'string' && Object.hasOwn(skinTones, skin) ? skin : 'default',
  }
}
