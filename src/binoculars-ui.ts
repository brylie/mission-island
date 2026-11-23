import { binocularEye, binocularFieldOfView, lookDirection, type BinocularLook } from './binocular-view'
import { lookPitchSensitivity, lookYawSensitivity } from './island-camera'
import type { LookSettings } from './look-options-ui'
import type { ClientMessage, Snapshot } from './protocol'
import { bearingDegrees, binocularEyeHeightM, binocularMagnification, canUseBinoculars, markCooldownMs, rangeFind, rangefinderReachM, rangeReadout } from './spotting'

interface Options {
  playfield: HTMLElement
  send: (message: ClientMessage) => void
  look: () => LookSettings
  // Whether the game takes keys and clicks now: connected, following the crewmate, no dialog or shader review open.
  ready: () => boolean
  crew: () => { state: Snapshot, id: number } | undefined
  // The camera's view through the reticle, so the binoculars come up on what it points at.
  aim: () => { origin: Spot, direction: Spot } | undefined
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

interface Spot { x: number, y: number, z: number }

// The view from the crewmate's eyes onto whatever the reticle points at: the ground, water or a
// building it meets, or a point far along the ray when it meets nothing. The reticle sits over the
// shoulder, so aiming at the spot itself (not along the camera's direction) centres it in the lenses.
function aimedView(feet: Spot & { heading: number }, ray: { origin: Spot, direction: Spot } | undefined): BinocularLook {
  if (!ray) return { yaw: feet.heading, pitch: 0 }
  const spot = rangeFind(ray.origin, ray.direction) ?? { x: ray.origin.x + ray.direction.x * rangefinderReachM, y: ray.origin.y + ray.direction.y * rangefinderReachM, z: ray.origin.z + ray.direction.z * rangefinderReachM }
  const eye = { x: feet.x, y: feet.y + binocularEyeHeightM, z: feet.z }
  const dx = spot.x - eye.x, dz = spot.z - eye.z
  return { yaw: Math.atan2(dx, dz), pitch: clampPitch(Math.atan2(spot.y - eye.y, Math.hypot(dx, dz))) }
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
    <output class="binoculars-readout" aria-live="off"></output>
    <p class="binoculars-status" role="status"></p>
    <p class="binoculars-help"><kbd>Mouse</kbd><kbd>WASD</kbd><span>Look</span><kbd>Shift</kbd><span>Sweep</span><kbd>Click</kbd><kbd>Enter</kbd><span>Mark</span><kbd>X</kbd><span>Clear</span><kbd>V</kbd><kbd>Esc</kbd><span>Lower</span></p>`
  return overlay
}

// While raised, the mouse turns the binoculars and a left click marks. The game never sees either.
function bindMouse(playfield: HTMLElement, look: () => LookSettings, { view, mark, lower }: { view: () => BinocularLook | undefined, mark: () => void, lower: () => void }) {
  let wasLocked = false
  window.addEventListener('mousemove', (event) => {
    const current = view()
    if (!current) return
    event.stopImmediatePropagation()
    // The same look rates as the follow camera, slowed by the magnification so the view moves at the same speed on screen.
    const { speed, invertHorizontal, invertVertical } = look()
    const rate = speed / binocularMagnification
    current.yaw += event.movementX * lookYawSensitivity * rate * (invertHorizontal ? -1 : 1)
    current.pitch = clampPitch(current.pitch - event.movementY * lookPitchSensitivity * rate * (invertVertical ? -1 : 1))
  }, true)

  // A left click marks the ranged point, so it cannot also spray or throw.
  const overView = (event: Event) => event.target instanceof Element && playfield.contains(event.target) && !event.target.closest('button, a, input, select, textarea, dialog')
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup'] as const) {
    window.addEventListener(type, (event) => {
      if (!view() || (!overView(event) && !document.pointerLockElement)) return
      event.preventDefault()
      event.stopImmediatePropagation()
      if (type === 'pointerdown' && event.button === 0) mark()
    }, true)
  }

  // Escape releases a locked mouse before the page sees the key, so losing the lock lowers the binoculars too.
  document.addEventListener('pointerlockchange', () => {
    const locked = Boolean(document.pointerLockElement)
    if (wasLocked && !locked && view()) lower()
    wasLocked = locked
  })
}

// Handheld 8× binoculars with a laser rangefinder and compass. V raises them on foot; while raised they take the
// mouse and keyboard first, so the game's walking, clicking and interaction keys stay quiet.
export function bindBinoculars({ playfield, send, look, ready, crew, aim, raise: prepare }: Options) {
  const overlay = overlayMarkup()
  playfield.append(overlay)
  const readout = overlay.querySelector('output') as HTMLOutputElement
  const status = overlay.querySelector('.binoculars-status') as HTMLElement
  let statusUntil = 0
  let feet: { x: number, y: number, z: number } | undefined
  let lastMarkSent = -markCooldownMs
  const panning = new Set<string>()
  let view: BinocularLook | undefined
  let target: { x: number, z: number } | undefined
  let lastFrame = 0
  let lastReading = -readoutIntervalMs
  let sweeping = false

  function crewmate() {
    const current = crew()
    const player = current?.state.players.find((entry) => entry.id === current.id)
    return current && player && ready() && canUseBinoculars(current.state, player) ? { state: current.state, player } : undefined
  }

  function raise() {
    const current = crewmate()
    if (!current) return
    view = aimedView(current.player, aim())
    panning.clear()
    target = undefined
    lastFrame = performance.now()
    lastReading = -readoutIntervalMs
    readout.textContent = ''
    statusUntil = 0
    status.textContent = ''
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
    // Written only when it changes; the readout is not a live region, so a screen reader reads it on request.
    const text = rangeReadout(hit?.metres, degrees)
    if (readout.textContent !== text) readout.textContent = text
    overlay.dataset.ranged = String(Boolean(hit))
  }

  // Notices and refusals show under the readout while the binoculars are up, where the game's prompt is hidden.
  // The status stays in the accessibility tree and is cleared before each line, so a screen reader announces every one.
  function say(text: string) {
    status.textContent = ''
    status.textContent = text
    statusUntil = performance.now() + statusDurationMs
  }

  // Always asks the host, which knows about a mark the snapshot has not shown yet and answers when there is none.
  function clearMark() {
    send({ type: 'clear-mark' })
  }

  // Ranges again at the click, so the mark is always where the reticle is now, not at the last readout.
  function mark() {
    const now = performance.now()
    const current = crewmate()
    if (current && view) range(feet ?? current.player, view)
    if (!target) say('Nothing in range to mark')
    else if (now - lastMarkSent < markCooldownMs) say('Hold steady, then mark again')
    else {
      lastMarkSent = now
      send({ type: 'mark', ...target })
    }
  }

  // Called once per rendered frame. Pans by the held keys and lowers the binoculars when the crewmate can no longer use them.
  // The renderer passes the crewmate's drawn position, so the rangefinder traces the same ray as the camera.
  function frame(drawn?: { x: number, y: number, z: number }) {
    feet = drawn && { x: drawn.x, y: drawn.y, z: drawn.z }
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
    if (now > statusUntil && status.textContent) status.textContent = ''
    if (now - lastReading >= readoutIntervalMs) {
      lastReading = now
      range(feet ?? current.player, view)
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
    else if (event.code === 'Enter' || event.code === 'NumpadEnter') mark()
    else if (event.code === 'KeyX') clearMark()
  }, true)
  // A key released outside the page sends no keyup, so leaving the page stops any pan.
  window.addEventListener('blur', () => {
    panning.clear()
    sweeping = false
  })
  window.addEventListener('keyup', (event) => {
    sweeping = event.shiftKey
    if (panning.delete(event.code)) event.stopImmediatePropagation()
  }, true)

  bindMouse(playfield, look, { view: () => view, mark, lower })

  return {
    view: frame,
    // Shows a game notice in the binoculars while they are up, and hands it on for the prompt.
    echo<T extends { label: string }>(feedback: T) {
      if (view && feedback.label) say(feedback.label)
      return feedback
    },
  }
}
