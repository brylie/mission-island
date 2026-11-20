import './style.css'
import { boundaryBuoys, buoyBoundaryPoint, coastPoint } from './terrain'
import { actionHint, heldItem, inSkiff } from './actions'
import { anglerCost, cleanCrewName, defaultAppearance, readAppearance, skinTones, uniforms } from './crew-appearance'
import type { CrewAppearance } from './crew-appearance'
import { farm, market } from './farm'
import { starterTools, toolNames } from './inventory'
import type { InventoryItem } from './inventory'
import type { ClientMessage, FishingResult, Input, Player, ServerMessage, Snapshot } from './protocol'
import { footpaths, road, walkways } from './routes'
import { northernRegions } from './scenery'
import { createRenderer } from './scene'
import { isNight } from './weather'
import { crewHomes, distance, harbor, lookout, town } from './world'

function element<T extends HTMLElement>(id: string) {
  const node = document.getElementById(id)
  if (!node) throw new Error(`Missing #${id}`)
  return node as T
}

const canvas = element<HTMLCanvasElement>('island')
const bootStatus = element('boot-status')
const bootMessage = element('boot-message')
const playfield = element('playfield')
const markers = element('markers')
const notice = element('notice')
const status = element('status')
const clock = element('island-clock')
const light = element('status-light')
const crewCount = element('crew-count')
const crewRows = [element('crew-0'), element('crew-1')]
const missionLabel = element('mission-label')
const missionTitle = element('mission-title')
const missionDescription = element('mission-description')
const progress = element('progress-track')
const segments = Array.from(progress.children)
const progressLabel = element('progress-label')
const missionStep = element('mission-step')
const reset = element<HTMLButtonElement>('reset')
const respawn = element<HTMLButtonElement>('respawn')
const spray = element('spray-control')
const cameraButton = element<HTMLButtonElement>('camera')
const orbitControl = element('orbit-control')
const optionsButton = element<HTMLButtonElement>('options-button')
const optionsDialog = element<HTMLDialogElement>('options-dialog')
const crewName = element<HTMLInputElement>('crew-name')
const editCrewName = element<HTMLButtonElement>('edit-crew-name')
const invertHorizontal = element<HTMLInputElement>('invert-horizontal')
const invertVertical = element<HTMLInputElement>('invert-vertical')
const uniformSelect = element<HTMLSelectElement>('uniform')
const skinSelect = element<HTMLSelectElement>('skin-tone')
const uniformProgress = element('uniform-progress')
const coinBalance = element('coin-balance')
const fishingWallet = element('fishing-wallet')
const toolSlots = element('tool-slots')
const chargeMeter = element('charge-meter')
const chargeLabel = element('charge-label')
const chargePower = element<HTMLProgressElement>('charge-power')
const buyAngler = element<HTMLButtonElement>('buy-angler')
const profileKey = 'mission-island-appearance'
invertHorizontal.checked = localStorage.getItem('mission-island-invert-horizontal') !== 'false'
invertVertical.checked = localStorage.getItem('mission-island-invert-vertical') !== 'false'
const prompt = element('prompt')
const promptKey = element('prompt-key')
const promptAction = element('prompt-action')
const map = element<HTMLCanvasElement>('map')
const ink = map.getContext('2d')

let renderer: ReturnType<typeof createRenderer> | undefined
let socket: WebSocket
let id = -1
let live = false
let message = ''
let snapshot: Snapshot | undefined
let follow = sessionStorage.getItem('mission-island-follow') !== 'false'
const keys = new Set<string>()
let primary = false
let wasPointerLocked = false
const crewKey = 'mission-island-crew'
const reloadKey = 'mission-island-reloading'
const nameKey = 'mission-island-crew-name'
crewName.value = cleanCrewName(localStorage.getItem(nameKey))
let token = sessionStorage.getItem(crewKey) ?? localStorage.getItem(crewKey) ?? newToken()
sessionStorage.setItem(crewKey, token)
if (!localStorage.getItem(crewKey)) localStorage.setItem(crewKey, token)
let appearance: CrewAppearance = defaultAppearance
let milestone = 0
let ownsAngler = false
let coins = 0
let actionFeedback: { key: string; label: string; until: number } | undefined
const feedbackText: Record<FishingResult, [string, string]> = {
  caught: ['+1 fish', 'Caught a fish'],
  'no-bite': ['', 'No bite'],
  'dry-cast': ['', 'Aim at open water'],
  escaped: ['', 'The fish escaped'],
  'line-snapped': ['', 'The line snapped'],
  'boat-moving': ['', 'Let the skiff settle before casting'],
}

