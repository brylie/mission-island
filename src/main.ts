import './style.css'
import { boundaryBuoys, buoyBoundaryPoint, coastPoint } from './terrain'
import { actionHint, heldItem, inSkiff } from './actions'
import { readStorage, writeStorage } from './browser-storage'
import { anglerCost, cleanCrewName, defaultAppearance, readAppearance, skinTones, uniforms } from './crew-appearance'
import type { CrewAppearance } from './crew-appearance'
import { createCrewGuide } from './crew-guide-ui'
import { farm, market } from './farm'
import { createJobBoard, jobDescription, secondIslandProgress } from './job-board-ui'
import { activeJob, atJobBoard, deliveryDrop, jobBoard, jobs, secondIslandGoal } from './jobs'
import { starterTools, toolNames } from './inventory'
import type { InventoryItem } from './inventory'
import type { ClientMessage, FishingResult, Input, Player, ServerMessage, Snapshot } from './protocol'
import { footpaths, road, walkways } from './routes'
import { northernRegions, starterDiscoveries } from './scenery'
import { createRenderer } from './scene'
import { bindPlaytestCopy } from './playtest-link'
import { isNight } from './weather'
import { crewHomes, distance, ferryTerminal, harbor, lookout, starterPay } from './world'

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
const boardButton = element<HTMLButtonElement>('open-job-board')
const boardDialog = element<HTMLDialogElement>('job-board-dialog')
const board = createJobBoard(boardDialog, (id) => send({ type: 'take-job', id }))
const guideButton = element<HTMLButtonElement>('open-crew-guide')
const guideDialog = element<HTMLDialogElement>('crew-guide-dialog')
const guide = createCrewGuide(guideDialog, (dismissed) => {
  leadDismissed = dismissed
  writeStorage('localStorage', leadKey(), dismissed ? 'yes' : null)
})
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
invertHorizontal.checked = readStorage('localStorage', 'mission-island-invert-horizontal') !== 'false'
invertVertical.checked = readStorage('localStorage', 'mission-island-invert-vertical') !== 'false'
const prompt = element('prompt')
const promptKey = element('prompt-key')
const promptAction = element('prompt-action')
const map = element<HTMLCanvasElement>('map')
const ink = map.getContext('2d')

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
const crewKey = 'mission-island-crew'
const reloadKey = 'mission-island-reloading'
const savedToken = readStorage('localStorage', crewKey)
let token = readStorage('sessionStorage', crewKey) ?? savedToken ?? newToken()
writeStorage('sessionStorage', crewKey, token)
if (!savedToken) writeStorage('localStorage', crewKey, token)
const leadKey = () => `mission-island-fisher-lead-${token}`
let leadDismissed = readStorage('localStorage', leadKey()) === 'yes'
let editingName: { id: number; token: string; name: string } | undefined
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
  const saved = JSON.parse(readStorage('localStorage', profileKey) ?? '{}') as { appearance?: unknown; milestone?: unknown } | null
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
  writeStorage('localStorage', profileKey, JSON.stringify({ appearance, milestone }))
}

function newToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)),
    (byte) => byte.toString(16).padStart(2, '0')).join('')
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
  }
  for (const region of starterDiscoveries) if (local?.discoveries?.includes(region.id)) {
    dot(region.site.x, region.site.z, '#e4ffe0', 2.25)
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

  for (const { points, surface } of footpaths) {
    if (surface === 'desire') drawRoute(points, .85, '#b5a77e')
    else drawRoute(points, 2, surface === 'pavement' ? '#c4c9c1' : '#a5a77e')
  }
  for (const { points } of walkways) drawRoute(points, 2, '#c4c9c1')
  drawRoute(road, 4, '#c7bb9a')
  const drop = state && deliveryDrop(state)
  if (state?.mission === 'fire') dot(lookout.x, lookout.z, '#f7a17d', 6)
  else if (drop) {
    dot(harbor.x, harbor.z, '#fff0ae', 5)
    dot(drop.x, drop.z, '#acf3da', 5)
  }
  if (!state) return
  ink.fillStyle = '#38433a'
  ink.fillRect(mx(state.truck.x) - 5, mz(state.truck.z) - 4, 10, 8)
  if (state.skiff) dot(state.skiff.x, state.skiff.z, '#fff0ca', 3.5)
  dot(farm.x, farm.z, '#e3ba77', 3.5)
  dot(ferryTerminal.x, ferryTerminal.z, '#d7a07d', 3.5)
  const marketOrder = activeJob(state)?.kind === 'market'
  dot(market.x, market.z, marketOrder ? '#acf3da' : '#f2d3bc', marketOrder ? 6 : 3.5)
  if (state.mission === 'complete' && !state.jobs.active) dot(jobBoard.x, jobBoard.z, '#ffd379', 5.5)
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
  renderer?.dispose()
  renderer = undefined
  console.error(error)
  bootMessage.textContent = renderFailed
}
showNotice()
drawMap()

