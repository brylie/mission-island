import { libraryResults, workspaceOf, workspaces, type Workspace } from './library'
import type { Entry } from './subject'

export function createLibraryPanel() {
  const library = document.getElementById('asset-list')!
  const workspaceSelect = document.querySelector<HTMLSelectElement>('#workspace-select')!
  const librarySearch = document.querySelector<HTMLInputElement>('#library-search')!
  const lastSubject = new Map<Workspace, string>()
  let entries: Entry[] = []
  let asset: Entry
  workspaceSelect.append(...Object.keys(workspaces).map((name) => new Option(name, name)))
  workspaceSelect.addEventListener('change', () => {
    librarySearch.value = ''
    const workspace = workspaceSelect.value as Workspace
    const next = lastSubject.get(workspace) ?? entries.find((entry) => workspaceOf(entry.group) === workspace)?.id
    if (next) location.hash = next
    renderLibrary()
  })
  librarySearch.addEventListener('input', renderLibrary)
  librarySearch.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') library.querySelector('a')?.click()
    if (event.key === 'Escape') {
      librarySearch.value = ''
      renderLibrary()
    }
  })

  function renderLibrary() {
    const groups = new Map<string, HTMLDetailsElement>()
    library.replaceChildren()
    const results = libraryResults(entries, workspaceSelect.value as Workspace, librarySearch.value)
    document.getElementById('library-results')!.textContent = librarySearch.value.trim()
      ? results.length ? `${results.length} across all workspaces` : 'No matching subjects'
      : ''
    document.getElementById('island-tour')!.hidden = workspaceSelect.value !== 'World' || Boolean(librarySearch.value.trim())
    for (const entry of results) {
      const label = librarySearch.value.trim() ? workspaceOf(entry.group) + ' / ' + entry.group : entry.group
      let group = groups.get(label)
      if (!group) {
        group = document.createElement('details')
        group.open = Boolean(librarySearch.value.trim()) || entry.group === asset.group
        group.className = 'asset-group'
        const title = document.createElement('summary')
        title.textContent = label
        group.append(title)
        groups.set(label, group)
        library.append(group)
      }
      const link = document.createElement('a')
      link.href = `#${entry.id}`
      link.className = 'asset-link'
      if (entry.id === asset.id) link.setAttribute('aria-current', 'true')
      if (entry.swatch) {
        const swatch = document.createElement('span')
        swatch.className = 'swatch'
        swatch.style.background = entry.swatch
        link.append(swatch)
      }
      link.append(entry.name)
      group.append(link)
    }
  }

  return {
    show(all: Entry[], selected: Entry) {
      if (asset && asset !== selected) librarySearch.value = ''
      entries = all
      asset = selected
      const workspace = workspaceOf(asset.group)
      workspaceSelect.value = workspace
      lastSubject.set(workspace, asset.id)
      renderLibrary()
    },
  }
}
