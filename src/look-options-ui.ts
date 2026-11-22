import { readStorage, writeStorage } from './browser-storage'

export interface LookSettings { invertHorizontal: boolean, invertVertical: boolean, speed: number }
// New keys: the old invert settings were stored with their labels reversed.
const keys = { invertHorizontal: 'mission-island-look-invert-x', invertVertical: 'mission-island-look-invert-y', speed: 'mission-island-look-speed' }

// Mouse look starts uninverted at a moderate speed. Each viewer's choice is remembered in this browser.
export function bindLookOptions(apply: (settings: LookSettings) => void) {
  const field = (id: string) => document.getElementById(id) as HTMLInputElement
  const horizontal = field('invert-horizontal'), vertical = field('invert-vertical'), speed = field('look-speed')
  horizontal.checked = readStorage('localStorage', keys.invertHorizontal) === 'true'
  vertical.checked = readStorage('localStorage', keys.invertVertical) === 'true'
  const saved = Number(readStorage('localStorage', keys.speed))
  if (saved >= Number(speed.min) && saved <= Number(speed.max)) speed.value = String(saved)
  const settings = (): LookSettings => ({ invertHorizontal: horizontal.checked, invertVertical: vertical.checked, speed: Number(speed.value) })
  function save() {
    writeStorage('localStorage', keys.invertHorizontal, String(horizontal.checked))
    writeStorage('localStorage', keys.invertVertical, String(vertical.checked))
    writeStorage('localStorage', keys.speed, speed.value)
    apply(settings())
  }
  for (const input of [horizontal, vertical]) input.addEventListener('change', save)
  speed.addEventListener('input', save)
  return settings
}
