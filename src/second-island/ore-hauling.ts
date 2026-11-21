import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { readStorage, writeStorage } from '../browser-storage'
import { distance, offset, type Point, type Pose } from '../world'
import { atFreightBay, dispatchBay, haulerUnlockXp, hopperBay, isFreightTicket, oreContracts, oreNames } from '../ore-contracts'
import type { DriverStatus, FreightAction, Ore } from '../ore-contracts'
import { haulerPose, stepHauler } from './haul-drive'
import { createOreLoad } from './quarry-art'
import { vehiclePlacement } from './scenery'
import { surfaceHeight } from './terrain'
import { createSaltwindVehicle } from './vehicles'
import { placeWalker, type ScenerySolids } from './walking'

function createBayMarkers(meshes: MeshFactory) {
  const marker = new TransformNode('Freight bay markers', meshes.scene)
  for (const side of [-1, 1]) {
    const x = side * 3.6
    meshes.box(x, .04, 0, .55, .08, .55, '#444e46', marker)
    meshes.cylinder(x, .30, 0, .08, .39, .53, 8, '#de853f', marker)
    meshes.cylinder(x, .33, 0, .17, .23, .10, 8, '#fff1cc', marker)
  }
  return marker
}

function parkedSpot(parkingKey: string, data: DriverStatus) {
  const saved = readStorage('sessionStorage', parkingKey)
  let spot: unknown
  try { spot = JSON.parse(saved ?? 'null') } catch { /* Use the quarry bay. */ }
  if (Array.isArray(spot) && spot.length === 4 && spot.every(Number.isFinite) && spot[0] === data.ticket.revision &&
    Math.abs(Number(spot[1])) <= 560 && Math.abs(Number(spot[2])) <= 430) {
    return { x: Number(spot[1]), z: Number(spot[2]), heading: Number(spot[3]) }
  }
  return data.ticket.loaded ? hopperBay : dispatchBay
}

async function dispatchRequest(token: string | null, command?: FreightAction) {
  const response = await fetch('/api/slatecliff-freight', {
    method: command ? 'POST' : 'GET', headers: token ? { Authorization: 'Bearer ' + token } : {},
    body: command && JSON.stringify(command), signal: AbortSignal.timeout(6000),
  })
  const data: unknown = await response.json()
  if (!data || typeof data !== 'object' || !('xp' in data) || typeof data.xp !== 'number' ||
    !('ticket' in data) || !isFreightTicket(data.ticket)) throw new Error()
  return { data: { xp: data.xp, ticket: data.ticket }, ok: response.ok,
    error: 'error' in data && typeof data.error === 'string' ? data.error : undefined }
}

function freightChoices(select: HTMLSelectElement, mode: string) {
  select.replaceChildren()
  if (mode === 'contract') for (const o of oreContracts) select.add(new Option(oreNames[o.ore] + ' · ' + o.buyer.name, o.id))
  if (mode === 'ore') for (const [id, name] of Object.entries(oreNames)) select.add(new Option(name, id))
}

function directionTo(from: Point, to: Point) {
  const bearing = Math.atan2(to.x - from.x, to.z - from.z)
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][(Math.round(bearing / (Math.PI / 4)) + 8) % 8]
}

function exitPoint(pose: Pose, solids: ScenerySolids) {
  return [-2.2, 2.2, -3.1, 3.1].map(x => placeWalker(offset(pose, x, 2.2)))
    .find(p => !p.swimming && !solids.at(p.x, p.z, .3).some(b => b.top > p.y + .3 && b.bottom < p.y + 1.8))
}