function deliveryInstruction(state: Snapshot, drop: { x: number; z: number }, quantity: number) {
  const loaded = state.items.filter((item) => item.onBed).length
  const delivered = state.jobs.active?.progress ?? state.items.filter((item) => item.delivered).length
  if (distance(state.truck, drop) < 11) return 'Carry the crates into the teal drop zone. Press E to deliver.'
  if (loaded > 0 && loaded + delivered === quantity) return 'Drive to the teal drop zone. Hold Shift on corners and Space to brake.'
  return loaded > 0 ? `${loaded} in the flatbed. Load or recover the remaining crates.` : 'Pick up crates at Harbor Depot and load the flatbed.'
}

function missionCard(state: Snapshot) {
  const job = activeJob(state)
  const drop = deliveryDrop(state)
  if (drop) {
    const quantity = job?.quantity ?? 3
    const value = state.jobs.active?.progress ?? state.items.filter((item) => item.delivered).length
    return {
      label: job ? 'CREW ORDER' : 'MISSION 01 / 02', title: job?.title ?? 'Harbor delivery',
      detail: job ? jobDescription(job) : 'Bring three supply crates from Harbor Depot to Seabrook.',
      progress: 'Crates delivered', value, max: quantity, text: `${value} / ${quantity} delivered`,
      instruction: deliveryInstruction(state, drop, quantity),
    }
  }
  if (state.mission === 'fire') {
    const value = Math.round((1 - state.fire) * 100)
    return {
      label: 'MISSION 02 / 02', title: 'Forest lookout fire', detail: 'Collect extinguishers at Fire Supplies and head to Forest Lookout.',
      progress: 'Fire extinguished', value, max: 100, text: `${value}% extinguished`, instruction: 'Hold left click near the fire to put it out.',
    }
  }
  if (job?.kind === 'market') {
    const value = state.jobs.active?.progress ?? 0
    return {
      label: 'CREW ORDER', title: job.title, detail: jobDescription(job), progress: 'Goods contributed',
      value, max: job.quantity, text: `${value} / ${job.quantity} ${job.goods}`, instruction: 'Press E at the market awning to contribute.',
    }
  }
  const completed = Math.min(state.jobs.completed, secondIslandGoal)
  return {
    label: 'ISLAND SERVICE', title: 'Choose your next job', detail: 'Visit the job board at Harbor Depot. You can fish, farm, or explore between orders.',
    progress: 'Second island progress', value: completed, max: secondIslandGoal,
    text: `${completed} / ${secondIslandGoal}`,
    instruction: completed === secondIslandGoal ? secondIslandProgress(completed) : 'Complete orders to prepare for the second island.',
  }
}

function updateMission(state: Snapshot) {
  const reached = state.mission === 'complete' ? 2 : state.mission === 'fire' ? 1 : 0
  if (live && reached > milestone) {
    milestone = reached
    renderAppearanceOptions()
    saveAppearance()
  }
  const card = missionCard(state)
  missionLabel.textContent = card.label
  missionTitle.textContent = card.title
  missionDescription.textContent = card.detail
  progress.setAttribute('aria-label', card.progress)
  progress.setAttribute('aria-valuemax', String(card.max))
  progress.setAttribute('aria-valuenow', String(card.value))
  progressLabel.textContent = card.text
  const count = card.max === 100 ? 3 : card.max
  segments.forEach((segment, index) => {
    segment.toggleAttribute('hidden', index >= count)
    segment.classList.toggle('active', card.value >= (index + 1) * card.max / count)
  })
  boardButton.hidden = state.mission !== 'complete'
  spray.hidden = state.mission !== 'fire'
  if (missionStep.textContent !== card.instruction) missionStep.textContent = card.instruction
}

