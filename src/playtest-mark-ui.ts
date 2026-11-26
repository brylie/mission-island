import type { Interaction } from './interaction-options'
import { buildMarkRecord } from './playtest-mark-record'
import { markBody, markLimits, playtestMarkPath, type MarkNotes } from './playtest-mark'
import type { createMarkView } from './playtest-mark-view'
import type { Snapshot } from './protocol'

// The M key in a dev or playtest build: grab the view and what the reticle is on, ask for two
// optional notes, and send the mark to the dev server, which saves it for a code agent to read.

const toastMs = 5000
const httpCreated = 201
// Esc waits for a save in flight, so a stalled dev server must turn into an error the tester can leave.
const saveTimeoutMs = 15_000
const millisecondsPerSecond = 1000
const emptyNotes: MarkNotes = { wrong: '', wanted: '' }
const noteRows = 3

// Every Starter Island layout file, so a mark can name the authored places around it.
const layoutFiles = import.meta.glob<Record<string, unknown>>(['./worlds/starter/layout/*.ts', './playtest-places.ts'], { eager: true })
const layout = Object.fromEntries(Object.entries(layoutFiles).map(([path, exports]) => [`src/${path.slice('./'.length)}`, exports]))

interface MarkOptions {
  token: () => string
  // Releases the mouse and stops the crew member before the dialog opens.
  pause: () => void
  // False while another dialog or a shader review holds the keyboard.
  ready: () => boolean
  // The joined crew member's island state and the reticle's interaction.
  crew: () => { state: Snapshot, id: number, focus?: Interaction } | undefined
  view: () => { mark: () => ReturnType<ReturnType<typeof createMarkView>['read']> } | undefined
}

function field(form: HTMLFormElement, id: string, label: string, hint: string) {
  const wrapper = document.createElement('label')
  wrapper.htmlFor = id
  wrapper.className = 'mark-field'
  const text = document.createElement('span')
  text.textContent = label
  const area = Object.assign(document.createElement('textarea'), { id, rows: noteRows, maxLength: markLimits.noteChars, placeholder: hint })
  wrapper.append(text, area)
  form.append(wrapper)
  return area
}

function createDialog() {
  const dialog = document.createElement('dialog')
  dialog.className = 'options-dialog mark-dialog'
  dialog.setAttribute('aria-labelledby', 'mark-title')
  const form = document.createElement('form')
  form.method = 'dialog'
  const title = Object.assign(document.createElement('h2'), { id: 'mark-title', textContent: 'Mark this for the code agent' })
  const subject = Object.assign(document.createElement('p'), { className: 'mark-subject' })
  const shot = Object.assign(document.createElement('img'), { className: 'mark-shot', alt: 'Screenshot that will be saved with this mark' })
  form.append(title, subject, shot)
  const wrong = field(form, 'mark-wrong', 'What is wrong here? (optional)', 'For example: the rock floats above the ground')
  const wanted = field(form, 'mark-wanted', 'What did you expect, or want to be different? (optional)', 'For example: it should sit in the soil, half buried')
  const help = Object.assign(document.createElement('p'), { id: 'mark-help', className: 'mark-help', textContent: 'Tab moves to the next question. Enter saves the mark, Shift+Enter starts a new line, and Esc discards it.' })
  // Enter saving from a multi-line field is unusual, so screen readers hear the rule with each field.
  for (const area of [wrong, wanted]) area.setAttribute('aria-describedby', help.id)
  const status = Object.assign(document.createElement('p'), { className: 'mark-status' })
  status.setAttribute('role', 'status')
  const actions = document.createElement('div')
  actions.className = 'join-name-actions'
  const save = Object.assign(document.createElement('button'), { type: 'submit', textContent: 'Save mark' })
  const discard = Object.assign(document.createElement('button'), { type: 'button', className: 'mark-discard', textContent: 'Discard' })
  actions.append(save, discard)
  form.append(help, status, actions)
  dialog.append(form)
  document.body.append(dialog)
  return { dialog, form, subject, shot, wrong, wanted, status, save, discard }
}

