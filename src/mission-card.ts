import { favorProgress, gateRepairGuide } from './gate-repair'
import { jobDescription, secondIslandProgress } from './job-board-ui'
import { activeJob, deliveryDrop, secondIslandGoal } from './jobs'
import { materialsGuide, materialsOpen, repairQuantity } from './materials-work'
import type { Player, Snapshot } from './protocol'
import { activeFavor, isCustom } from './residents/favors'
import { distance } from './world'
import { starterResidents } from './worlds/starter/residents'

// The first resident favor under way that has no card of its own.
function residentFavorCard(state: Snapshot, local: Player) {
  for (const resident of starterResidents) {
    const favor = activeFavor(resident, state)
    if (!favor || isCustom(favor)) continue
    const guide = favor.guide?.(state, local) ?? favor
    return { label: 'NEIGHBOR FAVOR', title: guide.title, detail: guide.detail, progress: `${resident.identity.name} is waiting`,
      value: 0, max: 1, text: 'Not yet done', instruction: guide.next }
  }
}

function deliveryInstruction(state: Snapshot, drop: { x: number; z: number }, quantity: number) {
  const loaded = state.items.filter((item) => item.onBed).length
  const delivered = state.jobs.active?.progress ?? state.items.filter((item) => item.delivered).length
  if (distance(state.truck, drop) < 11) return 'Carry the crates into the teal drop zone. Press E to deliver.'
  if (loaded > 0 && loaded + delivered === quantity) return 'Follow the amber orbs to the teal drop zone. Hold Shift on corners and Space to brake.'
  return loaded > 0 ? `${loaded} in the flatbed. Load or recover the remaining crates, then follow the amber orbs.` : 'Pick up crates at Harbor Depot and load the flatbed.'
}

function materialsCard(state: Snapshot, player: Player) {
  if (!materialsOpen(state)) return
  const { checkout, request } = state.materialsWork
  if (request?.delivered === repairQuantity) return
  const { title, detail, next: instruction } = materialsGuide(state, player)
  const value = request?.delivered ?? (checkout === 'timber' ? 0 : checkout === 'stone' ? 1 : 2)
  const progress = request ? 'Sections installed' : 'Samples checked'
  const max = request ? repairQuantity : 2
  return { label: 'NEIGHBOR FAVOR', title, detail, progress, value, max, text: `${value} / ${max}`, instruction }
}

// The mission panel: the current shift, order or neighbor favor, with its progress and next step.
export function missionCard(state: Snapshot, id: number) {
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
  const local = state.players.find((entry) => entry.id === id)
  if (local && state.gateRepair.stage !== 'sagging' && !materialsOpen(state)) {
    const favor = gateRepairGuide(state, local), value = favorProgress(state.gateRepair)
    return { label: 'NEIGHBOR FAVOR', title: favor.title, detail: favor.detail, progress: 'Repair steps', value, max: 4,
      text: `${value} / 4 steps`, instruction: favor.next }
  }
  const asked = local && residentFavorCard(state, local)
  if (asked) return asked
  const materials = local && materialsCard(state, local)
  if (materials) return materials
  const completed = Math.min(state.jobs.completed, secondIslandGoal)
  return {
    label: 'ISLAND SERVICE', title: 'Choose your next job', detail: 'Visit the job board at Harbor Depot. You can fish, farm, or explore between orders.',
    progress: 'Second island progress', value: completed, max: secondIslandGoal,
    text: `${completed} / ${secondIslandGoal}`,
    instruction: completed === secondIslandGoal ? secondIslandProgress(completed) : 'Complete orders to prepare for the second island.',
  }
}
