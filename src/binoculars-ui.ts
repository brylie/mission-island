import { binocularEye, binocularFieldOfView, lookDirection, type BinocularLook } from './binocular-view'
import { lookPitchSensitivity, lookYawSensitivity } from './island-camera'
import type { LookSettings } from './look-options-ui'
import type { ClientMessage, CrewMark, Snapshot } from './protocol'
import { distance, type Point } from './world'
import { bearingDegrees, binocularMagnification, canUseBinoculars, rangeFind, rangeReadout } from './spotting'

interface Options {
  playfield: HTMLElement
  send: (message: ClientMessage) => void
  look: () => LookSettings
  // Whether the game takes keys and clicks now: connected, following the crewmate, no dialog or shader review open.
  ready: () => boolean
  crew: () => { state: Snapshot, id: number } | undefined
  // The follow camera's heading, so the binoculars come up looking the same way.
  heading: () => number | undefined
  // Stops walking and any held action, and captures the mouse for looking.
  raise: () => void
}

const millisecondsPerSecond = 1000
const longestFrameSeconds = 0.1
// The rangefinder updates its readout ten times a second, like a scanning laser rangefinder.
const readoutIntervalMs = 100
const statusDurationMs = 2400
// The view tilts no further than this above or below the horizon.
const pitchLimit = 1.25
// Movement keys pan the view by this share of its width each second, and Shift sweeps faster to swing round.
const keyPanFieldsPerSecond = 1
const keyPanRadPerSecond = binocularFieldOfView * keyPanFieldsPerSecond
const sweepMultiplier = 4
const panKeys: Record<string, [yaw: number, pitch: number]> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
}

function clampPitch(pitch: number) {
  return Math.max(-pitchLimit, Math.min(pitchLimit, pitch))
}

function overlayMarkup() {
  const overlay = document.createElement('section')
  overlay.className = 'binoculars'
  overlay.hidden = true
  overlay.setAttribute('aria-label', 'Binoculars')
  overlay.innerHTML = `
    <div class="binoculars-field" aria-hidden="true"></div>
    <div class="binoculars-reticle" aria-hidden="true"><i></i><i></i></div>
    <output class="binoculars-readout" aria-label="Rangefinder distance and bearing"></output>
    <p class="binoculars-status" role="status"></p>
    <p class="binoculars-help"><kbd>Click</kbd><kbd>Enter</kbd><span>Mark</span><kbd>X</kbd><span>Clear mark</span><kbd>V</kbd><kbd>Esc</kbd><span>Lower</span></p>`
  return overlay
}