const toolButtons = starterTools.map((item, index) => {
  const button = document.createElement('button')
  const key = document.createElement('kbd')
  button.type = 'button'
  button.setAttribute('aria-pressed', 'false')
  key.textContent = String(index + 1)
  button.append(key, ` ${toolNames[item]}`)
  button.addEventListener('click', () => {
    equip(item)
    button.blur()
  })
  toolSlots.append(button)
  return button
})
try {
  const saved = JSON.parse(localStorage.getItem(profileKey) ?? '{}') as { appearance?: unknown; milestone?: unknown } | null
  appearance = readAppearance(saved?.appearance)
  milestone = saved?.milestone === 2 ? 2 : saved?.milestone === 1 ? 1 : 0
} catch {
  // Use the default crew profile if saved preferences are unreadable.
}

function renderAppearanceOptions() {
  uniformSelect.replaceChildren(new Option('Crew default', 'default'))
  for (const [key, uniform] of Object.entries(uniforms)) {
    const locked = key === 'angler' ? !ownsAngler : uniform.milestone > milestone
    const option = new Option(locked ? `${uniform.name} (locked)` : uniform.name, key)
    option.disabled = locked
    uniformSelect.add(option)
  }
  uniformSelect.value = appearance.uniform === 'angler' && !ownsAngler ? 'default' : appearance.uniform
  skinSelect.replaceChildren(new Option('Crew default', 'default'))
  for (const [key, tone] of Object.entries(skinTones)) skinSelect.add(new Option(tone.name, key))
  skinSelect.value = appearance.skin
  const next = Object.values(uniforms).find((uniform) => uniform.milestone > milestone)
  uniformProgress.textContent = next ? `${next.unlock} to unlock ${next.name}.` : ''
}
renderAppearanceOptions()
buyAngler.textContent = `Buy Harbor angler · ${anglerCost} coins`

function saveAppearance() {
  localStorage.setItem(profileKey, JSON.stringify({ appearance, milestone }))
}

function newToken() {
  const value = Array.from(crypto.getRandomValues(new Uint8Array(16)),
    (byte) => byte.toString(16).padStart(2, '0')).join('')
  sessionStorage.setItem(crewKey, value)
  return value
}

