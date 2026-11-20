import './style.css'
import { Engine } from '@babylonjs/core/Engines/engine'
import { Color4 } from '@babylonjs/core/Maths/math.color'
import { readStorage, writeStorage } from '../browser-storage'
import { entries as initialEntries } from './catalog'
import type { Control, Values } from './catalog'
import { createStage } from './stage'
import type { Angle, CameraState } from './stage'
import { landscapeViews } from './landscape-views'
import { createLandscapeDraft, draftStorageKey } from './landscape-draft'
import { createLandscapeMap } from './landscape-map'
import { createLandscapeStudies } from './landscape-studies'
import { parseLandscapeShot } from './landscape-shot'
import type { LandscapeShot } from './landscape-shot'
import { lightingPresets } from './lighting'
import type { LightingPreset } from './lighting'

function element<T extends HTMLElement = HTMLElement>(id: string) {
  const target = document.getElementById(id)
  if (!target) throw new Error(`Missing #${id}`)
  return target as T
}

const canvas = element<HTMLCanvasElement>('stage')
const library = element('asset-list')
const inspector = element('asset-controls')
const playback = element('playback')
const play = element<HTMLButtonElement>('play')
const slider = element<HTMLInputElement>('time')
const timecode = element<HTMLOutputElement>('timecode')
const rateSelect = element<HTMLSelectElement>('rate')
const lightSelect = element<HTMLSelectElement>('lighting')
const scenicView = element<HTMLSelectElement>('landscape-view')
const grid = element<HTMLInputElement>('grid')
const wireframe = element<HTMLInputElement>('wireframe')
const turntable = element<HTMLInputElement>('turntable')
const status = element('stage-error')
const checkZFighting = element<HTMLButtonElement>('check-z-fighting')
const zFightingResult = element('z-fighting-result')
const storeKey = 'mission-island-workbench'

interface SavedView {
  id: string
  options: Record<string, Values>
  camera?: CameraState
  time: number
  playing: boolean
  speed: number
  lighting: LightingPreset
  grid: boolean
  wireframe: boolean
  turntable: boolean
}

function readSavedView(): Partial<SavedView> {
  try {
    return JSON.parse(readStorage('sessionStorage', storeKey) ?? '{}') as Partial<SavedView>
  } catch {
    return {}
  }
}

const saved = readSavedView()
const draft = createLandscapeDraft(readStorage('localStorage', draftStorageKey))
let entries = initialEntries
let createPreviewStage = createStage
const requested = () => location.hash.slice(1).split('?')[0]
let asset = entries.find(({ id }) => id === (requested() || saved.id)) ?? entries[0]
const optionsByAsset = saved.options ?? {}
let values: Values = {}
let time = Number.isFinite(saved.time) ? Math.max(0, Number(saved.time)) : 0
let playing = saved.playing ?? true
let seek = true
let stage: ReturnType<typeof createStage> | undefined
let engine: Engine | undefined

rateSelect.value = ['0.25', '0.5', '1', '2'].includes(String(saved.speed)) ? String(saved.speed) : '1'
lightSelect.value = saved.lighting && saved.lighting in lightingPresets ? saved.lighting : 'daylight'
grid.checked = saved.grid ?? true
wireframe.checked = saved.wireframe ?? false
turntable.checked = saved.turntable ?? false
scenicView.append(...Object.entries(landscapeViews).map(([id, view]) => new Option(view.label, id)))

function reportError(text: string) {
  status.textContent = text
  status.hidden = !text
}

function remember() {
  const view: SavedView = {
    id: asset.id, options: optionsByAsset, camera: stage?.getCamera(), time, playing,
    speed: Number(rateSelect.value), lighting: lightSelect.value as LightingPreset,
    grid: grid.checked, wireframe: wireframe.checked, turntable: turntable.checked,
  }
  writeStorage('sessionStorage', storeKey, JSON.stringify(view))
}

function restoreOptions(controls: readonly Control[] = [], previous: Values = {}): Values {
  return Object.fromEntries(controls.map((control) => {
    const value = previous[control.key]
    if (control.type === 'select' && typeof value === 'string' && Object.hasOwn(control.choices, value)) {
      return [control.key, value]
    }
    if ((control.type === 'range' || control.type === 'number') && typeof value === 'number' && Number.isFinite(value)) {
      return [control.key, Math.min(control.max, Math.max(control.min, value))]
    }
    if (control.type === 'color' && typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) {
      return [control.key, value]
    }
    if (control.type === 'checkbox' && typeof value === 'boolean') return [control.key, value]
    return [control.key, control.value]
  }))
}

