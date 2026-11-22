import { debugOverlays } from './debug-overlays/catalog.ts'

// A dev and playtest-only view request carried in the page query, for captures and debugging:
//   ?dev=1&devcam=x,y,z,alpha,beta,radius,fov&devsky=hour,rain&overlay=slope,wildfire&perf=1&capture=1&mode=greyscale
// Ordinary builds never read it, so normal play ignores these parameters.

export const renderModes = ['color', 'greyscale', 'silhouette'] as const
export type RenderMode = typeof renderModes[number]

export interface DevCamera { target: [number, number, number], alpha: number, beta: number, radius: number, fov: number }

export interface DevView {
  camera?: DevCamera
  sky?: { hour: number, rain: number }
  overlays: string[]
  perf: boolean
  // Hides the HUD and menus so a capture shows only the 3D view.
  capture: boolean
  mode: RenderMode
}

type Limit = readonly [number, number]
const positionBound = 2000
const angleBound = 100
const minimumTilt = 0.01
const minimumRadius = 0.5
const maximumRadius = 2000
const minimumFov = 0.1
const maximumFov = 2.5
const hoursPerDay = 24
const coordinate: Limit = [-positionBound, positionBound]
const cameraLimits: Limit[] = [coordinate, coordinate, coordinate, [-angleBound, angleBound], [minimumTilt, Math.PI - minimumTilt], [minimumRadius, maximumRadius], [minimumFov, maximumFov]]
const skyLimits: Limit[] = [[0, hoursPerDay], [0, 1]]
const cameraFields = 7

function tuple(text: string | null, limits: readonly Limit[]) {
  if (text === null) return
  const parts = text.split(',')
  if (parts.length !== limits.length) throw new Error(`Expected ${limits.length} comma-separated numbers, got "${text}".`)
  return parts.map((part, i) => {
    const value = Number(part)
    if (part.trim() === '' || !Number.isFinite(value) || value < limits[i][0] || value > limits[i][1]) {
      throw new Error(`Value ${i + 1} of "${text}" must be from ${limits[i][0]} to ${limits[i][1]}.`)
    }
    return value
  })
}

// Throws on a malformed request so a capture fails loudly instead of rendering the wrong view.
export function readDevView(params: URLSearchParams): DevView | undefined {
  if (params.get('dev') !== '1') return
  const camera = tuple(params.get('devcam'), cameraLimits)
  const sky = tuple(params.get('devsky'), skyLimits)
  const overlays = debugOverlays.read(params.get('overlay'))
  if (overlays.unknown.length) throw new Error(`Unknown overlay: ${overlays.unknown.join(', ')}. Choose from ${debugOverlays.layers.map(({ id }) => id).join(', ')}.`)
  const mode = params.get('mode') ?? 'color'
  if (!renderModes.includes(mode as RenderMode)) throw new Error(`Render mode must be one of ${renderModes.join(', ')}.`)
  return {
    ...(camera && { camera: { target: [camera[0], camera[1], camera[2]], alpha: camera[3], beta: camera[4], radius: camera[5], fov: camera[6] } }),
    ...(sky && { sky: { hour: sky[0], rain: sky[1] } }),
    overlays: overlays.ids,
    perf: params.get('perf') === '1',
    capture: params.get('capture') === '1',
    mode: mode as RenderMode,
  }
}

// Builds the query for a view, so the capture CLI and tests share one format.
export function devViewParams(view: DevView) {
  const params = new URLSearchParams({ dev: '1' })
  if (view.camera) {
    const { target, alpha, beta, radius, fov } = view.camera
    const values = [...target, alpha, beta, radius, fov]
    if (values.length === cameraFields) params.set('devcam', values.join(','))
  }
  if (view.sky) params.set('devsky', `${view.sky.hour},${view.sky.rain}`)
  if (view.overlays.length) params.set('overlay', view.overlays.join(','))
  if (view.perf) params.set('perf', '1')
  if (view.capture) params.set('capture', '1')
  if (view.mode !== 'color') params.set('mode', view.mode)
  return params
}