function drawMap(state?: Snapshot) {
  if (!ink) return
  const { width, height } = map
  const afloat = state?.players.some((player) => player.id === id && inSkiff(player.seat))
  const scale = Math.min(width / (afloat ? 390 : 224), height / (afloat ? 400 : 245))
  const mx = (x: number) => width / 2 + x * scale
  const mz = (z: number) => height / 2 - (z - 66) * scale
  const dot = (x: number, z: number, color: string, radius: number) => {
    ink.fillStyle = color
    ink.beginPath()
    ink.arc(mx(x), mz(z), radius, 0, Math.PI * 2)
    ink.fill()
  }
  ink.fillStyle = '#245e68'
  ink.fillRect(0, 0, width, height)
  if (afloat) {
    ink.beginPath()
    for (let i = 0; i < 128; i++) {
      const { x, z } = buoyBoundaryPoint(i / 128 * Math.PI * 2)
      if (i === 0) ink.moveTo(mx(x), mz(z))
      else ink.lineTo(mx(x), mz(z))
    }
    ink.closePath()
    ink.strokeStyle = '#9abfc1'
    ink.lineWidth = 1
    ink.stroke()
    for (const { x, z } of boundaryBuoys) dot(x, z, '#ffd37b', 2)
  }
  for (const [radius, color] of [[1, '#acc293'], [0.916, '#6f9667']] as const) {
    ink.fillStyle = color
    ink.beginPath()
    for (let i = 0; i < 128; i++) {
      const { x, z } = coastPoint(i / 128 * Math.PI * 2, radius)
      if (i === 0) ink.moveTo(mx(x), mz(z))
      else ink.lineTo(mx(x), mz(z))
    }
    ink.closePath()
    ink.fill()
  }
  const local = state?.players.find((player) => player.id === id)
  for (const region of northernRegions) {
    dot(region.at.x, region.at.z, region.color, region.spread * scale * 0.55)
    if (local?.discoveries?.includes(region.id)) dot(region.site.x, region.site.z, '#e4ffe0', 2.25)
  }
  ink.lineJoin = 'round'
  ink.lineCap = 'round'
  function drawRoute(points: typeof road, width: number, color: string) {
    if (!ink) return
    ink.lineWidth = width
    ink.strokeStyle = color
    ink.beginPath()
    for (const [i, { x, z }] of points.entries()) {
      if (i === 0) ink.moveTo(mx(x), mz(z))
      else ink.lineTo(mx(x), mz(z))
    }
    ink.stroke()
  }

  for (const { points } of footpaths) drawRoute(points, 2, '#a5a77e')
  for (const { points } of walkways) drawRoute(points, 2, '#c4c9c1')
  drawRoute(road, 4, '#c7bb9a')
  if (state?.mission === 'fire') dot(lookout.x, lookout.z, '#f7a17d', 6)
  else {
    dot(harbor.x, harbor.z, '#fff0ae', 5)
    dot(town.x, town.z, '#acf3da', 5)
  }
  if (!state) return
  ink.fillStyle = '#38433a'
  ink.fillRect(mx(state.truck.x) - 5, mz(state.truck.z) - 4, 10, 8)
  if (state.skiff) dot(state.skiff.x, state.skiff.z, '#fff0ca', 3.5)
  dot(farm.x, farm.z, '#e3ba77', 3.5)
  dot(market.x, market.z, '#f2d3bc', 3.5)
  const home = crewHomes[id]
  if (home) dot(home.chest.x, home.chest.z, '#fed487', 3)
  for (const player of state.players) {
    if (!player.connected) continue
    dot(player.x, player.z, '#234244', 6.5)
    const chosen = player.appearance?.uniform
    dot(player.x, player.z, uniforms[chosen && chosen !== 'default' ? chosen : player.id ? 'blue' : 'amber'].color, 4.5)
  }
}

const renderFailed = 'This browser could not start WebGL. Try a browser with hardware acceleration enabled.'
function showNotice() {
  const detail = renderer ? message : renderFailed
  notice.textContent = detail
  notice.hidden = !detail
}
try {
  bootMessage.textContent = 'Building the island scenery…'
  renderer = createRenderer(canvas, markers)
  renderer.setMouseInversion(invertHorizontal.checked, invertVertical.checked)
  bootMessage.textContent = 'Connecting to the host…'
} catch (error) {
  console.error(error)
  bootMessage.textContent = renderFailed
}
showNotice()
drawMap()

