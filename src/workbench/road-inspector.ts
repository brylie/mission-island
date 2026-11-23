import { roadKinds } from '../assets/geometry/route-profiles.ts'
import { dotAlongs, type RoadAnalysis, type RoadWarning } from './road-analysis.ts'
import type { RoadDraftRoad } from './road-draft.ts'

// The road designer's controls beside the map: what they show for the selected road
// and dot, which are enabled, the summary, the long-section readout and the warnings.
// Lists are rebuilt only when what they list changes, and text only set when it
// changes, so keyboard focus stays put and the live summary is not re-announced.

const percent = 100
// Cut or fill shallower than this, in metres, reads as the road lying on the ground.
const onGroundM = 0.05

interface InspectorState {
  roads: readonly RoadDraftRoad[]
  road?: RoadDraftRoad
  analysis?: RoadAnalysis
  dot?: number
  hoverAlong?: number
  markedWarning?: string
  canUndo: boolean
  canRedo: boolean
  // A drag changes the length every frame; the polite summary waits for the drop.
  dragging: boolean
  onWarning: (warning: RoadWarning) => void
}

const element = <T extends HTMLElement>(root: HTMLElement, selector: string) => root.querySelector<T>(selector)!

export function setText(target: HTMLElement, text: string) {
  if (target.textContent !== text) target.textContent = text
}

const listKeys = new WeakMap<HTMLElement, string>()
function rebuild(target: HTMLElement, key: string, build: () => Node[]) {
  if (listKeys.get(target) === key) return
  listKeys.set(target, key)
  target.replaceChildren(...build())
}

export function roadSummary(road: RoadDraftRoad | undefined, analysis: RoadAnalysis | undefined) {
  if (!road || !analysis) return 'No road selected. Choose New road, then click two points on the map.'
  const length = Math.round(analysis.graded.profile.at(-1)?.along ?? 0)
  const { warnings, warningTotal } = analysis
  const problems = !warningTotal ? 'no problems' : warningTotal > warnings.length ? `${warnings.length} shown of ${warningTotal} problems` : `${warningTotal} to fix`
  return `${road.name}: ${road.points.length} dots · ${length} m · ${problems}`
}

const grade = (value: number) => `${Math.round(Math.abs(value) * percent)}%`

// What the long section reads at the marked spot, or where the road is steepest.
export function sectionReadout(analysis: RoadAnalysis | undefined, hoverAlong: number | undefined) {
  const profile = analysis?.graded.profile
  if (!analysis || !profile?.length) return ''
  const at = hoverAlong === undefined ? -1 : profile.findIndex((sample) => sample.along >= hoverAlong)
  if (at < 0) {
    const steepest = profile.reduce((best, sample, i) => Math.abs(sample.grade) > Math.abs(profile[best].grade) ? i : best, 0)
    return `Steepest: ${grade(profile[steepest].grade)} at ${Math.round(profile[steepest].along)} m (limit ${grade(analysis.limits[steepest])}). Hover the long section to read a spot.`
  }
  const sample = profile[at]
  const earth = Math.abs(sample.cut) < onGroundM ? 'on the ground' : `${sample.cut > 0 ? 'cut' : 'fill'} ${Math.abs(sample.cut).toFixed(1)} m`
  return `At ${Math.round(sample.along)} m: grade ${grade(sample.grade)} (limit ${grade(analysis.limits[at])}), road ${sample.y.toFixed(1)} m, ground ${sample.ground.toFixed(1)} m, ${earth}.`
}

// The hint beside Stretch limit: why it is disabled, or which stretch it sets.
export function stretchHint(road: RoadDraftRoad | undefined, stretch: number | undefined) {
  if (!road || stretch === undefined) return 'Select a dot to set its stretch limit'
  return `Dot ${stretch + 1} to the next; empty uses the ${road.kind.replace('-', ' ')} limit, ${grade(roadKinds[road.kind].maxGrade)}`
}

