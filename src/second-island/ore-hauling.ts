import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { MeshFactory } from '../island-meshes'
import { createFreightRadio } from './freight-radio'
import { distance, offset, type Point, type Pose } from '../world'
import { atFreightBay, dispatchBay, haulerUnlockXp, hopperBay, parkedHauler, oreContracts, oreNames } from '../ore-contracts'
import type { DriverStatus, FreightCommand, Ore } from '../ore-contracts'
import { haulerPose, stepHauler } from './haul-drive'
import { createOreLoad } from './quarry-art'
import { vehiclePlacement } from './scenery'
import { surfaceHeight } from './terrain'
import { createOreHauler } from '../assets/ore-hauler'
import { placeWalker, type ScenerySolids } from './walking'

function createBayMarkers(meshes: MeshFactory) {
  const marker = new TransformNode('Freight bay markers', meshes.scene)
  for (const side of [-1, 1]) {
    const x = side * 3.6
    meshes.box(x, 0.04, 0, 0.55, 0.08, 0.55, '#444e46', marker)
    meshes.cylinder(x, 0.30, 0, 0.08, 0.39, 0.53, 8, '#de853f', marker)
    meshes.cylinder(x, 0.33, 0, 0.17, 0.23, 0.10, 8, '#fff1cc', marker)
  }
  return marker
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
  return [-2.2, 2.2, -3.1, 3.1].map((x) => placeWalker(offset(pose, x, 2.2)))
    .find((p) => !p.swimming && !solids.at(p.x, p.z, 0.3).some((b) => b.top > p.y + 0.3 && b.bottom < p.y + 1.8))
}

