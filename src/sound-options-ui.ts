import type { SoundSettings } from './audio/mix'
import { readStorage, writeStorage } from './browser-storage'

const keys = { ambience: 'mission-island-ambience-volume', effects: 'mission-island-effects-volume', muted: 'mission-island-muted' }

// Ambience and effects levels plus mute. Each viewer's choice is remembered in this browser.
export function bindSoundOptions(apply: (settings: SoundSettings) => void) {
  const field = (id: string) => document.getElementById(id) as HTMLInputElement
  const ambience = field('sound-ambience'), effects = field('sound-effects'), muted = field('sound-muted')
  for (const [input, key] of [[ambience, keys.ambience], [effects, keys.effects]] as const) {
    const saved = readStorage('localStorage', key)
    if (saved !== null && Number(saved) >= Number(input.min) && Number(saved) <= Number(input.max)) input.value = saved
  }
  muted.checked = readStorage('localStorage', keys.muted) === 'true'
  const settings = (): SoundSettings => ({ ambience: Number(ambience.value), effects: Number(effects.value), muted: muted.checked })
  function save() {
    writeStorage('localStorage', keys.ambience, ambience.value)
    writeStorage('localStorage', keys.effects, effects.value)
    writeStorage('localStorage', keys.muted, String(muted.checked))
    apply(settings())
  }
  for (const input of [ambience, effects]) input.addEventListener('input', save)
  muted.addEventListener('change', save)
  return settings
}
