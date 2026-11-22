import { readStorage, writeStorage } from '../browser-storage'
import { landscapeShotLink, readLandscapeShot } from './landscape-shot'
import type { LandscapeShot } from './landscape-shot'

const shotsKey = 'mission-island-landscape-shots'
const referenceMaxPixels = 1600
const jpegFallbackQuality = 0.97
const referenceKey = 'mission-island-landscape-reference'

interface Reference {
  shot: LandscapeShot
  image: string
}

interface StudyControls {
  frame(): Omit<LandscapeShot, 'version' | 'name'> | undefined
  restore(shot: LandscapeShot, framingOnly?: boolean): void
  pause(): void
}

function loadShots() {
  try {
    const value: unknown = JSON.parse(readStorage('localStorage', shotsKey) ?? '[]')
    const shots = Array.isArray(value) ? value.map(readLandscapeShot) : []
    return shots.filter((shot): shot is LandscapeShot => Boolean(shot))
  }
  catch {
    return []
  }
}

function loadReference(): Reference | undefined {
  try {
    const value = JSON.parse(readStorage('sessionStorage', referenceKey) ?? 'null') as Partial<Reference> | null
    const shot = readLandscapeShot(value?.shot)
    const image = value?.image
    if (shot && typeof image === 'string' && /^data:image\/(png|jpeg);base64,/.test(image)) return { shot, image }
  }
  catch {
    return undefined
  }
}