function bindDispatchControls(select: HTMLSelectElement, action: HTMLButtonElement, submit: () => void) {
  action.onclick = submit
  select.onkeydown = (event) => {
    if (event.key.toLowerCase() !== 'e' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
    event.preventDefault()
    event.stopPropagation()
    submit()
  }
}

function oreDisplay(meshes: MeshFactory, truck: TransformNode) {
  const loads = new Map<Ore, ReturnType<typeof createOreLoad>>()
  return (ore?: Ore) => {
    if (ore && !loads.has(ore)) loads.set(ore, createOreLoad(meshes, truck, ore))
    for (const [id, mesh] of loads) mesh.setEnabled(ore === id)
  }
}

function cabSign(status: DriverStatus | undefined, range: number) {
  if (!status) return 'Contacting dispatch…'
  if (status.xp < haulerUnlockXp) return `Ore truck certification · ${status.xp}/${haulerUnlockXp} driver XP. Haul crates on Starter Island to earn XP when your crew delivers them.`
  return 'Certified ore truck driver · ' + range + ' m to the cab.'
}

export function createOreHauling(meshes: MeshFactory, solids: ScenerySolids, walker: ReturnType<typeof placeWalker>, changeSeat: (driving: boolean, heading: number) => void) {
  const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
  const panel = get('freight'), hint = get('freight-hint'), receipt = get('freight-receipt')
  const select = get<HTMLSelectElement>('freight-choice'), action = get<HTMLButtonElement>('freight-action')
  const seat = get<HTMLButtonElement>('freight-seat')
  const { root: truck, roll } = createOreHauler(meshes, true)
  const showLoad = oreDisplay(meshes, truck)
  const marker = createBayMarkers(meshes)
  const pose = { ...dispatchBay, heading: vehiclePlacement('hauler').heading, speed: 0 }
  function placeTruck() {
    const ground = haulerPose(pose)
    truck.position.set(pose.x, ground.y, pose.z)
    truck.rotation.set(ground.pitch, pose.heading, ground.roll)
    solids.parkedVehicle = driving ? undefined : { ...pose, bottom: ground.y + 0.25, top: ground.y + 2.65, width: 2.55, depth: 8.8 }
    if (driving) Object.assign(walker, { x: pose.x, z: pose.z, y: ground.y, swimming: false, grounded: true, velocity: 0 })
  }
  let status: DriverStatus | undefined, busy = false, driving = false, enabled = true
  let mode = '', refreshAt = 0, nearby = false, nextDraw = 0
  const qualified = () => (status?.xp ?? 0) >= haulerUnlockXp
  const order = () => oreContracts.find((o) => o.id === status?.ticket.contract)
  function destination() {
    const job = order()
    return job ? status?.ticket.loaded ? job.buyer : hopperBay : dispatchBay
  }
  function target(): Point | undefined {
    return driving ? destination() : (order() || nearby || qualified()) ? pose : undefined
  }
  function setSeat(seated: boolean) {
    if (driving === seated) return
    driving = seated
    pose.speed = 0
    if (!seated) Object.assign(walker, exitPoint(pose, solids) ?? placeWalker(offset(pose, 2.2, 2.2)))
    placeTruck()
    changeSeat(seated, pose.heading)
  }
  function disconnected(message: string) {
    setSeat(false)
    status = undefined
    receipt.textContent = message
    receipt.dataset.offline = 'true'
    refreshAt = performance.now() + 1000
  }
  const radio = createFreightRadio(disconnected)
  async function request(command?: Exclude<FreightCommand, { action: 'drive' }>) {
    if (busy) return
    busy = true
    const previous = order()
    try {
      const reply = await radio.send(command)
      status = reply.status
      Object.assign(pose, parkedHauler(status.ticket), { speed: 0 })
      placeTruck()
      showLoad(status.ticket.loaded ? order()?.ore : undefined)
      if (reply.error) {
        if (!status.boarded) setSeat(false)
        receipt.textContent = reply.error
      }
      else if (command?.action === 'board' || command?.action === 'leave') {
        setSeat(command.action === 'board')
        receipt.textContent = ''
      }
      else if (command) receipt.textContent = command.action === 'deliver' && previous
        ? previous.buyer.name + ' signed for the load. +' + previous.coins + ' crew coins.'
        : command.action === 'load' ? 'Weighed and loaded. Your ticket is ready for the buyer.' : 'Dispatch ticket issued.'
      else if (receipt.dataset.offline) receipt.textContent = ''
      delete receipt.dataset.offline
      refreshAt = performance.now() + 15000
    }
    catch { disconnected('Dispatch radio offline. Reconnecting…') }
    finally {
      busy = false
      render()
    }
  }
  function toggleSeat() {
    if (!enabled || busy || !qualified() || Math.abs(pose.speed) > 0.15) return
    if (driving && !exitPoint(pose, solids)) {
      receipt.textContent = 'Pull forward to give the cab door room.'
      return
    }
    if (driving || distance(walker, pose) <= 6) void request({ action: driving ? 'leave' : 'board' })
  }
  function interact() {
    if (!enabled || panel.hidden) return false
    if (!driving) {
      if (distance(walker, pose) > 6) return false
      toggleSeat()
      return true
    }
    if (!busy && status && atFreightBay(pose, destination()) && Math.abs(pose.speed) <= 0.15) {
      const job = order()
      void request(job && status.ticket.loaded ? { action: 'deliver' } : { action: job ? 'load' : 'accept', choice: select.value })
    }
    return true
  }
  function instructions(range: number, braking: boolean) {
    if (!driving) return cabSign(status, range)
    const offer = oreContracts.find((o) => o.id === select.value)
    if (mode === 'contract' && offer) return offer.purpose + ' · ' + offer.coins + ' coins.'
    const job = order()
    const label = job ? oreNames[job.ore] + ' · ' + (status?.ticket.loaded ? job.buyer.name : 'Slatecliff hopper') : 'Slatecliff dispatch bay'
    return label + ' · ' + range + ' m' + (range > 4 ? ' ' + directionTo(pose, destination()) : '') + (braking ? ' · Brake to park.' : '')
  }
  function render() {
    const job = order(), loaded = Boolean(status?.ticket.loaded)
    const stopped = Math.abs(pose.speed) <= 0.15, bay = destination(), parked = atFreightBay(pose, bay)
    const nextMode = !driving || !parked ? '' : !job ? 'contract' : loaded ? '' : 'ore'
    if (mode !== nextMode) {
      mode = nextMode
      freightChoices(select, mode)
    }
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
  bindDispatchControls(select, action, () => {
    interact()
    get('island').focus()
  })
  seat.onclick = toggleSeat
  placeTruck()
  render()
  return {
    target,
    interact,
    toggleSeat,
    get driving() { return driving },
    drive(keys: Set<string>, dt: number) {
      if (busy || radio.full || dt <= 0) return pose
      const key = (a: string, b: string) => Number(keys.has(a) || keys.has(b))
      const input = { throttle: key('w', 'arrowup') - key('s', 'arrowdown'), steer: key('d', 'arrowright') - key('a', 'arrowleft'), brake: keys.has(' '), dt }
      const moving = pose.speed !== 0 || input.throttle !== 0
      const { steering, step } = stepHauler(pose, input, solids, Boolean(status?.ticket.loaded))
      if (moving) radio.record(step)
      roll(pose.speed * dt, steering)
      if (pose.speed) placeTruck()
      return pose
    },
    update(available: boolean) {
      radio.update()
      enabled = available
      nearby = distance(walker, pose) < 45
      if (performance.now() >= nextDraw) {
        render()
        nextDraw = performance.now() + 120
      }
      if (!driving && (nearby || !status) && performance.now() >= refreshAt && !busy) void request()
    },
  }
}