function renderLibrary() {
  const groups = new Map<string, HTMLElement>()
  library.replaceChildren()
  for (const entry of entries) {
    let group = groups.get(entry.group)
    if (!group) {
      group = document.createElement('section')
      group.className = 'asset-group'
      const title = document.createElement('h3')
      title.textContent = entry.group
      group.append(title)
      groups.set(entry.group, group)
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

function selectLibraryAsset() {
  for (const link of library.querySelectorAll('a.asset-link')) {
    if (link.getAttribute('href') === `#${asset.id}`) link.setAttribute('aria-current', 'true')
    else link.removeAttribute('aria-current')
  }
}

function renderAssetControls() {
  inspector.replaceChildren()
  for (const control of asset.controls ?? []) {
    const row = document.createElement('label')
    const name = document.createElement('span')
    name.textContent = control.label
    name.id = `asset-setting-${control.key}`

    if (control.type === 'select') {
      row.className = 'row'
      const select = document.createElement('select')
      select.setAttribute('aria-labelledby', name.id)
      for (const [value, title] of Object.entries(control.choices)) {
        const option = document.createElement('option')
        option.value = value
        option.textContent = title
        select.append(option)
      }
      select.value = String(values[control.key])
      select.addEventListener('change', () => setOption(control, select.value))
      row.append(name, select)
    } else {
      const input = document.createElement('input')
      input.type = control.type
      input.setAttribute('aria-labelledby', name.id)
      if ((control.key === 'sunShafts' || control.key === 'shaftIntensity') && !stage?.supportsSunShafts) {
        input.disabled = true
        row.title = 'Volumetric sunlight requires WebGL 2 with shadow map filtering.'
      }
      if (control.type === 'checkbox') {
        row.className = 'checkbox-row'
        input.checked = Boolean(values[control.key])
        input.addEventListener('change', () => setOption(control, input.checked))
        row.append(input, name)
      } else {
        if (control.type === 'number') {
          row.className = 'row'
          input.min = String(control.min)
          input.max = String(control.max)
          input.step = String(control.step)
          input.value = String(values[control.key])
          input.addEventListener('input', () => {
            const next = input.valueAsNumber
            if (Number.isFinite(next) && next >= control.min && next <= control.max) setOption(control, next, false)
          })
          input.addEventListener('change', () => {
            const next = input.valueAsNumber
            input.value = String(Number.isFinite(next) ? Math.max(control.min, Math.min(control.max, next)) : values[control.key])
            setOption(control, input.valueAsNumber)
          })
          row.append(name, input)
        } else if (control.type === 'range') {
          row.className = 'range-row'
          input.min = String(control.min)
          input.max = String(control.max)
          input.step = String(control.step)
          input.value = String(values[control.key])
          const value = document.createElement('output')
          value.textContent = input.value
          input.addEventListener('input', () => {
            value.textContent = input.value
            if (!control.rebuild) setOption(control, input.valueAsNumber, false)
          })
          if (control.rebuild) {
            input.addEventListener('change', () => setOption(control, input.valueAsNumber))
          } else {
            input.addEventListener('change', remember)
          }
          row.append(name, value, input)
        } else {
          row.className = 'row'
          input.value = String(values[control.key])
          input.addEventListener('input', () => setOption(control, input.value, false))
          input.addEventListener('change', remember)
          row.append(name, input)
        }
      }
    }
    inspector.append(row)
  }
}

function setOption(control: Control, value: Values[string], save = true) {
  values[control.key] = value
  zFightingResult.replaceChildren()
  seek = true
  if (control.rebuild) rebuild(stage?.getCamera())
  if (save) remember()
}

function renderPlayback() {
  slider.value = String(time)
  timecode.value = `${time.toFixed(2)} s`
  const buttonText = playing ? 'Pause' : 'Play'
  if (play.textContent !== buttonText) play.textContent = buttonText
}

function applyDisplay() {
  stage?.setLighting(lightSelect.value as LightingPreset)
  stage?.setGrid(grid.checked)
  stage?.setWireframe(wireframe.checked)
  element('grid-size').textContent = grid.checked && stage ? `Grid ${stage.step} m` : ''
}

function rebuild(camera?: CameraState) {
  if (!engine) {
    studies.setScene(Boolean(asset.landscape), false)
    landscapeMap.setScene(Boolean(asset.landscape), false)
    return
  }
  stage?.dispose()
  stage = undefined
  zFightingResult.replaceChildren()
  checkZFighting.disabled = true
  reportError('')
  try {
    stage = createPreviewStage(engine, canvas, asset, values, reportError, draft)
    checkZFighting.disabled = false
    if (camera) stage.setCamera(camera)
    applyDisplay()
    element('geometry').textContent = `${stage.meshCount} ${stage.meshCount === 1 ? 'mesh' : 'meshes'} · ${stage.triangles.toLocaleString()} triangles`
  } catch (error) {
    reportError(error instanceof Error ? error.message : 'Could not open the selected preview.')
    element('geometry').textContent = ''
  }
  seek = true
  studies.setScene(Boolean(asset.landscape), Boolean(stage))
  landscapeMap.setScene(Boolean(asset.landscape), Boolean(stage))
}

function loadAsset(camera?: CameraState) {
  values = restoreOptions(asset.controls, optionsByAsset[asset.id])
  optionsByAsset[asset.id] = values
  element('asset-group').textContent = asset.group
  element('asset-title').textContent = asset.name
  element('asset-description').textContent = asset.description
  element('source-file').textContent = asset.source
  element('asset-inspector').hidden = !asset.controls?.length
  element('lighting-row').hidden = Boolean(asset.landscape)
  element('landscape-view-row').hidden = !asset.landscape
  playback.hidden = !asset.duration
  slider.max = String(asset.duration ?? 0)
  time = Math.min(time, asset.duration ?? 0)
  selectLibraryAsset()
  renderPlayback()
  rebuild(camera)
  renderAssetControls()
}

function seekTo(value: number) {
  time = Math.max(0, Math.min(asset.duration ?? 0, value))
  zFightingResult.replaceChildren()
  seek = true
  renderPlayback()
}

function restoreStudy(shot: LandscapeShot, framingOnly = false) {
  const options = framingOnly
    ? { ...values, x: shot.options.x, z: shot.options.z, focusHeight: shot.options.focusHeight }
    : shot.options
  Object.assign(values, restoreOptions(asset.controls, options))
  if (!framingOnly) {
    grid.checked = shot.grid
    wireframe.checked = shot.wireframe
  }
  playing = turntable.checked = false
  seekTo(shot.time)
  stage?.setCamera(shot.camera, values)
  renderAssetControls()
  applyDisplay()
  remember()
}

const studies = createLandscapeStudies(canvas, {
  frame: () => asset.landscape && stage
    ? { camera: stage.getCamera(), time, options: { ...values }, grid: grid.checked, wireframe: wireframe.checked }
    : undefined,
  restore: restoreStudy,
  pause() {
    playing = turntable.checked = false
    const camera = stage?.getCamera()
    if (camera) stage?.setCamera(camera, values)
    renderPlayback()
    remember()
  },
})

const landscapeMap = createLandscapeMap({
  focus: () => stage?.mapFocus(),
  placements: () => stage?.draftMapObjects() ?? [],
  move: (id, point) => stage?.moveDraftAt(id, point) ?? false,
  select: (id) => stage?.selectDraft(id),
  shots: studies.shots,
  openShot: studies.openShot,
  place: (point) => stage?.placeDraftAt(point) ?? false,
  jump(point) {
    Object.assign(values, point, { focusHeight: 0.25 })
    studies.hideComparison()
    stage?.setView('perspective', values)
    zFightingResult.replaceChildren()
    renderAssetControls()
    remember()
  },
})

function openLinkedStudy() {
  if (!asset.landscape) return false
  const url = new URL(location.href)
  const serialized = new URLSearchParams(url.hash.split('?')[1]).get('shot')
  if (serialized === null) return false
  const shot = parseLandscapeShot(serialized)
  if (shot) restoreStudy(shot)
  studies.showStatus(shot ? `Opened ${shot.name} from a shot link.` : 'This shot link could not be opened.')
  // Apply explicit links once. Reloads during editing restore the working view.
  url.searchParams.delete('view')
  url.hash = 'landscape'
  history.replaceState(history.state, '', url)
  return true
}

function openLandscapeView(id: string) {
  if (!asset.landscape || !Object.hasOwn(landscapeViews, id)) return
  const view = landscapeViews[id]
  Object.assign(values, {
    x: view.focus.x, z: view.focus.z, focusHeight: view.focus.height,
    hour: view.hour, rain: 0, sunShafts: true, shaftIntensity: 100,
  })
  stage?.setLandscapeView(view)
  grid.checked = wireframe.checked = turntable.checked = false
  playing = false
  seekTo(view.time)
  renderAssetControls()
  applyDisplay()
  remember()
}

scenicView.addEventListener('change', () => {
  openLandscapeView(scenicView.value)
  scenicView.value = ''
})

window.addEventListener('hashchange', () => {
  const next = entries.find(({ id }) => id === requested())
  if (!next) return
  if (next !== asset) {
    asset = next
    time = 0
    playing = true
    loadAsset()
  }
  openLinkedStudy()
  remember()
})
window.addEventListener('pagehide', remember)
canvas.addEventListener('contextmenu', (event) => event.preventDefault())
canvas.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || !asset.duration) return
  event.preventDefault()
  if (!event.repeat) play.click()
})
play.addEventListener('click', () => {
  if (!playing && time >= (asset.duration ?? 0)) seekTo(0)
  playing = !playing
  if (playing) zFightingResult.replaceChildren()
  renderPlayback()
  remember()
})
element('restart').addEventListener('click', () => seekTo(0))
element('step').addEventListener('click', () => {
  playing = false
  seekTo(time + 1 / 60)
})
slider.addEventListener('input', () => {
  playing = false
  seekTo(slider.valueAsNumber)
})
checkZFighting.addEventListener('click', () => {
  if (!stage) return
  if (asset.duration) {
    playing = false
    renderPlayback()
  }
  stage.draw(time, 0, seek, values, false, 0)
  seek = false
  const candidates = stage.checkZFighting()
  const summary = document.createElement('p')
  summary.textContent = candidates.length
    ? `${candidates.length} overlapping ${candidates.length === 1 ? 'mesh pair' : 'mesh pairs'} to inspect.`
    : 'No overlapping faces detected.'
  zFightingResult.replaceChildren(summary)
  if (!candidates.length) return
  const list = document.createElement('ul')
  for (const { first, second, at } of candidates) {
    const item = document.createElement('li')
    item.textContent = `${first} and ${second} near (${at.asArray().map((value) => value.toFixed(2)).join(', ')})`
    list.append(item)
  }
  zFightingResult.append(list)
})
for (const control of [grid, wireframe, turntable, rateSelect, lightSelect]) {
  control.addEventListener('change', () => {
    applyDisplay()
    remember()
  })
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-angle]')) {
  button.addEventListener('click', () => {
    stage?.setView(button.dataset.angle as Angle)
    remember()
  })
}
element('reset').addEventListener('click', () => {
  values = restoreOptions(asset.controls)
  optionsByAsset[asset.id] = values
  rebuild(asset.landscape ? undefined : stage?.getCamera())
  renderAssetControls()
  remember()
})

