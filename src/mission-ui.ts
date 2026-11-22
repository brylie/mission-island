import { updateFarmHud } from './farm-order-ui'
import { missionCard } from './mission-card'
import type { Snapshot } from './protocol'

const percentProgressMax = 100
const percentProgressSegments = 3

export function createMissionHud(element: (id: string) => HTMLElement, boardButton: HTMLElement, spray: HTMLElement) {
  const missionLabel = element('mission-label')
  const missionTitle = element('mission-title')
  const missionDescription = element('mission-description')
  const progress = element('progress-track')
  const segments = Array.from(progress.children)
  const progressLabel = element('progress-label')
  const missionStep = element('mission-step')
  const farmHud = element('farm-hud')
  return (state: Snapshot, id: number) => {
    updateFarmHud(farmHud, state.farmWork)
    const card = missionCard(state, id)
    missionLabel.textContent = card.label
    missionTitle.textContent = card.title
    missionDescription.textContent = card.detail
    progress.setAttribute('aria-label', card.progress)
    progress.setAttribute('aria-valuemax', String(card.max))
    progress.setAttribute('aria-valuenow', String(card.value))
    progressLabel.textContent = card.text
    const count = card.max === percentProgressMax ? percentProgressSegments : card.max
    segments.forEach((segment, index) => {
      segment.toggleAttribute('hidden', index >= count)
      segment.classList.toggle('active', card.value >= (index + 1) * card.max / count)
    })
    boardButton.hidden = state.mission !== 'complete'
    spray.hidden = !state.items.some((item) => item.kind === 'extinguisher' && item.holder === id)
    if (missionStep.textContent !== card.instruction) missionStep.textContent = card.instruction
  }
}
