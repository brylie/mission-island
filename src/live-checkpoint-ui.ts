import type { LiveTrial, ScenarioSummary } from './live-checkpoints'

export function bindCheckpointControls(dialog: HTMLDialogElement, token: () => string) {
  const panel = dialog.querySelector<HTMLFieldSetElement>('#live-checkpoint')!
  const select = panel.querySelector<HTMLSelectElement>('[name="checkpoint"]')!
  const seats = panel.querySelector<HTMLSelectElement>('[name="seats"]')!
  const start = panel.querySelector('button')!
  const message = panel.querySelector('[role="status"]')!
  const banner = document.querySelector<HTMLButtonElement>('#checkpoint-banner')!
  const options = document.querySelector<HTMLButtonElement>('#options-button')!
  let current: LiveTrial | undefined
  let activeTitle = ''
  let pending = false
  banner.onclick = () => options.click()
  function setCatalog(scenarios: readonly ScenarioSummary[]) {
    select.replaceChildren()
    for (const { id, title, island } of scenarios) {
      const option = new Option(title, id)
      option.dataset.island = island
      select.add(option)
    }
    current = undefined
  }
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
  function update(trial: LiveTrial | undefined) {
    if (!trial) return
    if (current?.revision !== trial.revision) {
      panel.hidden = banner.hidden = false
      current = trial
      select.value = trial.checkpoint
      const option = select.selectedOptions[0]
      activeTitle = option?.text ?? trial.checkpoint
      panel.querySelector('legend')!.textContent = 'Live playtest · ' + (option?.dataset.island ?? 'Island')
      seats.value = String(trial.seats)
      message.textContent = ''
      label()
      if (location.hash === '#checkpoints') {
        history.replaceState(null, '', location.pathname + location.search)
        queueMicrotask(() => options.click())
      }
    }
    const text = trial.started ? activeTitle : activeTitle + ' · Waiting for crew'
    if (banner.textContent !== text) banner.textContent = text
  }
  // Until every seat is filled, the prompt tells players how to bring in a crewmate or start alone.
  function waitingPrompt(trial: LiveTrial | undefined) {
    return trial && !trial.started ? 'Waiting for your crewmate. Press O to copy the LAN link or start solo.' : undefined
  }
  return { update, setCatalog, waitingPrompt }
}
