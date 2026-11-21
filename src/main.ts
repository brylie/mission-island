import { bindCheckpointControls } from './live-checkpoint-ui'
import './style.css'
import { drawIslandMap } from './island-map'
import { actionHint, atClothingCounter, heldItem, inSkiff, interactRequest } from './actions'
import { createRidgeHud, flightInput, ridgeActionHint } from './ridge-ui'
import { readStorage, writeStorage } from './browser-storage'
import { cleanCrewName } from './crew-appearance'
import { createCrewGuide } from './crew-guide-ui'
import { farmFeedback } from './farm-order-ui'
import { createMissionHud } from './mission-ui'
import { materialsFeedback, repairMaterials } from './materials-work'
import { bindControlsToggle } from './controls-toggle-ui'
import { bindLookOptions } from './look-options-ui'
import { createReticleFocus } from './reticle-ui'
import { gateStepText } from './gate-repair'
import { favorFeedback } from './resident-notices'
import { createJobBoard } from './job-board-ui'
import { atJobBoard, jobs } from './jobs'
import { starterTools, toolNames } from './inventory'
import type { InventoryItem } from './inventory'
import type { ClientMessage, FishingResult, Input, Player, ServerMessage, Snapshot } from './protocol'
import { starterDiscoveries } from './scenery'
import { createRenderer } from './scene'
import { bindLanInvite } from './lan-invite'
import { bindPlaytestCopy } from './playtest-link'
import { isNight } from './weather'
import { createClothingCounter, createWardrobe } from './wardrobe-ui'
import { starterPay } from './world'

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
const boardButton = element<HTMLButtonElement>('open-job-board')
const boardDialog = element<HTMLDialogElement>('job-board-dialog')
const board = createJobBoard(boardDialog, (id) => send({ type: 'take-job', id }))
const guideButton = element<HTMLButtonElement>('open-crew-guide')
const guideDialog = element<HTMLDialogElement>('crew-guide-dialog')
const guide = createCrewGuide(guideDialog, (dismissed) => {
  leadDismissed = dismissed
  writeStorage('localStorage', leadKey(), dismissed ? 'yes' : null)
}, (action, subject) => send({ type: 'interact', choice: { action, subject } }))
const respawn = element<HTMLButtonElement>('respawn')
bindControlsToggle(element<HTMLButtonElement>('controls-toggle'), element('game-controls'))
const spray = element('spray-control')
const updateMission = createMissionHud(element, boardButton, spray)
const cameraButton = element<HTMLButtonElement>('camera')
const orbitControl = element('orbit-control')
const optionsButton = element<HTMLButtonElement>('options-button')
const optionsDialog = element<HTMLDialogElement>('options-dialog')
const crewName = element<HTMLInputElement>('crew-name')
const joinNameDialog = element<HTMLDialogElement>('join-name-dialog')
const joinName = element<HTMLInputElement>('join-name')
const editCrewName = element<HTMLButtonElement>('edit-crew-name')
const lookSettings = bindLookOptions((settings) => renderer?.setLook(settings))
const reticle = createReticleFocus(playfield, document.querySelector('.reticle'))
const openWardrobe = element<HTMLButtonElement>('open-wardrobe')
const wardrobeDialog = element<HTMLDialogElement>('wardrobe-dialog')
const counterDialog = element<HTMLDialogElement>('clothing-counter-dialog')
const wardrobe = createWardrobe(wardrobeDialog, appearance => send({ type: 'appearance', appearance }))
const counter = createClothingCounter(counterDialog, item => send({ type: 'buy-clothing', item }))
const fishingWallet = element('fishing-wallet')
const toolSlots = element('tool-slots')
const chargeMeter = element('charge-meter')
const chargeLabel = element('charge-label')
const chargePower = element<HTMLProgressElement>('charge-power')
const prompt = element('prompt')
const promptKey = element('prompt-key')
const promptAction = element('prompt-action')
const ridgeHud = createRidgeHud(element('ridge-hud'))
const map = element<HTMLCanvasElement>('map')

