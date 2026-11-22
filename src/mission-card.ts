import { ferryCard } from './ferry-repair-ui'
import { favorProgress, gateRepairGuide, gateRepairStepCount } from './gate-repair'
import { jobDescription, secondIslandProgress } from './job-board-ui'
import { activeJob, deliveryDrop, secondIslandGoal } from './jobs'
import { materialsGuide, materialsOpen, repairQuantity } from './materials-work'
import type { Player, Snapshot } from './protocol'
import { activeFavor, isCustom, residentFavorGuide } from './residents/favors'
import { distance } from './world'
import { careerUnlockXp, drivingCareers, learnerVehicles, practiceStop, practiceStopXp } from './learner-vehicles'
import { starterResidents } from './worlds/starter/residents'
import { wildfireCard } from './wildfire-card'

const deliveryHintReach = 11
const sampleCheckoutSteps = 2
const initialDeliveryQuota = 3
const percentScale = 100

// The first resident favor under way that has no card of its own.
function residentFavorCard(state: Snapshot, local: Player) {
  for (const resident of starterResidents) {
    const favor = activeFavor(resident, state)
    if (!favor || isCustom(favor)) continue
    const guide = residentFavorGuide(resident, favor, state, local)
    return { label: 'NEIGHBOR FAVOR', title: guide.title, detail: guide.detail, progress: `${resident.identity.name} is waiting`, value: 0, max: 1, text: 'Not yet done', instruction: guide.next }
  }
}

function deliveryInstruction(state: Snapshot, drop: { x: number, z: number }, quantity: number) {
  const loaded = state.items.filter((item) => item.onBed).length
  const delivered = state.jobs.active?.progress ?? state.items.filter((item) => item.delivered).length
  if (distance(state.truck, drop) < deliveryHintReach) return 'Carry the crates into the teal drop zone. Press E to deliver.'
  if (loaded > 0 && loaded + delivered === quantity) return 'Follow the amber orbs to the teal drop zone. Hold Shift on corners and Space to brake.'
  return loaded > 0 ? `${loaded} in the flatbed. Load or recover the remaining crates, then follow the amber orbs.` : 'Pick up crates at Harbor Depot and load the flatbed.'
}

function materialsCard(state: Snapshot, player: Player) {
  if (!materialsOpen(state)) return
  const { checkout, request } = state.materialsWork
  if (request?.delivered === repairQuantity) return
  const { title, detail, next: instruction } = materialsGuide(state, player)
  const value = request?.delivered ?? (checkout === 'timber' ? 0 : checkout === 'stone' ? 1 : sampleCheckoutSteps)
  const progress = request ? 'Sections installed' : 'Samples checked'
  const max = request ? repairQuantity : sampleCheckoutSteps
  return { label: 'NEIGHBOR FAVOR', title, detail, progress, value, max, text: `${value} / ${max}`, instruction }
}

// The mission panel: the current shift, order or neighbor favor, with its progress and next step.
// While aboard a learner vehicle the card follows the practice run.
function learnerCard(state: Snapshot, local: Player) {
  const id = local.vehicle!
  const { name, career } = learnerVehicles[id]
  const stop = practiceStop(id, state.practice[id])
  const value = Math.min(local.drivingXp?.[career] ?? 0, careerUnlockXp)
  return {
    label: 'LEARNER DRIVING',
    title: name,
    detail: `Drive to ${stop.name} and stop inside the ring of cones. The driver earns ${practiceStopXp} ${drivingCareers[career].name} XP per stop.`,
    progress: `${drivingCareers[career].name} XP`,
    value,
    max: careerUnlockXp,
    text: `${value} / ${careerUnlockXp} XP`,
    instruction: `Qualifies for the ${drivingCareers[career].qualifies} once their Saltwind driving jobs open.`,
  }
}

function deliveryCard(state: Snapshot) {
  const job = activeJob(state)
  const drop = deliveryDrop(state)
  if (!drop) return
  const quantity = job?.quantity ?? initialDeliveryQuota
  const value = state.jobs.active?.progress ?? state.items.filter((item) => item.delivered).length
  return {
    label: job ? 'CREW ORDER' : 'MISSION 01 / 02',
    title: job?.title ?? 'Harbor delivery',
    detail: job ? jobDescription(job) : 'Bring three supply crates from Harbor Depot to Seabrook.',
    progress: 'Crates delivered',
    value,
    max: quantity,
    text: `${value} / ${quantity} delivered`,
    instruction: deliveryInstruction(state, drop, quantity),
  }
}

export function missionCard(state: Snapshot, id: number) {
  const aboard = state.players.find((entry) => entry.id === id && entry.seat && entry.vehicle)
  if (aboard) return learnerCard(state, aboard)
  const job = activeJob(state)
  const delivery = deliveryCard(state)
  if (delivery) return delivery
  if (state.mission === 'fire') {
    const value = Math.round((1 - state.fire) * percentScale)
    return {
      label: 'MISSION 02 / 02',
      title: 'Forest lookout fire',
      detail: 'Collect extinguishers at Fire Supplies and head to Forest Lookout.',
      progress: 'Fire extinguished',
      value,
      max: percentScale,
      text: `${value}% extinguished`,
      instruction: 'Hold left click near the fire to put it out.',
    }
  }
  // An order the crew already took keeps its card. A fire then shows in notices and on the map.
  if (job?.kind === 'market') return marketCard(job, state.jobs.active?.progress ?? 0)
  return wildfireCard(state) ?? serviceCard(state, id)
}

function marketCard(job: Extract<NonNullable<ReturnType<typeof activeJob>>, { kind: 'market' }>, value: number) {
  return {
    label: 'CREW ORDER',
    title: job.title,
    detail: jobDescription(job),
    progress: 'Goods contributed',
    value,
    max: job.quantity,
    text: `${value} / ${job.quantity} ${job.goods}`,
    instruction: 'Press E at the market awning to contribute.',
  }
}

// Neighbor favors, repairs, and the job board between them.
function serviceCard(state: Snapshot, id: number) {
  const local = state.players.find((entry) => entry.id === id)
  if (local && state.gateRepair.stage !== 'sagging' && !materialsOpen(state)) {
    const favor = gateRepairGuide(state, local), value = favorProgress(state.gateRepair)
    return { label: 'NEIGHBOR FAVOR', title: favor.title, detail: favor.detail, progress: 'Repair steps', value, max: gateRepairStepCount, text: `${value} / ${gateRepairStepCount} steps`, instruction: favor.next }
  }
  const asked = local && residentFavorCard(state, local)
  if (asked) return asked
  const materials = local && materialsCard(state, local)
  if (materials) return materials
  const ferry = ferryCard(state)
  if (ferry) return ferry
  const completed = Math.min(state.jobs.completed, secondIslandGoal)
  return {
    label: 'ISLAND SERVICE',
    title: 'Choose your next job',
    detail: 'Visit the job board at Harbor Depot. Between orders you can fish, farm, explore, or learn to drive the farm tractor and the Fire and Rescue pickup by Fire Supplies, whose bed carries rescue gear.',
    progress: 'Second island progress',
    value: completed,
    max: secondIslandGoal,
    text: `${completed} / ${secondIslandGoal}`,
    instruction: completed === secondIslandGoal ? secondIslandProgress(completed) : 'Complete four orders to open the ferry terminal repair.',
  }
}
