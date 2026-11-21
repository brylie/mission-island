import { interactions } from './interaction-options'
import type { Player, Snapshot } from './protocol'
import { conversationLines, favorLine } from './residents/favors'
import type { ResidentAction } from './residents/interactions'
import { chooseRemark, remarkContext } from './residents/remarks'
import { islandRemarks } from './worlds/starter/island-remarks'
import { starterResidents } from './worlds/starter/residents'

type Choice = Extract<ResidentAction, 'accept-favor' | 'report-sound' | 'report-fault'>

// The conversation half of the crew guide dialog. Each talk adds one remark chosen for the moment; the
// count and the last remark are this client's own, so talking again gives a different line when one fits.
export function createResidentConversation(dialog: HTMLDialogElement, act: (action: Choice, subject: number) => void) {
  const greeting = dialog.querySelector<HTMLElement>('#resident-line')!
  const remark = dialog.querySelector<HTMLElement>('#resident-remark')!
  const advice = dialog.querySelector<HTMLElement>('#resident-advice')!
  const favor = dialog.querySelector<HTMLElement>('#resident-favor')!
  const buttons: Record<Choice, HTMLButtonElement> = {
    'accept-favor': dialog.querySelector('#resident-accept')!,
    'report-sound': dialog.querySelector('#resident-report-sound')!,
    'report-fault': dialog.querySelector('#resident-report-fault')!,
  }
  const talks = new Map<string, { count: number; last?: string }>()
  let speaker = -1

  // Every choice goes back through the host, which checks the resident is still in reach and still waiting.
  for (const [action, button] of Object.entries(buttons) as [Choice, HTMLButtonElement][]) {
    button.addEventListener('click', () => {
      if (speaker >= 0) act(action, speaker)
      dialog.close()
    })
  }

  return {
    // A notice board read in the same dialog: plain lines, nobody to answer and nothing to choose.
    board(lines: readonly string[]) {
      speaker = -1
      greeting.textContent = lines[0] ?? ''
      advice.textContent = lines.slice(1).join('\n')
      for (const element of [remark, favor, ...Object.values(buttons)]) element.hidden = true
      return true
    },
    // Fills the conversation and returns the title, or undefined when the id is not a resident.
    show(state: Snapshot, player: Player, id: string) {
      speaker = starterResidents.findIndex((resident) => resident.id === id)
      const resident = starterResidents[speaker]
      if (!resident) return undefined
      const memory = talks.get(id) ?? { count: 0 }
      const seed = (memory.count * 7919 + player.id * 104729 + Math.floor(state.islandTime) + id.length * 131) >>> 0
      const said = chooseRemark(resident, islandRemarks, remarkContext(resident, state, player), seed, memory.last)
      talks.set(id, { count: memory.count + 1, last: said?.template })
      remark.textContent = said ? `“${said.text}”` : ''
      remark.hidden = !said
      this.refresh(state, player)
      return `${resident.identity.name} · ${resident.identity.role}`
    },
    // Keeps the lines, the favor and the choices current while the conversation is open. The remark stays put.
    refresh(state: Snapshot, player: Player) {
      const resident = starterResidents[speaker]
      if (!resident) return
      const lines = conversationLines(resident, state)
      if (greeting.textContent !== lines[0]) greeting.textContent = lines[0]
      if (advice.textContent !== lines[1]) advice.textContent = lines[1]
      const asking = favorLine(resident, state) ?? ''
      if (favor.textContent !== asking) favor.textContent = asking
      favor.hidden = !asking
      const open = interactions(state, player).filter((option) => option.subject === speaker)
      for (const [action, button] of Object.entries(buttons) as [Choice, HTMLButtonElement][]) {
        const option = open.find((entry) => entry.action === action)
        button.hidden = !option
        if (button.textContent !== (option?.label ?? '')) button.textContent = option?.label ?? ''
      }
    },
  }
}