function updateMission(state: Snapshot) {
  const delivering = state.mission === 'delivery'
  const finished = state.mission === 'complete'
  const reached = finished ? 2 : delivering ? 0 : 1
  if (live && reached > milestone) {
    milestone = reached
    saveAppearance()
    renderAppearanceOptions()
  }
  const delivered = state.items.filter((item) => item.delivered).length
  const loaded = state.items.filter((item) => item.onBed).length
  const extinguished = Math.round((1 - state.fire) * 100)
  missionLabel.textContent = delivering ? 'MISSION 01 / 02' : finished ? 'SHIFT COMPLETE' : 'MISSION 02 / 02'
  missionTitle.textContent = delivering ? 'Harbor delivery' : finished ? 'Nice work, crew!' : 'Forest lookout fire'
  missionDescription.textContent = delivering
    ? 'Bring three supply crates from Harbor Depot to Seabrook.'
    : finished
      ? 'The supplies arrived and the lookout is safe.'
      : 'Collect extinguishers at Fire Supplies and head to Forest Lookout.'
  progress.setAttribute('aria-label', delivering ? 'Crates delivered' : 'Fire extinguished')
  progress.setAttribute('aria-valuemax', delivering ? '3' : '100')
  progress.setAttribute('aria-valuenow', String(delivering ? delivered : extinguished))
  progressLabel.textContent = delivering ? `${delivered} / 3 delivered` : `${extinguished}% extinguished`
  segments.forEach((segment, index) => segment.classList.toggle('active',
    delivering ? index < delivered : extinguished >= (index + 1) * 100 / 3))
  reset.hidden = !finished
  spray.hidden = delivering || finished
  let instruction = 'Hold left click near the fire to put it out.'
  if (finished) instruction = 'Both missions complete.'
  else if (delivering) {
    if (distance(state.truck, town) < 11 || delivered > 0) {
      instruction = 'Carry the crates into the teal drop zone.'
    } else if (loaded === 3) {
      instruction = 'Drive to Seabrook. Hold Shift on corners.'
    } else {
      instruction = loaded > 0
        ? `${loaded} in the flatbed. Load or recover the remaining crates.`
        : 'Pick up crates and load the flatbed.'
    }
  }
  if (missionStep.textContent !== instruction) missionStep.textContent = instruction
}

function updatePersonalDisplay(state: Snapshot, player: Player, earlier: Player | undefined) {
  if (earlier) {
    const found = northernRegions.find(({ id }) => player.discoveries.includes(id) && !earlier.discoveries?.includes(id))
    if (found) actionFeedback = { key: '', label: `Discovered ${found.name}`, until: performance.now() + 4200 }
  }
  if (Boolean(player.ownsAngler) !== ownsAngler) {
    ownsAngler = Boolean(player.ownsAngler)
    renderAppearanceOptions()
  }
  coins = player.coins ?? 0
  const balance = `${coins} ${coins === 1 ? 'coin' : 'coins'}`
  if (coinBalance.textContent !== balance) coinBalance.textContent = balance
  const { fish, carrots } = player.goods
  const contents = [balance, `${player.seeds} seeds`, fish ? `${fish} fish` : '', carrots ? `${carrots} ${carrots === 1 ? 'carrot' : 'carrots'}` : '']
    .filter(Boolean).join(' · ')
  if (fishingWallet.textContent !== contents) fishingWallet.textContent = contents
  fishingWallet.hidden = !coins && !fish && !carrots && !player.seeds && !player.inventory.length
  toolSlots.hidden = !player.inventory.length
  const handsFull = Boolean(heldItem(state, player) || (player.seat && !inSkiff(player.seat)))
  for (const [index, button] of toolButtons.entries()) {
    button.hidden = !player.inventory.includes(starterTools[index])
    button.disabled = handsFull
    button.setAttribute('aria-pressed', String(player.equipped === starterTools[index]))
  }
  const fight = player.casting?.fight
  chargeMeter.hidden = !player.charge && !fight
  if (fight) {
    chargeMeter.dataset.kind = 'cast'
    chargeLabel.textContent = `Reeled ${Math.round(fight.progress * 100)}% · tension ${Math.round(fight.tension * 100)}%`
    chargePower.value = fight.progress
  } else if (player.charge) {
    chargeMeter.dataset.kind = player.charge.kind
    const label = player.charge.kind === 'throw' ? 'Throw power' : 'Cast power'
    if (chargeLabel.textContent !== label) chargeLabel.textContent = label
    chargePower.value = player.charge.power
  }
  buyAngler.hidden = ownsAngler
  buyAngler.disabled = coins < anglerCost
}

