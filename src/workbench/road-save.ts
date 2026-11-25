import { readStorage, writeStorage } from '../browser-storage'
import { roadSavePath, workbenchSaveHeader } from '../workbench-save-contract'
import type { createRoadDraft } from './road-draft'

// Save to source for the road designer. It asks twice when roads.ts has changed since the
// draft began, and its notice outlives the dev server restart a save causes: roads.ts feeds
// the terrain the dev server's config bakes, so Vite restarts and the page reloads.

type Draft = ReturnType<typeof createRoadDraft>
type Say = (text: string) => void

const noticeKey = 'mission-island-road-save-notice'
const savedNotice = 'Saved to src/worlds/starter/layout/roads.ts. The dev server restarts to load it, which drops connected crews; the island is checkpointed, so they can rejoin. Next, run npm run island:plant to re-plant Highwood clear of the roads, and commit both files.'

let confirmOverwrite = false

// Any action other than Save cancels a pending "press Save again".
export function cancelOverwrite() {
  confirmOverwrite = false
}

export async function saveRoads(draft: Draft, say: Say) {
  if (draft.sourceChanged() && !confirmOverwrite) {
    confirmOverwrite = true
    say('roads.ts has changed since this draft began, so saving would overwrite newer roads. Press Save to source again to overwrite them, or Discard draft to start from the new roads.')
    return
  }
  confirmOverwrite = false
  say('Saving…')
  try {
    const response = await fetch(roadSavePath, { method: 'POST', headers: { 'content-type': 'application/json', [workbenchSaveHeader]: 'save' }, body: JSON.stringify(draft.roads()) })
    if (!response.ok) {
      say(`Not saved: ${await response.text()}`)
      return
    }
    draft.markSaved()
    writeStorage('sessionStorage', noticeKey, savedNotice)
    say(savedNotice)
  }
  catch {
    say('Not saved: the dev server is not running. Use Download instead.')
  }
}

// Shows the notice of a save made just before the page reloaded, once.
export function sayPendingNotice(say: Say) {
  const notice = readStorage('sessionStorage', noticeKey)
  if (!notice) return
  writeStorage('sessionStorage', noticeKey, null)
  say(notice)
}
