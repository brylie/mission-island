import { readStorage, writeStorage } from '../browser-storage'
import { readSubjectLink } from './subject-link'

interface Variation { name: string; hash: string }

export function createVariationLibrary(currentLink: () => string | undefined) {
  const panel = document.getElementById('variations')!
  const name = document.querySelector<HTMLInputElement>('#variation-name')!
  const select = document.querySelector<HTMLSelectElement>('#variation-select')!
  const list = document.getElementById('variation-library')!
  const status = document.getElementById('variation-status')!
  let subject = ''
  const key = () => 'mission-island-variations-v1-' + subject
  function read(): Variation[] {
    try {
      const stored: unknown = JSON.parse(readStorage('localStorage', key()) ?? '[]')
      if (!Array.isArray(stored)) return []
      return stored.filter((v: unknown): v is Variation => {
        if (!v || typeof v !== 'object' || !('name' in v) || !('hash' in v)) return false
        return typeof v.name === 'string' && typeof v.hash === 'string' &&
          v.hash.startsWith('#' + subject + '?') && Boolean(readSubjectLink(v.hash))
      })
    } catch { return [] }
  }
  function refresh(items: Variation[]) {
    select.replaceChildren(...items.map(v => new Option(v.name, v.name)))
    list.hidden = !items.length
  }
  document.getElementById('variation-form')!.addEventListener('submit', event => {
    event.preventDefault()
    const title = name.value.trim(), link = currentLink()
    if (!title || !link) return
    const items = read()
    if (items.some(v => v.name === title)) {
      status.textContent = 'That name is already in use.'
      return
    }
    items.push({ name: title, hash: new URL(link).hash })
    if (!writeStorage('localStorage', key(), JSON.stringify(items))) {
      status.textContent = 'Browser storage is unavailable.'
      return
    }
    refresh(items)
    select.value = title
    name.value = ''
    status.textContent = 'Saved ' + title + '.'
  })
  document.getElementById('variation-open')!.addEventListener('click', () => {
    const chosen = read().find(v => v.name === select.value)
    if (chosen) location.hash = chosen.hash
  })
  document.getElementById('variation-remove')!.addEventListener('click', () => {
    const title = select.value
    const items = read().filter(v => v.name !== title)
    if (writeStorage('localStorage', key(), JSON.stringify(items))) {
      refresh(items)
      status.textContent = 'Removed ' + title + '.'
    } else status.textContent = 'Browser storage is unavailable.'
  })
  return (id: string, enabled: boolean) => {
    panel.hidden = !enabled
    if (id === subject) return
    subject = id
    status.textContent = name.value = ''
    if (enabled) refresh(read())
  }
}