export function createLandscapeStudies(canvas: HTMLCanvasElement, controls: StudyControls) {
  const panel = document.getElementById('landscape-studies')!
  const details = document.querySelector<HTMLDetailsElement>('#landscape-study-details')!
  const form = document.querySelector<HTMLFormElement>('#landscape-shot-form')!
  const name = document.querySelector<HTMLInputElement>('#landscape-shot-name')!
  const save = document.querySelector<HTMLButtonElement>('#landscape-shot-save')!
  const library = document.getElementById('landscape-saved-shots')!
  const selected = document.querySelector<HTMLSelectElement>('#landscape-shots')!
  const open = document.querySelector<HTMLButtonElement>('#landscape-shot-open')!
  const share = document.querySelector<HTMLButtonElement>('#landscape-shot-link')!
  const remove = document.querySelector<HTMLButtonElement>('#landscape-shot-remove')!
  const link = document.querySelector<HTMLInputElement>('#landscape-shot-url')!
  const undo = document.querySelector<HTMLButtonElement>('#landscape-shot-undo')!
  const capture = document.querySelector<HTMLButtonElement>('#landscape-capture-reference')!
  const compare = document.querySelector<HTMLButtonElement>('#landscape-compare-reference')!
  const overlay = document.getElementById('landscape-comparison')!
  const image = document.querySelector<HTMLImageElement>('#landscape-reference-image')!
  const split = document.querySelector<HTMLInputElement>('#landscape-reference-split')!
  const status = document.getElementById('landscape-study-status')!
  const abort = new AbortController()
  const events = { signal: abort.signal }
  let shots = loadShots()
  let removed: LandscapeShot | undefined
  let reference = loadReference()
  let available = false
  let captureRequested = false

  const getSelected = () => shots.find((shot) => shot.name === selected.value)
  const report = (message: string) => {
    status.textContent = message
  }
  const refreshSaveLabel = () => {
    save.textContent = name.value.trim() === selected.value && selected.value ? 'Update shot' : 'Save shot'
  }
  if (reference) image.src = reference.image

  function refresh(preferred = selected.value) {
    selected.replaceChildren(...shots.map(({ name }) => new Option(name, name)))
    if (shots.some((shot) => shot.name === preferred)) selected.value = preferred
    library.hidden = shots.length === 0
    link.hidden = true
    undo.hidden = !removed
    save.disabled = open.disabled = capture.disabled = !available
    compare.disabled = !available || !reference
    refreshSaveLabel()
  }

  function persist(next: LandscapeShot[], preferred: string) {
    if (!writeStorage('localStorage', shotsKey, JSON.stringify(next))) {
      report('Browser storage is unavailable. The saved shots were kept.')
      return false
    }
    shots = next
    refresh(preferred)
    return true
  }

  function showComparison(show: boolean) {
    overlay.hidden = !show
    compare.setAttribute('aria-pressed', String(show))
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const frame = controls.frame()
    const title = name.value.trim()
    if (!frame || !title) return
    const saved = loadShots()
    const shot: LandscapeShot = { version: 1, name: title, ...frame }
    const previous = saved.findIndex((item) => item.name === title)
    if (previous >= 0 && selected.value !== title) {
      report('Choose the saved shot to update it, or use a different name.')
      return
    }
    if (previous >= 0) saved[previous] = shot
    else saved.push(shot)
    if (persist(saved, title)) {
      name.value = title
      refreshSaveLabel()
      report(previous >= 0 ? `Updated ${title}.` : `Saved ${title}.`)
    }
  }, events)
  name.addEventListener('input', refreshSaveLabel, events)
  selected.addEventListener('change', () => {
    name.value = selected.value
    link.hidden = true
    refreshSaveLabel()
  }, events)
  function openShot(shot: LandscapeShot) {
    showComparison(false)
    controls.restore(shot)
    selected.value = shot.name
    name.value = shot.name
    refreshSaveLabel()
    report(`Opened ${shot.name}.`)
  }
  open.addEventListener('click', () => {
    const shot = getSelected()
    if (shot) openShot(shot)
  }, events)
  share.addEventListener('click', () => {
    const shot = getSelected()
    if (!shot) return
    void (async () => {
      const url = landscapeShotLink(location.href, shot)
      try {
        await navigator.clipboard.writeText(url)
        report('Shot link copied.')
      }
      catch {
        link.value = url
        link.hidden = false
        link.select()
        report('Copy the selected shot link.')
      }
    })()
  }, events)
  remove.addEventListener('click', () => {
    const shot = getSelected()
    if (!shot || !persist(loadShots().filter((item) => item.name !== shot.name), '')) return
    removed = shot
    undo.hidden = false
    name.value = ''
    refreshSaveLabel()
    report(`Removed ${shot.name}.`)
  }, events)
  undo.addEventListener('click', () => {
    if (!removed) return
    const saved = loadShots()
    if (saved.some((shot) => shot.name === removed?.name)) {
      report('A shot already uses that name.')
      return
    }
    if (persist([...saved, removed], removed.name)) {
      name.value = removed.name
      report(`Restored ${removed.name}.`)
      removed = undefined
      undo.hidden = true
      refreshSaveLabel()
    }
  }, events)
  window.addEventListener('storage', (event) => {
    if (event.key !== shotsKey) return
    shots = loadShots()
    refresh()
  }, events)

  capture.addEventListener('click', () => {
    controls.pause()
    captureRequested = true
    capture.disabled = true
  }, events)
  compare.addEventListener('click', () => {
    if (!reference) return
    const show = overlay.hidden
    if (show) controls.restore(reference.shot, true)
    showComparison(show)
  }, events)
  split.addEventListener('input', () => {
    overlay.style.setProperty('--reference-split', split.value + '%')
  }, events)

  return {
    shots: () => shots,
    openShot,
    hideComparison: () => showComparison(false),
    setScene(landscape: boolean, ready: boolean) {
      panel.hidden = !landscape
      available = landscape && ready
      if (!available) {
        captureRequested = false
        showComparison(false)
      }
      refresh()
    },
    showStatus(message: string) {
      details.open = true
      report(message)
    },
    afterDraw() {
      if (!captureRequested) return
      captureRequested = false
      capture.disabled = false
      const frame = controls.frame()
      if (!frame || !canvas.width || !canvas.height) return
      try {
        // Read the drawing buffer in the same frame that rendered it.
        const copy = document.createElement('canvas')
        const scale = Math.min(1, referenceMaxPixels / Math.max(canvas.width, canvas.height))
        copy.width = Math.max(1, Math.round(canvas.width * scale))
        copy.height = Math.max(1, Math.round(canvas.height * scale))
        const context = copy.getContext('2d')
        if (!context) throw new Error('Could not copy the preview.')
        context.drawImage(canvas, 0, 0, copy.width, copy.height)
        const shot: LandscapeShot = { version: 1, name: 'Reference', ...frame }
        reference = { shot, image: copy.toDataURL() }
        let stored = writeStorage('sessionStorage', referenceKey, JSON.stringify(reference))
        if (!stored) {
          reference.image = copy.toDataURL('image/jpeg', jpegFallbackQuality)
          stored = writeStorage('sessionStorage', referenceKey, JSON.stringify(reference))
        }
        image.src = reference.image
        compare.disabled = false
        showComparison(true)
        report(stored
          ? 'Reference captured. Adjust the live view to compare.'
          : 'Reference captured. Browser storage is unavailable, so keep this page open.')
      }
      catch {
        report('Could not capture the preview.')
      }
    },
    dispose() { abort.abort() },
  }
}