function renderRoadFields(root: HTMLElement, { roads, road }: InspectorState) {
  const select = element<HTMLSelectElement>(root, '.road-select')
  rebuild(select, JSON.stringify(roads.map((entry) => [entry.id, entry.name])), () => roads.map((entry) => new Option(entry.name, entry.id)))
  select.value = road?.id ?? ''
  for (const field of root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('[data-needs-road]')) field.disabled = !road
  const position = road ? roads.indexOf(road) : -1
  element<HTMLButtonElement>(root, '.road-move-up').disabled = position <= 0
  element<HTMLButtonElement>(root, '.road-move-down').disabled = position < 0 || position >= roads.length - 1
  const name = element<HTMLInputElement>(root, '.road-name')
  if (document.activeElement !== name) name.value = road?.name ?? ''
  element<HTMLSelectElement>(root, '.road-kind').value = road?.kind ?? 'fire-road'
}

function renderDotFields(root: HTMLElement, { road, analysis, dot, canUndo, canRedo }: InspectorState) {
  const dotSelect = element<HTMLSelectElement>(root, '.road-dot')
  const alongs = road && analysis ? dotAlongs(analysis, road.points.length).map(Math.round) : []
  rebuild(dotSelect, JSON.stringify([road?.id, alongs]), () => [new Option('No dot', ''), ...alongs.map((along, i) => new Option(`Dot ${i + 1} · ${along} m`, String(i)))])
  dotSelect.value = dot === undefined ? '' : String(dot)
  const stretch = road && dot !== undefined ? Math.min(dot, road.bends.length - 1) : undefined
  const limit = element<HTMLInputElement>(root, '.road-grade')
  limit.disabled = stretch === undefined
  if (document.activeElement !== limit) limit.value = road && stretch !== undefined ? String(Math.round((road.maxGrade?.[stretch] ?? roadKinds[road.kind].maxGrade) * percent)) : ''
  setText(element(root, '.road-hint'), stretchHint(road, stretch))
  element<HTMLButtonElement>(root, '.road-suggest').disabled = !road || dot === undefined || dot >= road.points.length - 1
  element<HTMLButtonElement>(root, '.road-delete-dot').disabled = dot === undefined
  element<HTMLButtonElement>(root, '.road-undo').disabled = !canUndo
  element<HTMLButtonElement>(root, '.road-redo').disabled = !canRedo
}

function renderWarnings(root: HTMLElement, { road, analysis, markedWarning, onWarning }: InspectorState) {
  const warnings = analysis?.warnings ?? []
  const list = element(root, '.road-warnings')
  rebuild(list, JSON.stringify([road?.id, warnings]), () => warnings.map((warning) => {
    const item = document.createElement('li')
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = warning.text
    button.addEventListener('click', () => onWarning(warning))
    item.append(button)
    return item
  }))
  // The marked warning says so to a screen reader, and is drawn as pressed.
  for (const button of list.querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.textContent === markedWarning))
}

export function renderInspector(root: HTMLElement, state: InspectorState) {
  renderRoadFields(root, state)
  renderDotFields(root, state)
  if (!state.dragging) setText(element(root, '.road-summary'), roadSummary(state.road, state.analysis))
  setText(element(root, '.road-readout'), sectionReadout(state.analysis, state.hoverAlong))
  renderWarnings(root, state)
}

// A press that disables its own button (Undo with nothing left, Move up at the top) would
// drop focus to the page; move it to the nearest control in the same row, or to `fallback`.
export function keepFocus(target: EventTarget | null, fallback: HTMLElement) {
  if (!(target instanceof HTMLButtonElement) || !target.disabled) return
  const row = [...target.parentElement?.querySelectorAll<HTMLButtonElement | HTMLSelectElement>('button, select') ?? []]
  const at = row.indexOf(target)
  const next = [...row.slice(at + 1), ...row.slice(0, at).reverse()].find((control) => !control.disabled)
  ;(next ?? fallback).focus()
}
