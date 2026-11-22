import { captureWeather, capturePresets, turntableAngles } from './assets/recipes/capture-presets.ts'
import { debugOverlays } from './debug-overlays/catalog.ts'
import { devViewParams, renderModes, type RenderMode } from './dev-view.ts'
import { landscapeLink } from './playtest-link.ts'
import { groundHeight } from './terrain.ts'

// Turns `npm run capture` arguments and the preset table into page URLs and sidecar metadata.
// It has no Node or browser imports, so tests check exactly what the CLI will open.

type CapturePresetId = keyof typeof capturePresets
type WeatherName = keyof typeof captureWeather
type Preset = typeof capturePresets[CapturePresetId]

const hoursPerDay = 24
const maximumSeed = 1e6
const maximumSeedCount = 64
const fullTurn = Math.PI + Math.PI
const sheetSeedDefault = 1
const comparedRuns = 2

interface CaptureOptions {
  presets: CapturePresetId[]
  modes: RenderMode[]
  seed?: number
  hour?: number
  weather?: WeatherName
  overlays: string[]
  revision?: string
  compare?: [string, string]
  grid: boolean
}

function list(text: string | undefined) {
  return (text ?? '').split(',').map((part) => part.trim()).filter(Boolean)
}

function bounded(text: string | undefined, name: string, min: number, max: number, whole = false) {
  if (text === undefined) return
  const value = Number(text)
  if (text.trim() === '' || !Number.isFinite(value) || value < min || value > max || (whole && !Number.isInteger(value))) {
    throw new Error(`--${name} must be ${whole ? 'a whole number ' : ''}from ${min} to ${max}.`)
  }
  return value
}

export function readCaptureOptions(values: Record<string, string | boolean | undefined>): CaptureOptions {
  const text = (key: string) => typeof values[key] === 'string' ? values[key] : undefined
  const known = Object.keys(capturePresets) as CapturePresetId[]
  const requested = list(text('preset'))
  const presets = requested.length && !requested.includes('all') ? requested : known
  const unknownPreset = presets.find((id) => !known.includes(id as CapturePresetId))
  if (unknownPreset) throw new Error(`Unknown preset "${unknownPreset}". Choose from: all, ${known.join(', ')}.`)
  const modes = list(text('mode') ?? 'all')
  const chosenModes = modes.includes('all') ? [...renderModes] : modes
  const badMode = chosenModes.find((mode) => !renderModes.includes(mode as RenderMode))
  if (badMode) throw new Error(`Unknown mode "${badMode}". Choose from: all, ${renderModes.join(', ')}.`)
  const weather = text('weather')
  if (weather !== undefined && !(weather in captureWeather)) throw new Error(`--weather must be one of ${Object.keys(captureWeather).join(', ')}.`)
  const overlays = debugOverlays.read(text('overlay'))
  if (overlays.unknown.length) throw new Error(`Unknown overlay "${overlays.unknown[0]}". Choose from: ${debugOverlays.layers.map(({ id }) => id).join(', ')}.`)
  const compare = list(text('compare'))
  if (text('compare') !== undefined && compare.length !== comparedRuns) throw new Error('--compare takes two runs or revisions, such as main,HEAD.')
  return {
    presets: presets as CapturePresetId[],
    modes: chosenModes as RenderMode[],
    seed: bounded(text('seed'), 'seed', 0, maximumSeed, true),
    hour: bounded(text('hour'), 'hour', 0, hoursPerDay),
    weather: weather as WeatherName | undefined,
    overlays: overlays.ids,
    ...(text('revision') && { revision: text('revision') }),
    ...(compare.length && { compare: [compare[0], compare[1]] as [string, string] }),
    grid: values.grid === true,
  }
}

interface CameraOrbit { target: [number, number, number], alpha: number, beta: number, radius: number, fov: number }

// An orbit camera placed at the eye and aimed at the look point, in the Workbench's alpha and beta convention.
export function orbitFromEye(eye: { x: number, z: number, height: number }, look: { x: number, z: number, height: number }, fov: number): CameraOrbit {
  const target: [number, number, number] = [look.x, groundHeight(look) + look.height, look.z]
  const offset = [eye.x - target[0], groundHeight(eye) + eye.height - target[1], eye.z - target[2]]
  const radius = Math.hypot(offset[0], offset[1], offset[2])
  return { target, alpha: Math.atan2(offset[2], offset[0]), beta: Math.acos(offset[1] / radius), radius, fov }
}

interface CaptureShot {
  name: string
  preset: CapturePresetId
  mode: RenderMode
  url: string
  meta: { label: string, camera: CameraOrbit, hour?: number, weather?: WeatherName, rain?: number, seed: number, angle?: number, overlays: string[] }
}

function devQuery(mode: RenderMode, overlays: string[]) {
  return devViewParams({ overlays, perf: true, capture: true, mode }).toString()
}

function landscapeShots(base: string, id: CapturePresetId, preset: Extract<Preset, { kind: 'landscape' }>, options: CaptureOptions): CaptureShot[] {
  const camera = orbitFromEye(preset.eye, preset.look, preset.fov)
  const hour = options.hour ?? preset.hour
  const weather = options.weather ?? preset.weather
  const seed = options.seed ?? 0
  const overlays = options.overlays.length ? options.overlays : [...('overlays' in preset ? preset.overlays : [])]
  const link = new URL(landscapeLink(base, { focus: [preset.look.x, preset.look.z], camera, hour, rain: captureWeather[weather], time: seed, grid: false, wireframe: false }))
  return options.modes.map((mode) => {
    const url = new URL(link)
    for (const [key, value] of new URLSearchParams(devQuery(mode, overlays))) url.searchParams.set(key, value)
    return { name: `${id}-${mode}`, preset: id, mode, url: url.href, meta: { label: preset.label, camera, hour, weather, rain: captureWeather[weather], seed, overlays } }
  })
}

// A specimen preset renders one view, or with --grid every seed at eight angles for a contact sheet.
function specimenShots(base: string, id: CapturePresetId, preset: Extract<Preset, { kind: 'specimen' }>, options: CaptureOptions): CaptureShot[] {
  const seeds = options.grid ? Array.from({ length: Math.min(maximumSeedCount, preset.seeds) }, (_, i) => (options.seed ?? 0) + i) : [options.seed ?? sheetSeedDefault]
  const angles = options.grid ? Array.from({ length: turntableAngles }, (_, i) => i * fullTurn / turntableAngles) : [-Math.PI / turntableAngles]
  return seeds.flatMap((seed) => angles.flatMap((alpha, angle) => options.modes.map((mode) => {
    const camera: CameraOrbit = { target: [preset.target.x, preset.target.y, preset.target.z], alpha, beta: preset.beta, radius: preset.radius, fov: preset.fov }
    const shot = { version: 1, name: `${id} seed ${seed}`, camera, time: 0, options: { ...preset.options, seed }, grid: false, wireframe: false }
    const url = new URL(`workbench.html?${devQuery(mode, options.overlays)}`, base)
    url.hash = `${preset.subject}?${new URLSearchParams({ setup: JSON.stringify(shot), light: 'daylight' })}`
    return { name: `${id}-s${seed}-a${angle}-${mode}`, preset: id, mode, url: url.href, meta: { label: preset.label, camera, seed, angle, overlays: options.overlays } }
  })))
}

export function planCaptures(base: string, options: CaptureOptions): CaptureShot[] {
  return options.presets.flatMap((id) => {
    const preset: Preset = capturePresets[id]
    return preset.kind === 'landscape' ? landscapeShots(base, id, preset, options) : specimenShots(base, id, preset, options)
  })
}
