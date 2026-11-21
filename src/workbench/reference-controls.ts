import { fitCrop, maxZoom, moveCrop, photoFrame, type PhotoPoint, type ReferenceCrop } from './reference-crop'

export function createPhotoControls(picture: HTMLElement, changed: () => void) {
  const bar = document.getElementById('photo-controls')!
  const zoomIn = bar.querySelector<HTMLButtonElement>('[data-photo="in"]')!
  const zoomOut = bar.querySelector<HTMLButtonElement>('[data-photo="out"]')!
  const fit = bar.querySelector<HTMLButtonElement>('[data-photo="fit"]')!
  const percent = bar.querySelector('output')!
  const panButtons = bar.querySelectorAll<HTMLButtonElement>('[data-pan]')
  const position = document.getElementById('photo-position')!
  const offsets: Record<string, [number, number]> = { ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] }
  let announcement: number | undefined
  let crop = fitCrop
  let image: HTMLImageElement | undefined
  const pointers = new Map<number, PhotoPoint>()
  const size = () => ({ width: picture.clientWidth, height: picture.clientHeight, aspect: image ? image.naturalWidth / image.naturalHeight : 1 })
  function draw() {
    const view = size()
    if (!image || !view.width || !view.height || !image.naturalHeight) return
    const f = photoFrame(view, crop)
    Object.assign(image.style, { width: f.width + 'px', height: f.height + 'px', transform: 'translate(' + f.left + 'px,' + f.top + 'px)' })
    if (image.srcset) image.sizes = Math.ceil(f.width) + 'px'
    percent.value = Math.round(crop.zoom * 100) + '%'
    const focused = document.activeElement
    zoomOut.disabled = fit.disabled = crop.zoom <= 1
    zoomIn.disabled = crop.zoom >= maxZoom
    for (const button of panButtons) button.disabled = crop.zoom <= 1
    if (focused instanceof HTMLButtonElement && bar.contains(focused) && focused.disabled) picture.focus()
    picture.classList.toggle('pannable', crop.zoom > 1)
  }
  new ResizeObserver(draw).observe(picture)
  function move(zoom: number, from?: PhotoPoint, to?: PhotoPoint) {
    if (!image) return
    const view = size()
    const anchor = from ?? { x: view.width / 2, y: view.height / 2 }
    crop = moveCrop(view, crop, zoom, anchor, to ?? anchor)
    draw()
    changed()
    window.clearTimeout(announcement)
    announcement = window.setTimeout(() => {
      position.textContent = crop.zoom === 1
        ? 'Whole photo in view.'
        : `Zoom ${percent.value}. Center ${Math.round(crop.x * 100)}% from left, ${Math.round(crop.y * 100)}% from top.`
    }, 300)
  }
  function pan(key: string) {
    const [x, y] = offsets[key]
    move(crop.zoom, { x: 0, y: 0 }, { x, y })
  }
  for (const button of panButtons) button.onclick = () => pan(button.dataset.pan!)
  zoomIn.onclick = () => move(crop.zoom * 1.5)
  zoomOut.onclick = () => move(crop.zoom / 1.5)
  fit.onclick = () => move(1)
  function local(e: MouseEvent) {
    const box = picture.getBoundingClientRect()
    return { x: e.clientX - box.left, y: e.clientY - box.top }
  }
  picture.addEventListener('wheel', (e) => {
    if (!image) return
    e.preventDefault()
    const units = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? picture.clientHeight : 1
    move(crop.zoom * Math.exp(-e.deltaY * units * 0.0025), local(e))
  }, { passive: false })
  function gesture() {
    const [a, b] = pointers.values()
    if (!b) return { point: a, distance: 0 }
    return { point: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, distance: Math.hypot(a.x - b.x, a.y - b.y) }
  }
  picture.addEventListener('pointerdown', (e) => {
    if (!image || e.button !== 0 || pointers.size >= 2) return
    picture.setPointerCapture(e.pointerId)
    pointers.set(e.pointerId, local(e))
  })
  picture.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return
    const before = gesture()
    pointers.set(e.pointerId, local(e))
    const after = gesture()
    move(crop.zoom * (before.distance && after.distance ? after.distance / before.distance : 1), before.point, after.point)
  })
  picture.addEventListener('lostpointercapture', (e) => pointers.delete(e.pointerId))
  picture.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (Object.hasOwn(offsets, e.key)) pan(e.key)
    else if (e.key === '+' || e.key === '=') move(crop.zoom * 1.5)
    else if (e.key === '-') move(crop.zoom / 1.5)
    else if (e.key === 'Home') move(1)
    else return
    e.preventDefault()
  })
  return {
    get crop() { return crop },
    reset(next: ReferenceCrop) {
      window.clearTimeout(announcement)
      position.textContent = ''
      image = undefined
      crop = next
      pointers.clear()
      bar.hidden = true
      picture.tabIndex = -1
      picture.classList.remove('pannable')
    },
    attach(img: HTMLImageElement, focalX?: number) {
      image = img
      img.draggable = false
      bar.hidden = false
      picture.tabIndex = 0
      if (focalX !== undefined) {
        const view = size(), frame = photoFrame(view, fitCrop)
        if (frame.height > 0) {
          crop = { zoom: Math.max(1, Math.min(maxZoom, view.height / frame.height)), x: focalX, y: 0.5 }
          changed()
        }
      }
      draw()
    },
  }
}
