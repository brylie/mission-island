import { readStorage, writeStorage } from './browser-storage'

export type GraphicsChoice = 'auto' | 'high' | 'low'
const choices: readonly GraphicsChoice[] = ['auto', 'high', 'low']
const storageKey = 'mission-island-graphics'

// The Options dialog's graphics setting, remembered in this browser. Automatic is the default.
// Pass a signal to stop listening when the renderer goes away.
export function bindGraphicsOptions(apply: (choice: GraphicsChoice) => void, signal: AbortSignal) {
  const select = document.getElementById('graphics-quality') as HTMLSelectElement
  const status = document.getElementById('graphics-status') as HTMLElement
  const saved = readStorage('localStorage', storageKey)
  select.value = choices.find((choice) => choice === saved) ?? 'auto'
  const current = () => select.value as GraphicsChoice
  select.addEventListener('change', () => {
    writeStorage('localStorage', storageKey, current())
    status.textContent = ''
    apply(current())
  }, { signal })
  return {
    current,
    // Automatic says when it has lowered the detail, so the change isn't a mystery.
    lowered: () => { status.textContent = 'Automatic switched to Low for a smoother frame rate.' },
  }
}
