import './style.css'
import { createVariationLibrary } from './variations'
import { readSubjectLink, subjectLink } from './subject-link'
import { starterFeatures } from '../worlds/starter/sites'
import { editedFeature, readSiteDrafts, saveSiteDraft } from './site-drafts'
import { workspaceOf } from './library'
import { createLibraryPanel } from './library-panel'
import { bindBiomeRecipes } from './biome-files'
import { biomeLink, codex, readRecipe, recipeFromLink } from '../biome-recipe'
import { dryMarketRainAge } from '../market-runoff'
import { bindPlaytestCopy, landscapeLink, landscapeWindow, readLandscapeView } from '../playtest-link'
import { Engine } from '@babylonjs/core/Engines/engine'
import { Color4 } from '@babylonjs/core/Maths/math.color'
import { readStorage, writeStorage } from '../browser-storage'
import { entries as initialEntries } from './catalog'
import { restoreOptions, type Control, type Values } from './subject'
import type { FieldSite } from './field-site'
import { createStage } from './stage'
import type { Angle, CameraState } from './stage'
import { landscapeViews } from './landscape-views'
import { createLandscapeDraft, draftLabels, draftStorageKey } from './landscape-draft'
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
const library = createLibraryPanel()
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
  field?: boolean
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

const shared = location.hash === '#landscape' ? readLandscapeView(new URLSearchParams(location.search)) : undefined
const saved = readSavedView()
const sharedRecipe = location.hash === '#biome' ? recipeFromLink(new URLSearchParams(location.search)) : undefined
if (sharedRecipe) {
  saved.options = { ...saved.options, biome: sharedRecipe }
  Object.assign(saved, { id: 'biome', camera: undefined, time: 0, playing: true })
}
if (shared) {
  const timeline = landscapeWindow(shared.time)
  saved.id = 'landscape'
  saved.camera = shared.camera
  saved.options = { ...saved.options, landscape: {
    x: shared.focus[0], z: shared.focus[1], hour: shared.hour, rain: shared.rain,
    marketRainAge: shared.marketRainAge ?? dryMarketRainAge, clockStart: timeline.start,
  } }
  Object.assign(saved, { time: timeline.time, playing: false, grid: shared.grid, wireframe: shared.wireframe, turntable: false })
}
const draft = createLandscapeDraft(readStorage('localStorage', draftStorageKey))
let entries = initialEntries
let createPreviewStage = createStage
const requested = () => location.hash.slice(1).split('?')[0]
let asset = entries.find(({ id }) => id === (requested() || saved.id)) ?? entries[0]
const fieldRequested = () => new URLSearchParams(location.hash.split('?')[1]).get('stage') === 'island'
let onIsland = Boolean(asset.fieldSite && (location.hash ? fieldRequested() : saved.field))
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
    id: asset.id, field: onIsland, options: optionsByAsset, camera: stage?.getCamera(), time, playing,
    speed: Number(rateSelect.value), lighting: lightSelect.value as LightingPreset,
    grid: grid.checked, wireframe: wireframe.checked, turntable: turntable.checked,
  }
  writeStorage('sessionStorage', storeKey, JSON.stringify(view))
  if (asset.id === 'biome' && new URLSearchParams(location.search).has('recipe')) {
    const link = biomeLink(location.href, readRecipe(values))
    if (link !== location.href) history.replaceState(null, '', link)
  }
}

function showFieldSwitch() {
  const site = asset.fieldSite?.(values)
  element('field-switch').hidden = !site
  element('asset-group').textContent = [workspaceOf(asset.group), asset.group, onIsland && site?.name].filter(Boolean).join(' / ')
  for (const [id, field] of [['inspect-alone', false], ['inspect-field', true]] as const) {
    const link = element<HTMLAnchorElement>(id)
    link.href = '#' + asset.id + (field ? '?stage=island' : '')
    if (onIsland === field) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  }
}

function renderAssetControls() {
  refreshActions()
  inspector.replaceChildren()
  let group = ''
  for (const control of asset.controls ?? []) {
    const organism = asset.id === 'biome' ? codex.find(item => item.key === control.key) : undefined
    const heading = organism?.group ?? 'Conditions'
    if (asset.id === 'biome' && heading !== group) {
      group = heading
      const title = document.createElement('h3')
      title.className = 'codex-group'
      title.textContent = group
      inspector.append(title)
    }
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
            if (!control.rebuild && Number.isFinite(next) && next >= control.min && next <= control.max) setOption(control, next, false)
          })
          input.addEventListener('change', () => {
            const next = control.step === 1 ? Math.round(input.valueAsNumber) : input.valueAsNumber
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
          if (control.rebuild) input.addEventListener('change', () => setOption(control, input.value))
          else {
            input.addEventListener('input', () => setOption(control, input.value, false))
            input.addEventListener('change', remember)
          }
          row.append(name, input)
        }
      }
    }
    inspector.append(row)
    if (organism) {
      const note = document.createElement('p')
      note.className = 'codex-note'
      note.id = 'note-' + organism.key
      note.textContent = organism.note
      row.querySelector('input')?.setAttribute('aria-describedby', note.id)
      inspector.append(note)
    }
  }
}

