import { journalCatalog, journalEntry, type JournalEntry, type JournalPage } from './journal/catalog'
import { journalTally, noteConditions, placeName, type Journal } from './journal/journal'
import { fieldLeads, isOutingId, outingCount, outingIds, outingSubjects, rainLead } from './journal/outing'
import type { Player, Snapshot } from './protocol'
import { starterDiscoveries } from './scenery'
import { shellglassTideAt } from './shellglass-tide'

type Page = JournalPage | 'outing'
const crewName = (state: Snapshot, id: number | undefined) =>
  id === undefined ? undefined : state.players.find(player => player.id === id)?.name || `Crew ${id + 1}`

export function catchLabel(fish: string | undefined) {
  const name = fish && journalEntry(fish)?.name
  return name ? `Caught a ${name}` : undefined
}

// One line of the page: a pencilled box, the entry's name once recorded or its clue until then, and when and where it was noted.
function row(state: Snapshot, entry: JournalEntry, outing: boolean) {
  const record = state.journal.entries[entry.id]
  const note = outing ? record?.outing : record?.first ?? record?.outing
  const recorded = outing ? Boolean(note) : Boolean(record)
  const subject = outing && isOutingId(entry.id) ? outingSubjects[entry.id] : undefined
  const item = document.createElement('li')
  item.className = entry.parent && !outing ? 'journal-row journal-behavior' : 'journal-row'
  item.toggleAttribute('data-recorded', recorded)
  const box = document.createElement('span')
  box.className = 'journal-box'
  box.setAttribute('aria-hidden', 'true')
  box.textContent = recorded ? '✓' : ''
  const text = document.createElement('div')
  const title = document.createElement('strong')
  // The box is decoration. The words carry whether the line is filled in.
  const name = subject?.name ?? entry.name
  title.textContent = recorded ? `${name} · recorded` : outing ? name : `Not yet recorded · ${entry.clue}`
  text.append(title)
  if (recorded) {
    const detail = document.createElement('small')
    const phase = outing && entry.id === 'place:shellglass' && note ? shellglassTideAt(note.t).phase : undefined
    detail.textContent = note ? [noteConditions(note), placeName(note.at), phase, crewName(state, note.by)]
      .filter(Boolean).join(' · ') : 'Earlier discovery'
    text.append(detail)
    if (subject) {
      const description = document.createElement('small')
      description.textContent = subject.detail
      text.append(description)
    }
  }
  item.append(box, text)
  return item
}

// The crew's shared field journal: a paper checklist either player opens with J or the HUD button.
export function createJournalPage(dialog: HTMLDialogElement, button: HTMLButtonElement, canOpen: () => boolean, pause: () => void) {
  const tally = dialog.querySelector<HTMLElement>('#journal-tally')!
  const list = dialog.querySelector<HTMLElement>('#journal-list')!
  const clues = dialog.querySelector<HTMLElement>('#journal-clues')!
  const tabs = Array.from(dialog.querySelectorAll<HTMLButtonElement>('[data-page]'))
  let page: Page = 'fish'
  let latest: Snapshot | undefined
  let known: Journal | undefined
  let shown = ''

  function render() {
    if (!latest || !dialog.open) return
    const state = latest
    const key = JSON.stringify([page, state.journal, state.players.map(({ name }) => name)])
    if (key === shown) return
    shown = key
    const { pages, recorded, total } = journalTally(state.journal)
    tally.textContent = `${recorded} observation XP · ${recorded} of ${total} recorded`
    const completed = outingCount(state.journal)
    for (const tab of tabs) {
      const name = tab.dataset.page as Page
      tab.setAttribute('aria-pressed', String(name === page))
      tab.querySelector('span')!.textContent = name === 'outing'
        ? `${completed} of ${outingIds.length}` : `${pages[name].recorded} of ${pages[name].total}`
    }
    const outing = page === 'outing'
    clues.hidden = !outing
    if (outing) {
      const leads = state.journal.heardMara
        ? [...fieldLeads, ...(completed ? [rainLead] : [])]
        : ['Find Mara at the small fishing dock during the day, or at her porch by the depot trail in the evening.']
      clues.replaceChildren(...leads.map(line => {
        const item = document.createElement('li')
        item.textContent = line
        return item
      }))
    }
    const entries = outing ? outingIds.map(id => journalEntry(id)!) : journalCatalog.filter(entry =>
      entry.page === page && (!entry.parent || state.journal.entries[entry.parent] || state.journal.entries[entry.id]))
    list.replaceChildren(...entries.map(entry => row(state, entry, outing)))
  }

  function open() {
    if (dialog.open || !canOpen()) return
    pause()
    dialog.showModal()
    render()
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      page = tab.dataset.page as Page
      render()
    })
  }
  button.addEventListener('click', open)
  window.addEventListener('keydown', (event) => {
    if (event.code !== 'KeyJ' || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return
    event.preventDefault()
    if (dialog.open) dialog.close()
    else open()
  })

  return {
    dialog,
    // Keeps the open page current, and returns a line to announce when this snapshot brought something new.
    update(state: Snapshot, player: Player, earlier: Player | undefined) {
      const before = known
      latest = state
      known = state.journal
      button.disabled = false
      render()
      const found = earlier && starterDiscoveries.find(({ id }) => player.discoveries.includes(id) && !earlier.discoveries?.includes(id))
      if (found) return `Discovered ${found.name}`
      const confirmed = before && outingIds.find(key => state.journal.entries[key]?.outing && !before.entries[key]?.outing)
      if (confirmed) {
        const { outing } = state.journal.entries[confirmed]
        const name = outingSubjects[confirmed].name
        return confirmed === 'place:shellglass' && outing ? `${name} · ${shellglassTideAt(outing.t).phase}` : `Outing · ${name} recorded`
      }
      const added = before && Object.keys(state.journal.entries).find(id => !before.entries[id])
      const entry = added ? journalEntry(added) : undefined
      if (!added || !entry) return undefined
      const subject = entry.parent ? `${journalEntry(entry.parent)?.name} · ${entry.name.toLowerCase()}` : entry.name
      const by = state.journal.entries[added].first?.by
      return by === undefined || by === player.id ? `Journal · ${subject} recorded` : `${crewName(state, by)} recorded ${subject} in the journal`
    },
  }
}
