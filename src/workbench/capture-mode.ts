// With `?capture` in the address, the Workbench shows only its 3D view at the
// window's full size, for scripted screenshots (scripts/capture-hero-views.mjs).
// Once the subject has drawn enough frames to settle, the page marks itself
// ready with `data-capture-ready` on the body.
const settleFrames = 120

export function captureMode() {
  if (!new URLSearchParams(location.search).has('capture')) return () => {}
  document.body.classList.add('workbench-capture')
  let frames = 0
  return () => {
    frames++
    if (frames === settleFrames) document.body.dataset.captureReady = 'true'
  }
}