let renderer: ReturnType<typeof createRenderer> | undefined
let socket: WebSocket | undefined
let id = -1
let live = false
let message = ''
let snapshot: Snapshot | undefined
let follow = readStorage('sessionStorage', 'mission-island-follow') !== 'false'
const keys = new Set<string>()
let primary = false
let rightButtonHeld = false
let wasPointerLocked = false
const crewKey = import.meta.env.MODE === 'playtest' ? 'mission-playtest-crew' : 'mission-island-crew'
const reloadKey = 'mission-island-reloading'
const savedToken = readStorage('localStorage', crewKey)
let token = readStorage('sessionStorage', crewKey) ?? savedToken ?? newToken()
writeStorage('sessionStorage', crewKey, token)
if (!savedToken) writeStorage('localStorage', crewKey, token)
const leadKey = () => `mission-island-fisher-lead-${token}`
let leadDismissed = readStorage('localStorage', leadKey()) === 'yes'
const skipNameKey = () => `mission-island-skip-name-${token}`
const checkpointControls = bindCheckpointControls(optionsDialog, () => token)
let offerJoinName = false
let editingName: { id: number; token: string; name: string } | undefined
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
function newToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)),
    (byte) => byte.toString(16).padStart(2, '0')).join('')
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
  renderer.setLook(lookSettings())
  bootMessage.textContent = 'Connecting to the host…'
} catch (error) {
  renderer?.dispose()
  renderer = undefined
  console.error(error)
  bootMessage.textContent = renderFailed
}
showNotice()
drawIslandMap(map, id)

function updatePersonalDisplay(state: Snapshot, player: Player, earlier: Player | undefined) {
  if (earlier) {
    const found = starterDiscoveries.find(({ id }) => player.discoveries.includes(id) && !earlier.discoveries?.includes(id))
    if (found) actionFeedback = { key: '', label: `Discovered ${found.name}`, until: performance.now() + 4200 }
  }
  wardrobe.update(state, player)
  if (counterDialog.open) counter.update(state, player, atClothingCounter(player) && !heldItem(state, player))
  const coins = state.crewCoins
  const balance = `Crew bank · ${coins} ${coins === 1 ? 'coin' : 'coins'}`
  const { fish, carrots } = player.goods
  const materials = repairMaterials.flatMap((material) => {
    const quantity = player.materials?.[material]
    return quantity ? [`${quantity} ${material}`] : []
  })
  const contents = [balance, player.deliveryXp ? player.deliveryXp + ' driver XP' : '', `${player.seeds} ${player.seeds === 1 ? 'seed' : 'seeds'}`,
    fish ? `${fish} fish` : '', carrots ? `${carrots} ${carrots === 1 ? 'carrot' : 'carrots'}` : '', ...materials]
    .filter(Boolean).join(' · ')
  if (fishingWallet.textContent !== contents) fishingWallet.textContent = contents
  fishingWallet.hidden = false
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
}