export function createPlaytestMarks(options: MarkOptions) {
  const view = createDialog()
  // The toast stays in the page and only its text changes, so screen readers announce each save.
  const toast = Object.assign(document.createElement('p'), { className: 'mark-toast' })
  toast.setAttribute('role', 'status')
  document.body.append(toast)
  let pending: { record: ReturnType<typeof buildMarkRecord>, image: Promise<string> } | undefined
  let toastTimer: ReturnType<typeof setTimeout> | undefined
  let saving = false

  function show(text: string) {
    toast.textContent = text
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toast.textContent = ''
    }, toastMs)
  }

  function capture() {
    const crew = options.crew()
    const player = crew?.state.players.find((entry) => entry.id === crew.id)
    const view = options.view()?.mark()
    if (!crew || !player || !view) return
    // A failed frame is reported when the mark is saved, not as an unhandled rejection now.
    view.screenshot.catch(() => undefined)
    const { state } = crew
    // Under a fixed dev camera the player's reticle points somewhere else.
    const focus = view.fixed ? undefined : crew.focus
    const record = buildMarkRecord({
      origin: location.origin,
      mode: import.meta.env.MODE,
      target: view.target,
      ...(focus && { interaction: { name: focus.name, label: focus.label, ...(focus.key && { key: focus.key }) } }),
      player: { name: player.name, x: player.x, y: player.y, z: player.z },
      camera: view.camera,
      weather: view.weather ?? state.weather,
      clock: view.clock,
      checkpoint: state.playtest?.checkpoint,
      layout,
    })
    return { record, image: view.screenshot }
  }

  async function send(mark: NonNullable<typeof pending>, notes: MarkNotes) {
    const response = await fetch(playtestMarkPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + options.token() },
      body: markBody(mark.record, notes, await mark.image),
      signal: AbortSignal.timeout(saveTimeoutMs),
    })
    const text = await response.text()
    if (response.status !== httpCreated) throw new Error(text || `The dev server answered ${response.status}.`)
    // The folder name is only for the notice; a saved mark with an odd reply is still saved.
    try {
      return (JSON.parse(text) as { name?: string }).name ?? ''
    }
    catch {
      return ''
    }
  }

  async function submit() {
    if (!pending || saving) return
    saving = true
    view.save.disabled = true
    view.discard.disabled = true
    view.status.textContent = 'Saving…'
    const { label } = pending.record
    view.status.removeAttribute('data-error')
    try {
      await send(pending, { wrong: view.wrong.value, wanted: view.wanted.value })
      pending = undefined
      view.dialog.close()
      show(`Mark saved: ${label}`)
    }
    catch (error) {
      const reason = (error as Error).name === 'TimeoutError' ? `The dev server did not answer within ${saveTimeoutMs / millisecondsPerSecond} seconds.` : (error as Error).message
      view.status.textContent = `Could not save the mark. ${reason}`
      view.status.setAttribute('data-error', '')
    }
    finally {
      saving = false
      view.save.disabled = false
      view.discard.disabled = false
    }
    // Disabling the focused Save button drops focus to the page; bring it back to the notes.
    if (view.dialog.open && !view.dialog.contains(document.activeElement)) view.wrong.focus()
  }

  view.form.addEventListener('submit', (event) => {
    event.preventDefault()
    void submit()
  })
  for (const area of [view.wrong, view.wanted]) {
    area.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
      event.preventDefault()
      void submit()
    })
  }
  view.discard.addEventListener('click', () => view.dialog.close())
  // Esc waits for a save in flight, so its result always lands in the dialog that sent it.
  view.dialog.addEventListener('cancel', (event) => {
    if (saving) event.preventDefault()
  })
  // The Controls list names the key only where marks exist.
  document.getElementById('mark-control')?.removeAttribute('hidden')
  view.dialog.addEventListener('close', () => {
    pending = undefined
    view.shot.removeAttribute('src')
  })

  // For agents and scripted checks: save a mark of the current view without the dialog.
  async function markNow(notes: Partial<MarkNotes> = {}) {
    const mark = capture()
    if (!mark) throw new Error('Join the island before marking.')
    return send(mark, { ...emptyNotes, ...notes })
  }
  Object.assign(window, { missionMarks: { mark: markNow } })

  function open() {
    if (view.dialog.open) return
    pending = capture()
    if (!pending) return
    options.pause()
    view.subject.textContent = `Looking at: ${pending.record.label}`
    view.wrong.value = ''
    view.wanted.value = ''
    view.status.textContent = ''
    view.status.removeAttribute('data-error')
    pending.image.then((src) => {
      view.shot.src = src
    }, (error: Error) => {
      view.status.textContent = `No screenshot: ${error.message}`
      view.status.setAttribute('data-error', '')
    })
    view.dialog.showModal()
    view.wrong.focus()
  }

  // M works under pointer lock and outside it; the game's own key handler ignores it.
  window.addEventListener('keydown', (event) => {
    if (event.code !== 'KeyM' || event.repeat || event.metaKey || event.ctrlKey || event.altKey || !options.ready()) return
    event.preventDefault()
    open()
  })

  return { dialog: view.dialog }
}
