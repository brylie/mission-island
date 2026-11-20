import { jobs, secondIslandGoal } from './jobs'
import type { JobBoardState, JobId } from './jobs'

export function secondIslandProgress(completed: number) {
  return completed >= secondIslandGoal ? 'Crew ready · second-island travel coming later'
    : `Second island · ${completed} / ${secondIslandGoal} orders complete`
}

export function jobDescription(job: typeof jobs[JobId]) {
  return job.kind === 'delivery'
    ? `Deliver ${job.quantity} ${job.cargo} from Harbor Depot to ${job.destination}.`
    : `Bring ${job.quantity} ${job.goods} to Seabrook Market. Either player can contribute.`
}

export function createJobBoard(dialog: HTMLDialogElement, request: (id: JobId) => void) {
  const note = dialog.querySelector<HTMLElement>('#board-note')!
  const progress = dialog.querySelector<HTMLElement>('#board-progress')!
  const list = dialog.querySelector<HTMLElement>('#job-list')!
  let pending: JobId | undefined
  let blocked = false
  const entries = (Object.keys(jobs) as JobId[]).map((id) => {
    const job = jobs[id]
    const row = document.createElement('li')
    const heading = document.createElement('h3')
    heading.textContent = job.title
    const detail = document.createElement('p')
    detail.textContent = jobDescription(job)
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = `Take order · ${job.coins} coins for the crew`
    button.setAttribute('aria-label', `Take ${job.title}, ${job.coins} coins for the crew`)
    button.addEventListener('click', () => {
      if (pending) return
      pending = id
      blocked = false
      request(id)
    })
    row.append(heading, detail, button)
    list.append(row)
    return { id, row, button }
  })

  dialog.addEventListener('close', () => { blocked = false; pending = undefined })

  return {
    reject() { pending = undefined; blocked = true },
    update(state: JobBoardState, canAccept: boolean, online: boolean) {
      if (!dialog.open) return
      const { active, completed } = state
      if (pending && active?.id === pending) {
        dialog.close()
        return
      }
      const where = !online ? 'Reconnect to take an order.' : active ? `${jobs[active.id].title} is in progress.`
        : canAccept ? 'Choose an order for the crew.' : 'Visit the board at Harbor Depot to take an order.'
      const message = blocked && !active && online ? 'The order could not be started. Check that your hands are free and try again.' : where
      const milestone = secondIslandProgress(completed)
      if (note.textContent !== message) note.textContent = message
      if (progress.textContent !== milestone) progress.textContent = milestone
      for (const { id, row, button } of entries) {
        row.classList.toggle('active-job', active?.id === id)
        button.disabled = !canAccept || Boolean(active || pending) || !online
      }
    },
  }
}
