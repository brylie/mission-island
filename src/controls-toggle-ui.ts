import { readStorage, writeStorage } from './browser-storage'

const openKey = 'mission-island-controls-open'

// The key list folds behind a button in the lower right so it never covers the action prompt.
export function bindControlsToggle(button: HTMLButtonElement, panel: HTMLElement) {
  function show(open: boolean) {
    panel.hidden = !open
    button.setAttribute('aria-expanded', String(open))
  }
  show(readStorage('localStorage', openKey) === 'yes')
  button.addEventListener('click', () => {
    show(panel.hidden)
    writeStorage('localStorage', openKey, panel.hidden ? null : 'yes')
  })
}
