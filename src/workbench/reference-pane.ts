import { openCrewFitting, turnaroundUrl } from './crew-fitting'
import { createPhotoControls } from './reference-controls'
import { encodeCrop, fitCrop, readCrop } from './reference-crop'
import { readStorage, writeStorage } from '../browser-storage'
import { readReference, referenceDescription, withReference } from './reference-link'

const cropSaveDelay = 150

function savedReference(key: string) {
  try {
    const saved = JSON.parse(readStorage('localStorage', key) ?? 'null') as { address?: string, open?: boolean, description?: string, crop?: string } | null
    const address = readReference(saved?.address ?? '')?.source ?? ''
    return { address, description: referenceDescription(saved?.description), open: Boolean(address && saved?.open), crop: readCrop(saved?.crop) }
  }
  catch {
    return { address: '', description: '', open: false, crop: fitCrop }
  }
}

function loadReference(img: HTMLImageElement, ref: NonNullable<ReturnType<typeof readReference>>, width: number) {
  if (ref.commons) {
    img.sizes = Math.max(1, width) + 'px'
    const detail = new URL(ref.image)
    detail.searchParams.set('width', '1920')
    img.srcset = ref.image + ' 960w, ' + detail.href + ' 1920w'
  }
  img.src = ref.image
}

function setComparisonTools(pane: HTMLElement, editor: HTMLDetailsElement, fitting: boolean) {
  pane.classList.toggle('crew-comparison', fitting)
  pane.querySelector<HTMLElement>('#turnaround-angles')!.hidden = !fitting
  pane.querySelector<HTMLDetailsElement>('#photo-controls')!.open = !fitting
  editor.open = !fitting
}

export function createReferencePane() {
  const pane = document.querySelector<HTMLElement>('#asset-reference')!
  const toggle = document.querySelector<HTMLButtonElement>('#reference-toggle')!
  const editor = pane.querySelector<HTMLDetailsElement>('#reference-editor')!
  const form = pane.querySelector('form')!
  const input = form.querySelector<HTMLInputElement>('#reference-url')!
  const descriptionInput = form.querySelector<HTMLInputElement>('#reference-description')!
  const remove = document.querySelector<HTMLButtonElement>('#reference-remove')!
  const source = document.querySelector<HTMLAnchorElement>('#reference-source')!
  const search = document.querySelector<HTMLAnchorElement>('#reference-search')!
  const picture = document.getElementById('reference-picture')!
  const status = document.getElementById('reference-status')!
  let key = '', subject = '', name = '', address = '', description = ''

  let pending: number | undefined
  const controls = createPhotoControls(picture, () => {
    window.clearTimeout(pending)
    pending = window.setTimeout(remember, cropSaveDelay)
  })
  window.addEventListener('pagehide', () => {
    if (pending !== undefined) remember()
  })

  function display(open: boolean, crop = controls.crop, initialFocalX?: number) {
    controls.reset(crop)
    pane.hidden = !open
    toggle.setAttribute('aria-expanded', String(open))
    input.value = address
    descriptionInput.value = description
    input.setCustomValidity('')
    status.textContent = ''
    picture.replaceChildren()
    setComparisonTools(pane, editor, subject === 'crew' && address === turnaroundUrl)
    remove.hidden = !address
    const ref = readReference(address)
    source.hidden = !open || !ref
    if (!open || !ref) return
    source.href = ref.source
    source.textContent = ref.commons ? 'File & license ↗' : 'Open source ↗'
    const img = new Image()
    img.alt = description || 'Reference photo for ' + name
    img.referrerPolicy = 'no-referrer'
    status.textContent = 'Loading reference…'
    let focalX = initialFocalX
    img.onload = () => {
      if (img.parentElement !== picture) return
      status.textContent = 'Reference photo loaded.'
      controls.attach(img, focalX)
      focalX = undefined
    }
    img.onerror = () => {
      if (img.parentElement !== picture) return
      controls.reset(controls.crop)
      editor.open = true
      img.remove()
      status.textContent = 'Image could not load. Open the source or try another URL.'
    }
    picture.append(img)
    loadReference(img, ref, picture.clientWidth)
  }
  function savePreference() {
    window.clearTimeout(pending)
    pending = undefined
    writeStorage('localStorage', key, address ? JSON.stringify({ address, description, open: !pane.hidden, crop: encodeCrop(controls.crop) }) : null)
  }
  function remember() {
    savePreference()
    const url = new URL(location.href)
    if (!url.hash) url.hash = subject
    const next = withReference(url.href, pane.hidden ? null : address || null, controls.crop, description)
    if (next !== location.href) history.replaceState(history.state, '', next)
  }
  toggle.addEventListener('click', () => {
    display(pane.hidden)
    remember()
    if (!pane.hidden) (editor.open ? input : editor.querySelector('summary'))?.focus()
  })
  pane.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    display(false)
    remember()
    toggle.focus()
  })
  input.addEventListener('input', () => input.setCustomValidity(''))
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const ref = readReference(input.value.trim())
    if (!ref) {
      input.setCustomValidity('Enter a direct image URL or a Wikimedia Commons File page.')
      input.reportValidity()
      return
    }
    const crop = ref.source === address ? controls.crop : fitCrop
    address = ref.source
    description = referenceDescription(descriptionInput.value)
    display(true, crop)
    remember()
  })
  remove.addEventListener('click', () => {
    address = description = ''
    display(true, fitCrop)
    remember()
    input.focus()
  })
  return {
    select(id: string, label: string) {
      if (pending !== undefined) savePreference()
      subject = id
      name = label
      key = 'mission-island-asset-reference-' + id
      search.href = 'https://commons.wikimedia.org/wiki/Special:MediaSearch?' + new URLSearchParams({ type: 'image', search: label }).toString()
      const saved = savedReference(key)
      address = saved.address
      description = saved.description
      const { open, crop } = saved
      document.getElementById('crew-fitting')!.hidden = id !== 'crew'
      const focalX = openCrewFitting()
      const hash = location.hash
      const params = new URLSearchParams(hash.slice(hash.indexOf('?') + 1))
      const linked = params.get('ref')
      if (linked !== null) {
        const ref = readReference(linked)
        if (!ref) {
          address = description = ''
          display(true, fitCrop)
          status.textContent = 'This link contains an invalid image URL. Choose another reference.'
          return
        }
        address = ref.source
        description = referenceDescription(params.get('refAlt'))
        display(true, readCrop(params.get('crop')), focalX)
        remember()
      }
      else {
        display(open, crop)
        if (open) remember()
      }
    },
    share(link: string) {
      return !pane.hidden && address ? withReference(link, address, controls.crop, description) : link
    },
  }
}