// Handheld 8× binoculars with a laser rangefinder and compass. V raises them on foot; while raised they take the
// mouse and keyboard first, so the game's walking, clicking and interaction keys stay quiet.
export function bindBinoculars({ playfield, send, look, ready, crew, heading, raise: prepare }: Options) {
  const overlay = overlayMarkup()
  playfield.append(overlay)
  const readout = overlay.querySelector('output') as HTMLOutputElement
  const status = overlay.querySelector('.binoculars-status') as HTMLElement
  let ownMark: CrewMark | undefined
  let statusUntil = 0
  const panning = new Set<string>()
  let view: BinocularLook | undefined
  let target: { x: number, z: number } | undefined
  let lastFrame = 0
  let lastReading = -readoutIntervalMs
  let wasLocked = false
  let sweeping = false

  function crewmate() {
    const current = crew()
    const player = current?.state.players.find((entry) => entry.id === current.id)
    return current && player && ready() && canUseBinoculars(current.state, player) ? { state: current.state, player } : undefined
  }

  function raise() {
    const current = crewmate()
    if (!current) return
    view = { yaw: heading() ?? current.player.heading, pitch: 0 }
    panning.clear()
    target = undefined
    lastFrame = performance.now()
    lastReading = -readoutIntervalMs
    readout.textContent = ''
    ownMark = crew()?.state.marks.find((mark) => mark.playerId === current.player.id)
    status.hidden = true
    overlay.hidden = false
    document.body.dataset.binoculars = 'raised'
    prepare()
  }

  function lower() {
    view = undefined
    target = undefined
    panning.clear()
    overlay.hidden = true
    delete document.body.dataset.binoculars
  }

  function range(feet: { x: number, y: number, z: number }, current: BinocularLook) {
    const eye = binocularEye(feet, current)
    const ahead = lookDirection(current)
    const hit = rangeFind(eye, ahead)
    target = hit && { x: hit.x, z: hit.z }
    // The compass reads the bearing of the ranged point, or of the line of sight when nothing is in range.
    const degrees = bearingDegrees(feet, hit ?? { x: feet.x + ahead.x, z: feet.z + ahead.z })
    readout.textContent = rangeReadout(hit?.metres, degrees)
    overlay.dataset.ranged = String(Boolean(hit))
  }

  // The host confirms a mark by sharing it, so the confirmation shows when the crewmate's own mark moves or goes.
  function showOwnMark(mark: CrewMark | undefined, player: Point, now: number) {
    if (mark?.x !== ownMark?.x || mark?.z !== ownMark?.z) {
      status.textContent = mark ? `Marked for the crew · ${Math.round(distance(player, mark))} m` : 'Mark cleared'
      statusUntil = now + statusDurationMs
    }
    ownMark = mark
    status.hidden = now > statusUntil
  }

  // Called once per rendered frame. Pans by the held keys and lowers the binoculars when the crewmate can no longer use them.
  function frame() {
    if (!view) return undefined
    const current = crewmate()
    if (!current) {
      lower()
      return undefined
    }
    const now = performance.now()
    const seconds = Math.min(longestFrameSeconds, (now - lastFrame) / millisecondsPerSecond)
    lastFrame = now
    const settings = look()
    const step = keyPanRadPerSecond * seconds * (sweeping ? sweepMultiplier : 1)
    for (const code of panning) {
      const [yaw, pitch] = panKeys[code]
      view.yaw += yaw * step * (settings.invertHorizontal ? -1 : 1)
      view.pitch = clampPitch(view.pitch + pitch * step * (settings.invertVertical ? -1 : 1))
    }
    showOwnMark(current.state.marks.find((mark) => mark.playerId === current.player.id), current.player, now)
    if (now - lastReading >= readoutIntervalMs) {
      lastReading = now
      range(current.player, view)
    }
    return view
  }

  function swallow(event: Event) {
    event.preventDefault()
    event.stopImmediatePropagation()
  }

  window.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if (!view) {
      if (event.code === 'KeyV' && !event.repeat && crewmate()) {
        swallow(event)
        raise()
      }
      return
    }
    // Options still opens; the binoculars come down first.
    if (event.code === 'KeyO') {
      lower()
      return
    }
    swallow(event)
    sweeping = event.shiftKey
    if (event.code in panKeys) panning.add(event.code)
    if (event.repeat) return
    if (event.code === 'KeyV' || event.code === 'Escape') lower()
    else if ((event.code === 'Enter' || event.code === 'NumpadEnter') && target) send({ type: 'mark', ...target })
    else if (event.code === 'KeyX') send({ type: 'clear-mark' })
  }, true)
  window.addEventListener('keyup', (event) => {
    sweeping = event.shiftKey
    if (panning.delete(event.code)) event.stopImmediatePropagation()
  }, true)

  window.addEventListener('mousemove', (event) => {
    if (!view) return
    event.stopImmediatePropagation()
    // The same look rates as the follow camera, slowed by the magnification so the view moves at the same speed on screen.
    const { speed, invertHorizontal, invertVertical } = look()
    const rate = speed / binocularMagnification
    view.yaw += event.movementX * lookYawSensitivity * rate * (invertHorizontal ? -1 : 1)
    view.pitch = clampPitch(view.pitch - event.movementY * lookPitchSensitivity * rate * (invertVertical ? -1 : 1))
  }, true)

  // A left click marks the ranged point. The game never sees the click, so it cannot also spray or throw.
  const overView = (event: Event) => event.target instanceof Element && playfield.contains(event.target) && !event.target.closest('button, a, input, select, textarea, dialog')
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup'] as const) {
    window.addEventListener(type, (event) => {
      if (!view || (!overView(event) && !document.pointerLockElement)) return
      swallow(event)
      if (type === 'pointerdown' && event.button === 0 && target) send({ type: 'mark', ...target })
    }, true)
  }

  // Escape releases a locked mouse before the page sees the key, so losing the lock lowers the binoculars too.
  document.addEventListener('pointerlockchange', () => {
    const locked = Boolean(document.pointerLockElement)
    if (wasLocked && !locked && view) lower()
    wasLocked = locked
  })

  return { view: frame }
}