function refreshActions() {
  const panel = element('subject-actions')
  panel.replaceChildren()
  for (const action of asset.actions ?? []) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = action.label
    button.disabled = !action.enabled(values)
    button.addEventListener('click', () => {
      action.run(values)
      renderAssetControls()
      remember()
      panel.querySelector<HTMLButtonElement>('button:enabled')?.focus()
    })
    panel.append(button)
  }
}

function fieldSite() {
  return onIsland ? asset.fieldSite?.(values) : undefined
}

function cameraAtSameSite(previous?: FieldSite) {
  const next = fieldSite()
  if (previous?.offset.x === next?.offset.x && previous?.offset.y === next?.offset.y && previous?.offset.z === next?.offset.z) {
    return stage?.getCamera()
  }
}

function setOption(control: Control, value: Values[string], save = true) {
  const oldSite = fieldSite()
  values[control.key] = value
  if (asset.actions) refreshActions()
  zFightingResult.replaceChildren()
  seek = true
  if (control.rebuild) {
    rebuild(cameraAtSameSite(oldSite))
    showFieldSwitch()
  }
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
    stage = createPreviewStage(engine, canvas, asset, values, reportError, draft, fieldSite())
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
  const furnishing = starterFeatures.find(f => 'site-' + f.site === asset.id)
  const previous = optionsByAsset[asset.id] ?? (furnishing && readSiteDrafts()[furnishing.site])
  element('furnishing-draft').hidden = !furnishing
  element('furnishing-status').textContent = ''
  if (furnishing) element<HTMLAnchorElement>('return-to-landscape').href = '#landscape?site=' + furnishing.site
  values = restoreOptions(asset.controls, previous)
  if (asset.id === 'fish-school' && typeof previous?.route === 'string') values.route = previous.route
  element('return-to-biome').hidden = asset.id !== 'fish-school'
  if (asset.landscape && typeof previous?.clockStart === 'number' && Number.isFinite(previous.clockStart)) {
    values.clockStart = previous.clockStart
  }
  optionsByAsset[asset.id] = values
  showFieldSwitch()
  element('asset-title').textContent = asset.name
  element('asset-description').textContent = asset.description
  element('source-file').textContent = asset.source
  element('asset-inspector').hidden = !asset.controls?.length
  showVariations(asset.id, Boolean(!asset.landscape && asset.id !== 'biome'))
  element('subject-field').hidden = !asset.readout
  element('subject-readout').textContent = asset.readout ?? ''
  element('subject-observations').textContent = ''
  const biome = asset.id === 'biome'
  element('biome-presets').hidden = element('biome-field').hidden = !biome
  element('settings-heading').textContent = biome ? 'Habitat codex' : 'Asset settings'
  element('copy-playtest').textContent = biome ? 'Copy recipe link' : asset.landscape ? 'Copy playtest link' : 'Copy setup link'
  element('copy-status').textContent = ''
  element('playtest-url').hidden = true
  element('playtest-tools').hidden = false
  lightSelect.disabled = Boolean(asset.landscape) || biome
  element('lighting-row').hidden = Boolean(asset.landscape) || biome
  element('landscape-view-row').hidden = !asset.landscape
  playback.hidden = !asset.duration
  slider.max = String(asset.duration ?? 0)
  time = Math.min(time, asset.duration ?? 0)
  library.show(entries, asset)
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
  const clock = Number(shot.options.clockStart ?? 0) + shot.time
  const timeline = landscapeWindow(clock)
  values.clockStart = timeline.start
  seekTo(timeline.time)
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

element<HTMLSelectElement>('landscape-kind').replaceChildren(...Object.entries(draftLabels).map(([id, title]) => new Option(title, id)))
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

function openSubjectSetup() {
  if (asset.landscape || asset.id === 'biome') return false
  const setup = readSubjectLink(location.hash)
  if (!setup) return false
  const { shot, lighting } = setup
  optionsByAsset[asset.id] = shot.options
  grid.checked = shot.grid
  wireframe.checked = shot.wireframe
  lightSelect.value = lighting
  playing = turntable.checked = false
  time = shot.time
  loadAsset(shot.camera)
  history.replaceState(history.state, '', location.pathname + '#' + asset.id + (onIsland ? '?stage=island' : ''))
  remember()
  return true
}

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
    hour: view.hour, rain: 0, marketRainAge: dryMarketRainAge, clockStart: 0, sunShafts: true, shaftIntensity: 100,
  })
  stage?.setLandscapeView(view)
  grid.checked = wireframe.checked = turntable.checked = false
  playing = false
  seekTo(view.time)
  renderAssetControls()
  applyDisplay()
  remember()
}