function update(state: Snapshot) {
  const earlier = snapshot?.players.find((player) => player.id === id)
  const previousHour = snapshot?.weather.hour
  snapshot = state
  const hours = Math.floor(state.weather.hour)
  const minutes = Math.floor((state.weather.hour - hours) * 60)
  clock.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} · ${state.weather.rain > 0.3 ? 'Rain' : isNight(hours) ? 'Night' : 'Daylight'}`
  if (previousHour !== undefined && isNight(previousHour) && !isNight(hours) && Math.abs(previousHour - hours) > 2) {
    actionFeedback = { key: '', label: 'Morning on the island', until: performance.now() + 2400 }
  }
  renderer?.update(state, id, follow)
  drawMap(state)
  const connected = state.players.filter((player) => player.connected)
  crewCount.textContent = `${connected.length} / 2`
  crewRows.forEach((row, index) => {
    const player = connected.find((entry) => entry.id === index)
    row.dataset.online = String(Boolean(player))
    const title = row.querySelector('span')
    if (title) title.textContent = player?.name || `Crew ${index + 1}`
    const role = row.querySelector('small')
    if (role) role.textContent = player
      ? player.sleeping ? 'Turning in' : player.seat === 'driver' ? 'Driving' : player.seat === 'passenger' ? 'Riding'
        : inSkiff(player.seat) ? 'Afloat' : index === id ? 'You' : 'Online'
      : 'Open'
  })

  updateMission(state)
  const player = connected.find((entry) => entry.id === id)
  if (player) updatePersonalDisplay(state, player, earlier)
  editCrewName.hidden = !player
  if (player) editCrewName.textContent = player.name ? 'Edit name' : 'Set name'
  const [key, action] = player?.charge ? ['', 'Release left click']
    : actionFeedback && performance.now() < actionFeedback.until ? [actionFeedback.key, actionFeedback.label]
    : player ? actionHint(state, player) : ['', '']
  prompt.hidden = !action
  promptKey.hidden = !key
  promptKey.textContent = key
  promptAction.textContent = action
}

function connect() {
  const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:'
  socket = new WebSocket(`${scheme}//${location.host}/play`)
  socket.addEventListener('open', () => send({ type: 'join', token }))
  socket.addEventListener('message', (event: MessageEvent<string>) => {
    const incoming = JSON.parse(event.data) as ServerMessage
    switch (incoming.type) {
      case 'welcome':
        id = incoming.id
        live = true
        respawn.disabled = false
        if (renderer) bootMessage.textContent = 'Restoring your crew and map…'
        send({ type: 'appearance', appearance })
        if (localStorage.getItem(nameKey) !== null) send({ type: 'crew-name', name: crewName.value })
        status.textContent = 'LAN connected'
        light.dataset.online = 'true'
        message = ''
        showNotice()
        break
      case 'state':
        update(incoming)
        if (renderer && document.body.hasAttribute('data-booting')) {
          document.body.removeAttribute('data-booting')
          bootStatus.hidden = true
          sessionStorage.removeItem(reloadKey)
        }
        break
      case 'full':
        message = 'Both crew slots are occupied. Waiting for a slot…'
        bootMessage.textContent = message
        showNotice()
        break
      case 'duplicate':
        token = newToken()
        break
      case 'fishing-result': {
        const [key, label] = feedbackText[incoming.result]
        actionFeedback = { key, label, until: performance.now() + 1900 }
        break
      }
      case 'market-sale':
        actionFeedback = { key: `+${incoming.coins} coins`, label: 'Sold at the market', until: performance.now() + 2100 }
        break
      case 'job-pay': {
        const label = incoming.job === 'crate' ? 'Crate delivered'
          : incoming.job === 'delivery' ? 'Harbor delivery complete' : 'Lookout fire out'
        actionFeedback = { key: `+${incoming.coins} coins`, label, until: performance.now() + 2400 }
        break
      }
    }
  })
  socket.addEventListener('close', () => {
    live = false
    respawn.disabled = true
    sessionStorage.setItem(reloadKey, 'yes')
    actionFeedback = undefined
    chargeMeter.hidden = true
    buyAngler.disabled = true
    keys.clear()
    primary = false
    light.dataset.online = 'false'
    status.textContent = 'Reconnecting'
    message ||= 'Reconnecting to the host. The island may reload when it is ready.'
    bootMessage.textContent = message
    showNotice()
    setTimeout(connect, 1200)
  })
}

