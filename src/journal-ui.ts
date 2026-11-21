import { journalCatalog, journalEntry, type JournalEntry, type JournalPage } from './journal/catalog'
import { journalTally, noteConditions, placeName, type Journal } from './journal/journal'
import type { Player, Snapshot } from './protocol'
import { starterDiscoveries } from './scenery'

const crewName = (state: Snapshot, id: number) => state.players.find((player) => player.id === id)?.name || `Crew ${id + 1}`

export function catchLabel(fish: string | undefined) {
  const name = fish && journalEntry(fish)?.name
  return name ? `Caught a ${name}` : undefined
}

// One line of the page: a pencilled box, the entry's name once recorded or its clue until then, and when and where it was noted.
function row(state: Snapshot, entry: JournalEntry) {
  const note = state.journal[entry.id]
  const item = document.createElement('li')
  item.className = entry.parent ? 'journal-row journal-behavior' : 'journal-row'
  item.toggleAttribute('data-recorded', Boolean(note))
  const box = document.createElement('span')
  box.className = 'journal-box'
  box.setAttribute('aria-hidden', 'true')
  box.textContent = note ? '✓' : ''
  const text = document.createElement('div')
  const title = document.createElement('strong')
  // The box is decoration. The words carry whether the line is filled in.
  title.textContent = note ? `${entry.name} · recorded` : `Not yet recorded · ${entry.clue}`
  text.append(title)
  if (note) {
    const detail = document.createElement('small')
    detail.textContent = [noteConditions(note), placeName(note.at), crewName(state, note.by)].filter(Boolean).join(' · ')
    text.append(detail)
  }
  item.append(box, text)
  return item
}

// The crew's shared field journal: a paper checklist either player opens with J or the HUD button.
export function createJournalPage(dialog: HTMLDialogElement, button: HTMLButtonElement, canOpen: () => boolean, pause: () => void) {
  const tally = dialog.querySelector<HTMLElement>('#journal-tally')!
  const list = dialog.querySelector<HTMLElement>('#journal-list')!
  const tabs = Array.from(dialog.querySelectorAll<HTMLButtonElement>('[data-page]'))
  let page: JournalPage = 'fish'
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
    tally.textContent = `${recorded} of ${total} recorded by the crew`
    for (const tab of tabs) {
      const name = tab.dataset.page as JournalPage
      tab.setAttribute('aria-pressed', String(name === page))
      tab.querySelector('span')!.textContent = `${pages[name].recorded} of ${pages[name].total}`
    }
    // A behavior stays off the page until its animal has been recorded.
    list.replaceChildren(...journalCatalog.filter((entry) => entry.page === page && (!entry.parent || state.journal[entry.parent]))
      .map((entry) => row(state, entry)))
  }

  function open() {
    if (dialog.open || !canOpen()) return
    pause()
    dialog.showModal()
    render()
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      page = tab.dataset.page as JournalPage
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
      const added = before && Object.keys(state.journal).find((id) => !before[id])
      const entry = added ? journalEntry(added) : undefined
      if (!added || !entry) return undefined
      const subject = entry.parent ? `${journalEntry(entry.parent)?.name} · ${entry.name.toLowerCase()}` : entry.name
      const by = state.journal[added].by
      return by === player.id ? `Journal · ${subject} recorded` : `${crewName(state, by)} recorded ${subject} in the journal`
    },
  }
}