function updatePersonalDisplay(state: Snapshot, player: Player, earlier: Player | undefined) {
  if (earlier) {
    const found = starterDiscoveries.find(({ id }) => player.discoveries.includes(id) && !earlier.discoveries?.includes(id))
    if (found) actionFeedback = { key: '', label: `Discovered ${found.name}`, until: performance.now() + 4200 }
  }
  if (Boolean(player.ownsAngler) !== ownsAngler) {
    ownsAngler = Boolean(player.ownsAngler)
    renderAppearanceOptions()
  }
  coins = state.crewCoins
  const balance = `Crew bank · ${coins} ${coins === 1 ? 'coin' : 'coins'}`
  if (coinBalance.textContent !== balance) coinBalance.textContent = balance
  const { fish, carrots } = player.goods
  const contents = [balance, `${player.seeds} ${player.seeds === 1 ? 'seed' : 'seeds'}`,
    fish ? `${fish} fish` : '', carrots ? `${carrots} ${carrots === 1 ? 'carrot' : 'carrots'}` : '']
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
  if (player) {
    updatePersonalDisplay(state, player, earlier)
    guide.update(state, player)
  }
  guideButton.disabled = !player
  updateBoard(state, player)
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
      case 'fisher-chat':
        openGuide(true)
        break
      case 'order-pay':
        actionFeedback = { key: `+${incoming.coins} coins`, label: `${jobs[incoming.id].title} complete · Crew bank`, until: performance.now() + 3200 }
        break
      case 'starter-seed':
        actionFeedback = { key: '+1 seed', label: 'Plant it at Island Farm', until: performance.now() + 3200 }
        break
      case 'order-unavailable':
        board.reject()
        if (snapshot) updateBoard(snapshot)
        break
    }
  })
  socket.addEventListener('close', () => {
    live = false
    respawn.disabled = true
    writeStorage('sessionStorage', reloadKey, 'yes')
    actionFeedback = undefined
    chargeMeter.hidden = true
    buyAngler.disabled = true
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
  return optionsDialog.open || boardDialog.open || guideDialog.open
}

function openGuide(talking = false) {
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
}

function saveMouseOptions() {
  writeStorage('localStorage', 'mission-island-invert-horizontal', String(invertHorizontal.checked))
  writeStorage('localStorage', 'mission-island-invert-vertical', String(invertVertical.checked))
  renderer?.setMouseInversion(invertHorizontal.checked, invertVertical.checked)
}

applyCamera()
window.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  if (boardDialog.open || guideDialog.open) return
  if (optionsDialog.open && event.target === crewName) return
  if (event.code === 'KeyO' && !event.repeat) {
    event.preventDefault()
    toggleOptions()
    return
  }
  if (optionsDialog.open) return
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
    const state = snapshot
    const player = state?.players.find((entry) => entry.id === id)
    if (state?.mission === 'complete' && !state.jobs.active && player && atJobBoard(player) && !heldItem(state, player)) openJobBoard()
    else send({ type: 'interact' })
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
  if (event.ctrlKey || event.metaKey || !live || modalOpen() || !overGameplay(event.target)) return
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
bindPlaytestCopy(() => renderer?.playtestLink())
optionsButton.addEventListener('click', toggleOptions)
editCrewName.addEventListener('click', () => {
  if (!optionsDialog.open) toggleOptions()
  crewName.focus()
  crewName.select()
})
function saveCrewName() {
  const original = editingName
  editingName = undefined
  const name = cleanCrewName(crewName.value)
  if (live && original?.token === token && original.id === id && name !== original.name) send({ type: 'crew-name', name })
}
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
      renderer.setMouseInversion(invertHorizontal.checked, invertVertical.checked)
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