const furnishSelect = element<HTMLSelectElement>('edit-furnishing')
furnishSelect.append(...starterFeatures.map(f => new Option(f.name, f.site)))
furnishSelect.addEventListener('change', () => {
  if (furnishSelect.value) location.hash = 'site-' + furnishSelect.value + '?stage=island'
  furnishSelect.value = ''
})
element('save-furnishing').addEventListener('click', () => {
  const site = starterFeatures.find(f => 'site-' + f.site === asset.id)
  if (site) element('furnishing-status').textContent = saveSiteDraft(site.site, values)
    ? 'Saved in this browser. The Landscape Workbench now uses this placement.' : 'Could not save this draft.'
})

element('export-furnishing').addEventListener('click', () => {
  const site = starterFeatures.find(f => 'site-' + f.site === asset.id)
  if (!site) return
  const json = JSON.stringify(editedFeature(site, values), null, 2)
  const url = URL.createObjectURL(new Blob([json + '\n'], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = site.site + '-placement.json'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})

function openFurnishingLocation() {
  if (!asset.landscape) return
  const id = new URLSearchParams(location.hash.split('?')[1]).get('site')
  const feature = starterFeatures.find(f => f.site === id)
  if (!feature) return
  const draft = readSiteDrafts()[feature.site]
  Object.assign(values, { x: feature.x + (draft?.east ?? 0), z: feature.z + (draft?.north ?? 0), focusHeight: .65 })
  stage?.setLandscapeView({ alpha: -.95, beta: 1.18, radius: 8 })
  renderAssetControls()
}

scenicView.addEventListener('change', () => {
  openLandscapeView(scenicView.value)
  scenicView.value = ''
})

window.addEventListener('hashchange', () => {
  const next = entries.find(({ id }) => id === requested())
  if (!next) return
  const field = Boolean(next.fieldSite && fieldRequested())
  if (next !== asset || field !== onIsland) {
    if (next !== asset) {
      time = 0
      playing = true
    }
    asset = next
    onIsland = field
    if (!openSubjectSetup()) loadAsset()
  } else openSubjectSetup()
  openLinkedStudy()
  openFurnishingLocation()
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
  const oldSite = fieldSite()
  const clockStart = values.clockStart
  values = restoreOptions(asset.controls)
  if (asset.landscape && typeof clockStart === 'number') values.clockStart = clockStart
  optionsByAsset[asset.id] = values
  rebuild(asset.landscape ? undefined : cameraAtSameSite(oldSite))
  showFieldSwitch()
  renderAssetControls()
  remember()
})

bindBiomeRecipes(() => readRecipe(values), recipe => {
  if (asset.id !== 'biome') return
  optionsByAsset.biome = { ...recipe }
  time = 0
  loadAsset(stage?.getCamera())
  remember()
})

function currentSetupLink() {
  if (asset.id === 'biome') return biomeLink(location.href, readRecipe(values))
  const camera = stage?.getCamera()
  if (!camera) return
  if (!asset.landscape) return subjectLink(location.href, asset.id, onIsland, {
    version: 1, name: asset.name, camera, time, options: values, grid: grid.checked, wireframe: wireframe.checked,
  }, lightSelect.value as LightingPreset)
  return landscapeLink(location.href, { focus: [Number(values.x), Number(values.z)], camera: { ...camera, fov: camera.fov ?? .8 },
    hour: Number(values.hour), rain: Number(values.rain), marketRainAge: Number(values.marketRainAge),
    time: Number(values.clockStart ?? 0) + time, grid: grid.checked, wireframe: wireframe.checked })
}
bindPlaytestCopy(currentSetupLink)
const showVariations = createVariationLibrary(currentSetupLink)

let resize: ResizeObserver | undefined
try {
  engine = new Engine(canvas, true, { stencil: true })
  resize = new ResizeObserver(() => engine?.resize())
  resize.observe(element('viewport'))
} catch (error) {
  reportError(error instanceof Error ? error.message : 'This browser could not start the 3D preview.')
}
if (!openSubjectSetup()) loadAsset(saved.id === asset.id && Boolean(saved.field) === onIsland ? saved.camera : undefined)
openFurnishingLocation()
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
    onIsland = Boolean(asset.fieldSite && fieldRequested())
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
