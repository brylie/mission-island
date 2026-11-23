import { fireIntensityChoices, fireSiteChoices, fireSizeChoices, placeChoices, playtestEventQuery, type PlaytestEvent, type WildfireChoice } from './playtest-events'

function fill(select: HTMLSelectElement, choices: readonly { id: string, label: string }[]) {
  for (const { id, label } of choices) select.add(new Option(label, id))
}

// The Options dialog's event menu, shown only in a live playtest. The host checks every choice again.
export function bindPlaytestEvents(dialog: HTMLDialogElement, token: () => string) {
  const panel = dialog.querySelector<HTMLFieldSetElement>('#playtest-events')!
  const field = (name: string) => panel.querySelector<HTMLSelectElement>(`[name="${name}"]`)!
  const located = panel.querySelector<HTMLInputElement>('[name="located"]')!
  const message = panel.querySelector('[role="status"]')!
  const buttons = [...panel.querySelectorAll<HTMLButtonElement>('button[data-event]')]
  fill(field('size'), fireSizeChoices)
  fill(field('site'), fireSiteChoices)
  fill(field('intensity'), fireIntensityChoices)
  fill(field('place'), placeChoices)
  let pending = false

  function chosen(type: string | undefined): PlaytestEvent {
    if (type === 'go-to') return { type, place: field('place').value }
    if (type !== 'wildfire') return { type: 'end-wildfire' }
    const choice = Object.fromEntries((['size', 'site', 'intensity'] as const).flatMap((key) => field(key).value ? [[key, field(key).value]] : [])) as WildfireChoice
    return { type, ...choice, ...(located.checked && { located: true }) }
  }

  for (const button of buttons) button.onclick = async () => {
    if (pending) return
    pending = true
    for (const each of buttons) each.disabled = true
    try {
      const result = await fetch('/api/playtest-event?' + playtestEventQuery(chosen(button.dataset.event)).toString(), {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token() },
      })
      // Success shows in the world; only a refusal stays in the panel to read.
      message.textContent = result.ok ? '' : await result.text()
      if (result.ok) dialog.close()
    }
    catch { message.textContent = 'Could not reach the host. Try again after reconnecting.' }
    finally {
      pending = false
      for (const each of buttons) each.disabled = false
    }
  }
  return {
    show() {
      panel.hidden = false
    },
  }
}