function bindDispatchControls(select: HTMLSelectElement, action: HTMLButtonElement, submit: () => void) {
  action.onclick = submit
  select.onkeydown = event => {
    if (event.key.toLowerCase() !== 'e' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
    event.preventDefault()
    event.stopPropagation()
    submit()
  }
}

export function createOreHauling(meshes: MeshFactory, solids: ScenerySolids, walker: ReturnType<typeof placeWalker>,
  changeSeat: (driving: boolean, heading: number) => void) {
  const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
  const panel = get('freight'), hint = get('freight-hint'), receipt = get('freight-receipt')
  const select = get<HTMLSelectElement>('freight-choice'), action = get<HTMLButtonElement>('freight-action')
  const seat = get<HTMLButtonElement>('freight-seat')
  const truck = createSaltwindVehicle(meshes, 'hauler')
  const loads = new Map<Ore, ReturnType<typeof createOreLoad>>()
  const marker = createBayMarkers(meshes)
  const pose = { ...dispatchBay, heading: vehiclePlacement('hauler').heading, speed: 0 }
  const driverToken = () => readStorage('sessionStorage', 'mission-island-crew') ?? readStorage('localStorage', 'mission-island-crew')
  let token = driverToken()
  const parkingKey = () => 'slatecliff-parking-' + token
  function saveParking() {
    if (token && status) writeStorage('sessionStorage', parkingKey(), JSON.stringify([status.ticket.revision, pose.x, pose.z, pose.heading]))
  }
  window.addEventListener('pagehide', saveParking)
  function placeTruck() {
    const ground = haulerPose(pose)
    truck.position.set(pose.x, ground.y, pose.z)
    truck.rotation.set(ground.pitch, pose.heading, ground.roll)
    solids.parkedVehicle = driving ? undefined : { ...pose, bottom: ground.y + .25, top: ground.y + 2.65, width: 2.55, depth: 8.8 }
    if (driving) Object.assign(walker, { x: pose.x, z: pose.z, y: ground.y, swimming: false, grounded: true, velocity: 0 })
  }
  let status: DriverStatus | undefined, busy = false, driving = false, enabled = true
  let mode = '', refreshAt = 0, nearby = false, nextDraw = 0
  const qualified = () => (status?.xp ?? 0) >= haulerUnlockXp
  const order = () => oreContracts.find(o => o.id === status?.ticket.contract)
  function destination() {
    const job = order()
    return job ? status?.ticket.loaded ? job.buyer : hopperBay : dispatchBay
  }
  function target(): Point | undefined {
    return driving ? destination() : (order() || nearby || qualified()) ? pose : undefined
  }
  function showLoad() {
    const ore = status?.ticket.loaded ? order()?.ore : undefined
    if (ore && !loads.has(ore)) loads.set(ore, createOreLoad(meshes, truck, ore))
    for (const [id, mesh] of loads) mesh.setEnabled(ore === id)
  }
  async function request(command?: FreightAction) {
    if (busy) return
    busy = true
    const previous = order()
    try {
      token ??= driverToken()
      const { data, ok, error } = await dispatchRequest(token, command)
      if (!status) { Object.assign(pose, parkedSpot(parkingKey(), data)); placeTruck() }
      status = data
      if (command && ok) saveParking()
      showLoad()
      if (command) receipt.textContent = error ?? (command.action === 'deliver' && previous
        ? previous.buyer.name + ' signed for the load. +' + previous.coins + ' crew coins.'
        : command.action === 'load' ? 'Weighed and loaded. Your ticket is ready for the buyer.' : 'Dispatch ticket issued.')
      else if (!ok) throw new Error()
      else if (receipt.dataset.offline) receipt.textContent = ''
      delete receipt.dataset.offline
    } catch {
      receipt.dataset.offline = 'true'
      receipt.textContent = 'Dispatch radio offline. Reconnecting…'
    } finally { busy = false; refreshAt = performance.now() + (receipt.dataset.offline ? 3000 : 15000); render() }
  }
  function toggleSeat() {
    if (!enabled || busy || !qualified() || Math.abs(pose.speed) > .15) return
    if (driving) {
      const exit = exitPoint(pose, solids)
      if (!exit) { receipt.textContent = 'Pull forward to give the cab door room.'; return }
      Object.assign(walker, exit)
    } else if (distance(walker, pose) > 6) return
    driving = !driving
    pose.speed = 0
    placeTruck()
    changeSeat(driving, pose.heading)
    render()
  }
  function interact() {
    if (!enabled || panel.hidden) return false
    if (!driving) { if (distance(walker, pose) > 6) return false; toggleSeat(); return true }
    if (!busy && status && atFreightBay(pose, destination()) && Math.abs(pose.speed) <= .15) {
      const job = order()
      void request({ action: !job ? 'accept' : status.ticket.loaded ? 'deliver' : 'load',
        x: pose.x, z: pose.z, choice: select.value, revision: status.ticket.revision })
    }
    return true
  }
  function instructions(range: number, braking: boolean) {
    if (!driving) {
      if (!status) return 'Contacting dispatch…'
      if (status.xp < haulerUnlockXp) return status.xp + '/' + haulerUnlockXp + ' driver XP. Drive loaded crates on Starter Island and deliver them to qualify.'
      return 'Ore truck unlocked · ' + range + ' m to the cab.'
    }
    const offer = oreContracts.find(o => o.id === select.value)
    if (mode === 'contract' && offer) return offer.purpose + ' · ' + offer.coins + ' coins.'
    const job = order()
    const label = job ? oreNames[job.ore] + ' · ' + (status?.ticket.loaded ? job.buyer.name : 'Slatecliff hopper') : 'Slatecliff dispatch bay'
    return label + ' · ' + range + ' m' + (range > 4 ? ' ' + directionTo(pose, destination()) : '') + (braking ? ' · Brake to park.' : '')
  }
  function render() {
    const job = order(), loaded = Boolean(status?.ticket.loaded)
    const stopped = Math.abs(pose.speed) <= .15, bay = destination(), parked = atFreightBay(pose, bay)
    const nextMode = !driving || !parked ? '' : !job ? 'contract' : loaded ? '' : 'ore'
    if (mode !== nextMode) { mode = nextMode; freightChoices(select, mode) }
    const range = Math.round(distance(driving ? pose : walker, driving ? bay : pose))
    const text = instructions(range, parked && !stopped)
    if (hint.textContent !== text) hint.textContent = text
    select.hidden = !mode
    select.disabled = busy
    action.hidden = !driving || !parked
    action.disabled = busy || !stopped
    action.textContent = !job ? 'Accept contract (E)' : loaded ? 'Unload (E)' : 'Load selected ore (E)'
    seat.hidden = !driving && (!qualified() || distance(walker, pose) > 6)
    seat.disabled = busy || !stopped
    seat.textContent = driving ? 'Leave cab (F)' : 'Board truck (F)'
    panel.hidden = !enabled || !(driving || nearby || job)
    marker.setEnabled(enabled && driving)
    if (driving) marker.position.set(bay.x, surfaceHeight(bay.x, bay.z), bay.z)
  }
  select.onchange = render
  bindDispatchControls(select, action, () => { interact(); get('island').focus() })
  seat.onclick = toggleSeat
  placeTruck()
  render()
  return {
    target, interact, toggleSeat, get driving() { return driving },
    drive(keys: Set<string>, dt: number) {
      const key = (a: string, b: string) => Number(keys.has(a) || keys.has(b))
      stepHauler(pose, key('w', 'arrowup') - key('s', 'arrowdown'), key('d', 'arrowright') - key('a', 'arrowleft'),
        keys.has(' ') || busy && pose.speed === 0, dt, solids, Boolean(status?.ticket.loaded))
      if (pose.speed) placeTruck()
      return pose
    },
    update(available: boolean) {
      enabled = available
      nearby = distance(walker, pose) < 45
      if (performance.now() >= nextDraw) { render(); nextDraw = performance.now() + 120 }
      if ((nearby || driving || !status) && performance.now() >= refreshAt && !busy) void request()
    },
  }
}