function send(message: ClientMessage) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
}

const keyBindings = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown',
  'ArrowRight', 'KeyB', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyF', 'KeyC', 'KeyR', 'Space', 'Digit1', 'Digit2', 'Digit3'])

function aimHeading() {
  return follow ? renderer?.aimHeading() : undefined
}

function equip(item: InventoryItem) {
  if (live && !optionsDialog.open) send({ type: 'equip', item })
}

function sendInput() {
  if (!live) return
  const pressed = (key: string, alias: string) => Number(keys.has(key) || keys.has(alias))
  const x = pressed('KeyD', 'ArrowRight') - pressed('KeyA', 'ArrowLeft')
  const z = pressed('KeyW', 'ArrowUp') - pressed('KeyS', 'ArrowDown')
  const seated = snapshot?.players.some((player) => player.id === id && player.seat)
  const direction = follow && !seated ? renderer?.walkInput(x, z) : undefined
  const shift = keys.has('ShiftLeft') || keys.has('ShiftRight')
  const input: Input = {
    ...(direction ?? { x, z }),
    spray: keys.has('KeyR'),
    aim: aimHeading(),
    careful: shift,
    sprint: shift,
  }
  send({ type: 'input', input })
}

function applyCamera() {
  cameraButton.setAttribute('aria-pressed', String(follow))
  orbitControl.hidden = !follow
  const label = cameraButton.querySelector('span')
  if (label) label.textContent = follow ? 'Island view' : 'Follow crew'
  if (snapshot) renderer?.update(snapshot, id, follow)
}

function toggleCamera() {
  finishPrimary('cancel')
  follow = !follow
  sessionStorage.setItem('mission-island-follow', String(follow))
  applyCamera()
  if (follow) renderer?.captureMouse()
  else renderer?.releaseMouse()
}

function toggleOptions() {
  if (optionsDialog.open) {
    optionsDialog.close()
    return
  }
  renderer?.releaseMouse()
  keys.clear()
  finishPrimary('cancel')
  sendInput()
  optionsDialog.showModal()
}

function saveMouseOptions() {
  localStorage.setItem('mission-island-invert-horizontal', String(invertHorizontal.checked))
  localStorage.setItem('mission-island-invert-vertical', String(invertVertical.checked))
  renderer?.setMouseInversion(invertHorizontal.checked, invertVertical.checked)
}

applyCamera()
window.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  if (optionsDialog.open && event.target === crewName) return
  if (event.code === 'KeyO' && !event.repeat) {
    event.preventDefault()
    toggleOptions()
    return
  }
  if (optionsDialog.open) return
  if (event.code === 'Escape') {
    renderer?.releaseMouse()
    finishPrimary('cancel')
  }
  if (!keyBindings.has(event.code)) return
  if (event.code === 'Space' && event.target instanceof HTMLButtonElement) return
  event.preventDefault()
  keys.add(event.code)
  if (event.repeat) return
  sendInput()
  if (event.code === 'KeyC') toggleCamera()
  else if (follow && live && event.key !== 'Shift') renderer?.captureMouse()
  if (live && event.code === 'KeyB') send({ type: 'buy-seed' })
  if (live && event.code === 'KeyE') send({ type: 'interact' })
  if (live && event.code === 'KeyF') send({ type: 'seat' })
  if (live && event.code === 'Space') send({ type: 'jump' })
  if (event.code.startsWith('Digit')) {
    const slot = starterTools[Number(event.code.slice(-1)) - 1]
    if (slot) equip(slot)
  }
})
window.addEventListener('keyup', (event) => {
  if (keys.delete(event.code)) sendInput()
})
function finishPrimary(phase: 'release' | 'cancel') {
  if (!primary) return
  primary = false
  if (live) send({ type: 'primary', phase, aim: aimHeading() })
}

