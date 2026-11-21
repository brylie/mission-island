import { crewName, ferryNextStep, ferryProjectOpen, ferryStages, stageNeeds } from './ferry-repair'
import type { ServerMessage, Snapshot } from './protocol'

type FerryNotice = Extract<ServerMessage, { type: 'ferry-progress' | 'ferry-order' | 'ferry-stage' }>

// The mission card's community project, shown once four orders have opened the repair and no order is running.
export function ferryCard(state: Snapshot) {
  if (!ferryProjectOpen(state)) return undefined
  const needs = stageNeeds(state)
  const stages = ferryStages.length
  if (!needs) {
    return { label: 'COMMUNITY PROJECT', title: 'Ferry service restored', progress: 'Repair stages', value: stages, max: stages, detail: 'The crew rebuilt the ferry terminal at the end of Harbor Depot road. The first crossing is being arranged.', text: `${stages} / ${stages} stages`, instruction: 'Starter Island is still home. Fish, farm, explore or take another order.' }
  }
  return {
    label: 'COMMUNITY PROJECT',
    title: `Ferry terminal · ${needs.title}`,
    progress: `Stage ${needs.number} of ${stages}`,
    detail: 'Bring crew coins and Seabrook timber to the tally board beside the ferry barrier.',
    value: needs.coinsGiven + needs.cratesGiven,
    max: needs.coins + needs.crates,
    text: `${needs.coinsGiven}/${needs.coins} coins · ${needs.cratesGiven}/${needs.crates} timber`,
    instruction: ferryNextStep(state),
  }
}

// What both screens show when someone gives to the repair or a stage is finished.
export function ferryFeedback(message: FerryNotice, state: Snapshot | undefined) {
  const until = performance.now() + (message.type === 'ferry-stage' ? 5200 : 3200)
  if (message.type === 'ferry-order') {
    return { key: `${message.crates} timber`, label: 'Waiting at the Seabrook timber stack · Haul it to the ferry yard', until }
  }
  if (message.type === 'ferry-stage') {
    const finished = ferryStages[message.stage - 1]?.title ?? 'Repair stage'
    return { key: message.stage >= ferryStages.length ? 'Ferry open' : `Stage ${message.stage}/${ferryStages.length}`, label: message.stage >= ferryStages.length ? `${finished} · Ferry service restored` : `${finished} complete · Next: ${ferryStages[message.stage].title}`, until }
  }
  const who = state ? crewName(state, message.player) : 'Crew'
  return message.kind === 'coins'
    ? { key: `−${message.amount} coins`, label: `${who} donated to the ferry repair · Crew bank`, until }
    : { key: '+1 timber', label: `${who} stacked timber for the ferry repair`, until }
}