function update(state: Snapshot) {
  const earlier = snapshot?.players.find((player) => player.id === id)
  const previousHour = snapshot?.weather.hour
  if (snapshot?.aviation.flight?.pilotId === id && state.aviation.flight?.pilotId !== id) keys.clear()
  snapshot = state
  checkpointControls.update(state.playtest)
  const hours = Math.floor(state.weather.hour)
  const minutes = Math.floor((state.weather.hour - hours) * 60)
  clock.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} · ${state.weather.rain > 0.3 ? 'Rain' : isNight(hours) ? 'Night' : 'Daylight'}`
  if (previousHour !== undefined && isNight(previousHour) && !isNight(hours) && Math.abs(previousHour - hours) > 2) {
    actionFeedback = { key: '', label: 'Morning on the island', until: performance.now() + 2400 }
  }
  renderer?.update(state, id, follow)
  drawIslandMap(map, id, state)
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

  updateMission(state, id)
  const player = connected.find((entry) => entry.id === id)
  ridgeHud.update(state, player)
  if (player) {
    updatePersonalDisplay(state, player, earlier)
    guide.update(state, player)
    if (!state.playtest && offerJoinName && !renderer?.isReviewing() && !document.body.hasAttribute('data-booting') && !modalOpen()) {
      offerJoinName = false
      if (!player.name) {
        pauseControls()
        joinName.value = ''
        joinName.setCustomValidity('')
        joinName.placeholder = `Crew ${player.id + 1}`
        joinNameDialog.showModal()
      }
    }
  }
  guideButton.disabled = !player
  openWardrobe.disabled = !player
  updateBoard(state, player)
  editCrewName.hidden = !player
  if (player) editCrewName.textContent = player.name ? 'Edit name' : 'Set name'
  // Refresh the reticle every update, even while feedback holds the prompt, so E never sends a stale target.
  const focus = reticle.update(state, player, renderer?.aimRay())
  renderer?.pinTip(reticle.tip, focus?.at)
  const ridgeHint = player && ridgeActionHint(state, player)
  const [key, action] = ridgeHint ?? (player?.charge ? ['', 'Release left click']
    : actionFeedback && performance.now() < actionFeedback.until ? [actionFeedback.key, actionFeedback.label]
    : player ? actionHint(state, player, focus) : ['', ''])
  const waiting = checkpointControls.waitingPrompt(state.playtest)
  prompt.hidden = !action && !waiting
  promptKey.hidden = !key || Boolean(waiting)
  promptKey.textContent = key
  promptAction.textContent = waiting ?? action
}

function connect() {
  const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:'
  socket = new WebSocket(`${scheme}//${location.host}/play`)
  socket.addEventListener('open', () => send({ type: 'join', token }))
  socket.addEventListener('message', (event: MessageEvent<string>) => {
    const incoming = JSON.parse(event.data) as ServerMessage
    switch (incoming.type) {
      case 'welcome':
        if (incoming.scenarios) checkpointControls.setCatalog(incoming.scenarios)
        offerJoinName = readStorage('localStorage', skipNameKey()) !== 'yes'
        id = incoming.id
        live = true
        respawn.disabled = false
        if (renderer) bootMessage.textContent = 'Restoring your crew and map…'
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
          writeStorage('sessionStorage', reloadKey, null)
        }
        break
      case 'full':
        message = 'Both crew slots are occupied. Waiting for a slot…'
        bootMessage.textContent = message
        showNotice()
        break
      case 'duplicate':
        token = newToken()
        writeStorage('sessionStorage', crewKey, token)
        leadDismissed = readStorage('localStorage', leadKey()) === 'yes'
        break
      case 'fishing-result': {
        const [key, label] = feedbackText[incoming.result]
        actionFeedback = { key, label, until: performance.now() + 1900 }
        break
      }
      case 'farm-pay': case 'barrow-returned':
        actionFeedback = { ...farmFeedback(incoming), until: performance.now() + 4200 }
        break
      case 'market-sale':
        actionFeedback = { key: `+${incoming.coins} coins`, label: 'Market sale · Crew bank', until: performance.now() + 2100 }
        break
      case 'job-pay': {
        actionFeedback = { key: `+${incoming.coins} coins`, label: `${starterPay[incoming.job].label} · Crew bank`,
          until: performance.now() + 3200 }
        break
      }
      case 'crew-note':
        openGuide()
        break
      case 'resident-chat':
        openGuide(incoming.resident)
        break
      case 'favor-accepted': case 'favor-report': case 'favor-pay':
        actionFeedback = { ...favorFeedback(incoming, id), until: performance.now() + 4200 }
        break
      case 'gate-step':
        actionFeedback = { key: '', label: gateStepText[incoming.step], until: performance.now() + 3200 }
        break
      case 'materials-step':
        actionFeedback = { key: '', label: materialsFeedback(incoming), until: performance.now() + 4800 }
        break
      case 'open-wardrobe':
      case 'open-clothing-counter':
        openClothing(incoming.type === 'open-wardrobe')
        break
      case 'clothing-purchase':
        if (counterDialog.open) counter.result(incoming.item, incoming.result)
        break
      case 'order-pay':
        actionFeedback = { key: `+${incoming.coins} coins`, label: `${jobs[incoming.id].title} complete · Crew bank`, until: performance.now() + 3200 }
        break
      case 'starter-seed':
        actionFeedback = { key: '+1 seed', label: 'Plant it at Island Farm', until: performance.now() + 3200 }
        break
      case 'flight-result': case 'aerial-sighting':
        ridgeHud.receive(incoming)
        break
      case 'order-unavailable':
        board.reject()
        if (snapshot) updateBoard(snapshot)
        break
    }
  })
  socket.addEventListener('close', () => {
    live = false
    offerJoinName = false
    if (joinNameDialog.open) joinNameDialog.close()
    if (wardrobeDialog.open) wardrobeDialog.close()
    if (counterDialog.open) counterDialog.close()
    respawn.disabled = true
    writeStorage('sessionStorage', reloadKey, 'yes')
    actionFeedback = undefined
    chargeMeter.hidden = true
    openWardrobe.disabled = true
    keys.clear()
    primary = false
    rightButtonHeld = false
    light.dataset.online = 'false'
    status.textContent = 'Reconnecting'
    message ||= 'Reconnecting to the host. The island may reload when it is ready.'
    bootMessage.textContent = message
    showNotice()
    board.reject()
    if (snapshot) updateBoard(snapshot)
    setTimeout(connect, 1200)
  })
}