let resize: ResizeObserver | undefined
try {
  engine = new Engine(canvas, true, { stencil: true })
  resize = new ResizeObserver(() => engine?.resize())
  resize.observe(element('viewport'))
} catch (error) {
  reportError(error instanceof Error ? error.message : 'This browser could not start the 3D preview.')
}
renderLibrary()
loadAsset(saved.id === asset.id ? saved.camera : undefined)
const initialUrl = new URL(location.href)
const initialView = initialUrl.searchParams.get('view')
if (!openLinkedStudy() && asset.landscape && initialView && Object.hasOwn(landscapeViews, initialView)) {
  openLandscapeView(initialView)
  initialUrl.searchParams.delete('view')
  history.replaceState(history.state, '', initialUrl)
}
engine?.runRenderLoop(() => {
  if (!engine) return
  if (!stage) {
    engine.clear(Color4.FromHexString('#1b292aff'), true, true, true)
    return
  }
  const delta = Math.min(0.08, engine.getDeltaTime() / 1000)
  const rate = playing ? Number(rateSelect.value) : 0
  if (rate > 0 && asset.duration && !seek) {
    time += delta * rate
    if (time >= asset.duration) {
      time %= asset.duration
      seek = true
    }
    renderPlayback()
  }
  stage.draw(time, rate, seek, values, turntable.checked, delta)
  seek = false
  studies.afterDraw()
  landscapeMap.update()
})

if (import.meta.hot) {
  import.meta.hot.accept('./catalog', (changed) => {
    const module = changed as typeof import('./catalog') | undefined
    if (!module) return
    const camera = stage?.getCamera()
    entries = module.entries
    asset = entries.find(({ id }) => id === asset.id) ?? entries[0]
    renderLibrary()
    loadAsset(camera)
  })
  import.meta.hot.accept('./stage', (changed) => {
    const module = changed as typeof import('./stage') | undefined
    if (!module) return
    createPreviewStage = module.createStage
    rebuild(stage?.getCamera())
  })
  import.meta.hot.dispose(() => {
    remember()
    studies.dispose()
    landscapeMap.dispose()
    resize?.disconnect()
    stage?.dispose()
    engine?.dispose()
  })
}
