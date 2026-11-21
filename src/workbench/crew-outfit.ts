import { isEveryday, readAppearance } from '../crew-appearance.ts'
import type { Values } from './subject'

export const crewClothingSlots: ReadonlySet<string> = new Set(['shirt', 'hat', 'trousers', 'shoes'])

export function shownCrewChoice(key: string, values: Values) {
  const appearance = readAppearance(values)
  if (!isEveryday(appearance.uniform) || (key === 'trousers' && appearance.shirt === 'lagoon')) return 'default'
  return String(values[key])
}

export function relatedCrewOptions(key: string, values: Values): Values | undefined {
  const appearance = readAppearance(values)
  if (key === 'cap' && values.cap && isEveryday(appearance.uniform)) {
    if (appearance.shirt === 'lagoon' && (!appearance.hat || appearance.hat === 'none')) {
      return { hat: appearance.uniform === 'blue' ? 'blue' : 'amber' }
    }
    if (appearance.hat === 'none') return { hat: 'default' }
  }
  if (!crewClothingSlots.has(key)) return
  const changes: Values = {}
  if (!isEveryday(appearance.uniform)) changes.uniform = 'amber'
  if (key === 'trousers' && appearance.shirt === 'lagoon') changes.shirt = 'default'
  if (key === 'hat' && appearance.hat) changes.cap = appearance.hat !== 'none'
  return changes
}
