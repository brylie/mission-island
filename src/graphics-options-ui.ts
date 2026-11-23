import { readStorage, writeStorage } from './browser-storage'

export type GraphicsChoice = 'auto' | 'high' | 'low'
const choices: readonly GraphicsChoice[] = ['auto', 'high', 'low']
const storageKey = 'mission-island-graphics'
// How long the switch notice stays on the game screen.
const hudNoticeMs = 8000
const optionsNote = 'Automatic switched to Low for a smoother frame rate. Choose High to keep full detail.'
const hudNote = 'Graphics set to Low for a smoother frame rate. Options (O) → Graphics to change.'

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
    // Automatic says when it has lowered the detail, in Options and briefly on the game
    // screen, so the softer picture isn't a mystery and a screen reader hears it.
    lowered: () => {
      status.textContent = optionsNote
      // Never cover a connection or session message on the shared notice line; the note in Options remains.
      const notice = document.getElementById('notice')
      if (!notice || !notice.hidden) return
      notice.textContent = hudNote
      notice.hidden = false
      setTimeout(() => {
        if (notice.textContent === hudNote) notice.hidden = true
      }, hudNoticeMs)
    },
  }
}