function beginPrimary(event: MouseEvent) {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || !live || optionsDialog.open || primary) return
  const target = event.target
  const overPlayfield = target instanceof Element && playfield.contains(target) &&
    !target.closest('button, a, input, select, textarea, dialog')
  if (document.pointerLockElement !== canvas && !overPlayfield) return
  primary = true
  sendInput()
  send({ type: 'primary', phase: 'start' })
}
function endPrimary(event: MouseEvent) {
  if (event.button === 0) finishPrimary('release')
}
window.addEventListener('pointerdown', beginPrimary, true)
window.addEventListener('mousedown', beginPrimary, true)
window.addEventListener('pointerup', endPrimary, true)
window.addEventListener('mouseup', endPrimary, true)
window.addEventListener('pointercancel', () => finishPrimary('cancel'))
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas
  if (!locked && wasPointerLocked) finishPrimary('cancel')
  wasPointerLocked = locked
})
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return
  keys.clear()
  finishPrimary('cancel')
  sendInput()
})
window.addEventListener('blur', () => {
  renderer?.releaseMouse()
  keys.clear()
  finishPrimary('cancel')
  sendInput()
})
window.addEventListener('pagehide', () => socket.close())
cameraButton.addEventListener('click', () => {
  toggleCamera()
  cameraButton.blur()
})
optionsButton.addEventListener('click', toggleOptions)
editCrewName.addEventListener('click', () => {
  if (!optionsDialog.open) toggleOptions()
  crewName.focus()
  crewName.select()
})
function saveCrewName() {
  crewName.value = cleanCrewName(crewName.value)
  if ((localStorage.getItem(nameKey) ?? '') === crewName.value) return
  localStorage.setItem(nameKey, crewName.value)
  if (live) send({ type: 'crew-name', name: crewName.value })
}
crewName.addEventListener('change', saveCrewName)
optionsDialog.addEventListener('close', saveCrewName)
invertHorizontal.addEventListener('change', saveMouseOptions)
invertVertical.addEventListener('change', saveMouseOptions)
for (const select of [uniformSelect, skinSelect]) {
  select.addEventListener('change', () => {
    appearance = readAppearance({ uniform: uniformSelect.value, skin: skinSelect.value })
    saveAppearance()
    if (live) send({ type: 'appearance', appearance })
  })
}
buyAngler.addEventListener('click', () => {
  if (live && !ownsAngler && coins >= anglerCost) send({ type: 'buy-angler' })
})
reset.addEventListener('click', () => {
  if (live) send({ type: 'reset' })
  reset.blur()
})
respawn.addEventListener('click', () => {
  if (!live) return
  send({ type: 'respawn' })
  optionsDialog.close()
})
connect()
setInterval(sendInput, 60)

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeFullReload', () => {
    sessionStorage.setItem(reloadKey, 'yes')
    message = 'Reloading the island…'
    showNotice()
  })
  import.meta.hot.accept('./scene', (changed) => {
    const module = changed as typeof import('./scene') | undefined
    if (!module) return
    renderer?.dispose()
    renderer = undefined
    try {
      renderer = module.createRenderer(canvas, markers)
      renderer.setMouseInversion(invertHorizontal.checked, invertVertical.checked)
      if (optionsDialog.open) renderer.releaseMouse()
      if (snapshot) renderer.update(snapshot, id, follow)
    } catch (error) {
      console.error(error)
    }
    showNotice()
  })
}