function send(message: ClientMessage) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
}

const keyBindings = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown',
  'ArrowRight', 'KeyB', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyF', 'KeyC', 'KeyR', 'Space', 'Digit1', 'Digit2', 'Digit3'])

function aimHeading() {
  return follow ? renderer?.aimHeading() : undefined
}

function equip(item: InventoryItem) {
  if (live && !modalOpen()) send({ type: 'equip', item })
}

function sendInput() {
  if (!live) return
  const pressed = (key: string, alias: string) => Number(keys.has(key) || keys.has(alias))
  const x = pressed('KeyD', 'ArrowRight') - pressed('KeyA', 'ArrowLeft')
  const z = pressed('KeyW', 'ArrowUp') - pressed('KeyS', 'ArrowDown')
  if (snapshot?.aviation.flight?.pilotId === id) {
    send({ type: 'input', input: flightInput(x, z) })
    return
  }
  const seat = snapshot?.players.find((player) => player.id === id)?.seat
  const direction = follow && !seat ? renderer?.walkInput(x, z) : undefined
  const shift = keys.has('ShiftLeft') || keys.has('ShiftRight')
  const input: Input = {
    ...(direction ?? { x, z }),
    spray: keys.has('KeyR'),
    aim: aimHeading(),
    careful: shift,
    sprint: shift,
    brake: seat === 'driver' && keys.has('Space'),
    raiseRightHand: rightButtonHeld,
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
  cancelMouseActions()
  follow = !follow
  writeStorage('sessionStorage', 'mission-island-follow', String(follow))
  applyCamera()
  if (follow) renderer?.captureMouse()
  else renderer?.releaseMouse()
}

function pauseControls() {
  renderer?.releaseMouse()
  keys.clear()
  cancelMouseActions()
  sendInput()
}

function updateBoard(state: Snapshot, player = state.players.find((entry) => entry.id === id)) {
  board.update(state.jobs, Boolean(player && atJobBoard(player) && !player.sleeping && !heldItem(state, player)), live)
}

function openJobBoard() {
  if (!snapshot || snapshot.mission !== 'complete' || modalOpen()) return
  pauseControls()
  boardDialog.showModal()
  updateBoard(snapshot)
}

function modalOpen() {
  return optionsDialog.open || boardDialog.open || guideDialog.open || joinNameDialog.open ||
    wardrobeDialog.open || counterDialog.open
}

function openClothing(fromWardrobe: boolean) {
  if (!live || !snapshot || modalOpen()) return
  const player = snapshot.players.find(entry => entry.id === id)
  if (!player) return
  pauseControls()
  if (fromWardrobe) wardrobe.open(snapshot, player)
  else counter.open(snapshot, player, atClothingCounter(player) && !heldItem(snapshot, player))
}

function openGuide(talking: string | false = false) {
  if (!snapshot || modalOpen()) return
  const player = snapshot.players.find((entry) => entry.id === id)
  if (!player) return
  pauseControls()
  guide.open(snapshot, player, talking, leadDismissed)
}

function toggleOptions() {
  if (optionsDialog.open) {
    optionsDialog.close()
    return
  }
  if (modalOpen()) return
  pauseControls()
  const player = live ? snapshot?.players.find((entry) => entry.id === id) : undefined
  editingName = player && { id: player.id, token, name: player.name }
  crewName.value = editingName?.name ?? ''
  element('playtest-tools').hidden = !renderer?.playtestLink()
  optionsDialog.showModal()
  void refreshLanInvite()
}

function blocksGameKeys() {
  return optionsDialog.open || renderer?.isReviewing()
}

applyCamera()
window.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  if (modalOpen() && (!optionsDialog.open || event.target === crewName)) return
  if (event.code === 'KeyO' && !event.repeat) {
    event.preventDefault()
    toggleOptions()
    return
  }
  if (blocksGameKeys()) return
  if (event.code === 'Escape') {
    renderer?.releaseMouse()
    cancelMouseActions()
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
  if (live && event.code === 'KeyE') {
    const player = snapshot?.players.find((entry) => entry.id === id)
    const request = snapshot && player ? interactRequest(snapshot, player, reticle.focus()) : { type: 'interact' as const }
    if (request === 'open-job-board') openJobBoard()
    else send(request)
  }
  if (live && event.code === 'KeyF') send({ type: 'seat' })
  if (live && event.code === 'Space' && !snapshot?.players.find((player) => player.id === id)?.seat) send({ type: 'jump' })
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

function setRightButton(held: boolean) {
  if (rightButtonHeld === held) return
  rightButtonHeld = held
  sendInput()
}

function cancelMouseActions() {
  finishPrimary('cancel')
  setRightButton(false)
}

function overGameplay(target: EventTarget | null) {
  return document.pointerLockElement === canvas || (target instanceof Element && playfield.contains(target) &&
    !target.closest('button, a, input, select, textarea, dialog'))
}

function beginMouseAction(event: MouseEvent) {
  if (event.ctrlKey || event.metaKey || !live || renderer?.isReviewing() || modalOpen() || !overGameplay(event.target)) return
  if (event.button === 2) {
    setRightButton(true)
    return
  }
  if (event.button !== 0 || primary) return
  primary = true
  sendInput()
  send({ type: 'primary', phase: 'start' })
}
function endMouseAction(event: MouseEvent) {
  if (event.button === 0) finishPrimary('release')
  if (event.button === 2) setRightButton(false)
}
window.addEventListener('pointerdown', beginMouseAction, true)
window.addEventListener('mousedown', beginMouseAction, true)
window.addEventListener('pointerup', endMouseAction, true)
window.addEventListener('mouseup', endMouseAction, true)
window.addEventListener('pointercancel', cancelMouseActions)
window.addEventListener('contextmenu', (event) => {
  if (overGameplay(event.target)) event.preventDefault()
})
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas
  if (!locked && wasPointerLocked) cancelMouseActions()
  wasPointerLocked = locked
})
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return
  keys.clear()
  cancelMouseActions()
  sendInput()
})
window.addEventListener('blur', () => {
  pauseControls()
})
window.addEventListener('pagehide', () => socket?.close())
cameraButton.addEventListener('click', () => {
  toggleCamera()
  cameraButton.blur()
})
const refreshLanInvite = bindLanInvite(optionsDialog)
bindPlaytestCopy(() => renderer?.playtestLink())
optionsButton.addEventListener('click', toggleOptions)
editCrewName.addEventListener('click', () => {
  if (!optionsDialog.open) toggleOptions()
  crewName.focus()
  crewName.select()
})
joinName.addEventListener('input', () => joinName.setCustomValidity(''))
element('join-name-form').addEventListener('submit', (event) => {
  const name = cleanCrewName(joinName.value)
  if (!name) {
    event.preventDefault()
    joinName.setCustomValidity('Enter a game name or choose Skip for now.')
    joinName.reportValidity()
    return
  }
  if (live) send({ type: 'crew-name', name })
})
function skipJoinName() {
  writeStorage('localStorage', skipNameKey(), 'yes')
}
joinNameDialog.addEventListener('cancel', skipJoinName)
element('skip-join-name').addEventListener('click', () => {
  skipJoinName()
  joinNameDialog.close()
})
function saveCrewName() {
  const original = editingName
  editingName = undefined
  const name = cleanCrewName(crewName.value)
  if (live && original?.token === token && original.id === id && name !== original.name) send({ type: 'crew-name', name })
}
optionsDialog.addEventListener('submit', saveCrewName)
optionsDialog.addEventListener('close', saveCrewName)
openWardrobe.addEventListener('click', () => {
  optionsDialog.close()
  openClothing(true)
})
boardButton.addEventListener('click', openJobBoard)
guideButton.addEventListener('click', () => openGuide())
respawn.addEventListener('click', () => {
  if (!live) return
  send({ type: 'respawn' })
  optionsDialog.close()
})
if (renderer) connect()
setInterval(sendInput, 60)

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeFullReload', () => {
    writeStorage('sessionStorage', reloadKey, 'yes')
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
      renderer.setLook(lookSettings())
      if (modalOpen()) renderer.releaseMouse()
      if (snapshot) renderer.update(snapshot, id, follow)
      if (!socket) {
        bootMessage.textContent = 'Connecting to the host…'
        connect()
      }
    } catch (error) {
      console.error(error)
    }
    showNotice()
  })
}
