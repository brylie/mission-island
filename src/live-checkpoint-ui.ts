import { checkpoints, type LiveTrial } from './live-checkpoints'

export function bindCheckpointControls(dialog: HTMLDialogElement, token: () => string) {
  const panel = dialog.querySelector<HTMLFieldSetElement>('#live-checkpoint')!
  const select = panel.querySelector<HTMLSelectElement>('[name="checkpoint"]')!
  const seats = panel.querySelector<HTMLSelectElement>('[name="seats"]')!
  const start = panel.querySelector('button')!
  const message = panel.querySelector('[role="status"]')!
  const banner = document.querySelector<HTMLButtonElement>('#checkpoint-banner')!
  const options = document.querySelector<HTMLButtonElement>('#options-button')!
  let current: LiveTrial | undefined
  let pending = false
  banner.onclick = () => options.click()
  for (const [id, title] of Object.entries(checkpoints)) select.add(new Option(title, id))
  function label() {
    start.textContent = current?.checkpoint === select.value && String(current.seats) === seats.value
      ? 'Restart checkpoint' : 'Start checkpoint'
  }
  panel.onchange = label
  start.onclick = async () => {
    if (!current || pending) return
    pending = start.disabled = true
    const args = new URLSearchParams({ checkpoint: select.value, seats: seats.value, revision: String(current.revision) })
    try {
      const result = await fetch('/api/live-checkpoint?' + args.toString(), {
        method: 'POST', headers: { Authorization: 'Bearer ' + token() },
      })
      message.textContent = await result.text()
      if (result.ok) dialog.close()
    } catch { message.textContent = 'Could not reach the host. Try again after reconnecting.' }
    finally { pending = start.disabled = false }
  }
  return (trial: LiveTrial | undefined) => {
    if (!trial) return
    if (current?.revision !== trial.revision) {
      panel.hidden = banner.hidden = false
      current = trial
      select.value = trial.checkpoint
      seats.value = String(trial.seats)
      message.textContent = ''
      label()
      if (location.hash === '#checkpoints') {
        history.replaceState(null, '', location.pathname + location.search)
        queueMicrotask(() => options.click())
      }
    }
    const title = checkpoints[trial.checkpoint]
    const text = trial.started ? title : title + ' · Waiting for crew'
    if (banner.textContent !== text) banner.textContent = text
  }
}
