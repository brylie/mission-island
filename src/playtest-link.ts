import { dryMarketRainAge } from './market-runoff.ts'
import { maximumOrbitArm, maximumOrbitPitch, minimumOrbitArm, minimumOrbitPitch } from './second-island/view-settings.ts'

// Versioned, inspection-only state. Build a new URL so a live session's query
// parameters and credentials never travel with a scenery bookmark.
export const landscapeDuration = 96
const coordinateDecimals = 6

// Keep the scrubber bounded while restoring the exact island time for ambient wildlife and effects.
export function landscapeWindow(clock: number) {
  const start = clock <= landscapeDuration ? 0 : Math.floor(clock / landscapeDuration) * landscapeDuration
  return { start, time: clock - start }
}

interface LandscapeView {
  focus: number[]
  camera: { target: number[], alpha: number, beta: number, radius: number, fov: number }
  hour: number
  rain: number
  marketRainAge?: number
  time: number
  grid: boolean
  wireframe: boolean
}

interface SaltwindView {
  point: { x: number, y: number, z: number, velocity: number, grounded: boolean, swimming: boolean }
  eye: number[]
  yaw: number
  orbit: number
  pitch: number
  arm: number
  cycle: number
  speed: number
  time: number
  site: string
  weather: string
  overview: boolean
  tour: { stop: number, leg: number, progress: number, playing: boolean }
}

function encode(base: string, path: string, groups: Record<string, string | number[]>) {
  const url = new URL(path, base)
  url.username = ''
  url.password = ''
  url.searchParams.set('view', '1')
  for (const [key, value] of Object.entries(groups)) {
    url.searchParams.set(key, typeof value === 'string' ? value : value.map((n) => Number(n.toFixed(coordinateDecimals))).join(','))
  }
  return url.href
}

export function landscapeLink(base: string, v: LandscapeView) {
  const c = v.camera
  return encode(base, 'workbench.html#landscape', { focus: v.focus, target: c.target, orbit: [c.alpha, c.beta, c.radius, c.fov], sky: [v.hour, v.rain, v.time], display: [+v.grid, +v.wireframe], ...(v.marketRainAge !== undefined && { runoff: [v.marketRainAge] }) })
}

export function saltwindLink(base: string, v: SaltwindView) {
  const p = v.point
  return encode(base, 'second-island.html', { at: [p.x, p.y, p.z], eye: v.eye, pose: [v.yaw, p.velocity, +p.grounded, +p.swimming, v.cycle, v.speed], orbit: [v.orbit, v.pitch, v.arm, +v.overview], tour: [v.tour.stop, v.tour.leg, v.tour.progress, +v.tour.playing], time: [v.time], site: v.site, weather: v.weather })
}

type Limit = readonly [number, number]
const positionBound = 2000
const angleBound = 1e8
const maximumTime = 1e9
const coordinate: Limit = [-positionBound, positionBound]
const angle: Limit = [-angleBound, angleBound]
const flag: Limit = [0, 1]
const clock: Limit = [0, maximumTime]

const landscapeFocusBound = 500
const landscapeFocus: Limit = [-landscapeFocusBound, landscapeFocusBound]
const landscapeMinimumTilt = 0.034
const landscapeTopClearance = 0.059
const landscapeMinimumRadius = 0.55
const landscapeMaximumRadius = 450
const landscapeMinimumFov = 0.1
const landscapeMaximumFov = 2
const hoursPerDay = 24

const saltwindEastWestBound = 560
const saltwindNorthSouthBound = 430
const saltwindVelocityBound = 100
const saltwindMaximumCycle = 1e9
const saltwindMaximumSpeed = 12
const saltwindMaximumTourIndex = 100
const saltwindMaximumTourProgress = 1e6
const saltwindOrbitPitch: Limit = [minimumOrbitPitch, maximumOrbitPitch]
const saltwindOrbitRadius: Limit = [minimumOrbitArm, maximumOrbitArm]

function tuple(params: URLSearchParams, key: string, ...limits: Limit[]) {
  const parts = params.get(key)?.split(',')
  if (!parts || parts.length !== limits.length) return
  const nums = parts.map(Number)
  if (nums.every((n, i) => parts[i].trim() !== '' && Number.isFinite(n) && n >= limits[i][0] && n <= limits[i][1]
    && (limits[i] !== flag || Number.isInteger(n)))) return nums
}

export function readLandscapeView(params: URLSearchParams): LandscapeView | undefined {
  const focus = tuple(params, 'focus', landscapeFocus, landscapeFocus)
  const target = tuple(params, 'target', coordinate, coordinate, coordinate)
  const orbit = tuple(params, 'orbit', angle, [landscapeMinimumTilt, Math.PI - landscapeTopClearance], [landscapeMinimumRadius, landscapeMaximumRadius], [landscapeMinimumFov, landscapeMaximumFov])
  const sky = tuple(params, 'sky', [0, hoursPerDay], [0, 1], clock)
  const display = tuple(params, 'display', flag, flag)
  const runoff = tuple(params, 'runoff', [0, dryMarketRainAge])
  if (params.get('view') !== '1' || !focus || !target || !orbit || !sky || !display || (params.has('runoff') && !runoff)) return
  const [alpha, beta, radius, fov] = orbit
  return { focus, camera: { target, alpha, beta, radius, fov }, hour: sky[0], rain: sky[1], time: sky[2], grid: Boolean(display[0]), wireframe: Boolean(display[1]), ...(runoff && { marketRainAge: runoff[0] }) }
}

export function readSaltwindView(params: URLSearchParams): SaltwindView | undefined {
  const at = tuple(params, 'at', [-saltwindEastWestBound, saltwindEastWestBound], coordinate, [-saltwindNorthSouthBound, saltwindNorthSouthBound])
  const eye = tuple(params, 'eye', coordinate, coordinate, coordinate)
  const pose = tuple(params, 'pose', angle, [-saltwindVelocityBound, saltwindVelocityBound], flag, flag, [0, saltwindMaximumCycle], [0, saltwindMaximumSpeed])
  const orbit = tuple(params, 'orbit', angle, saltwindOrbitPitch, saltwindOrbitRadius, flag)
  const tour = tuple(params, 'tour', [0, saltwindMaximumTourIndex], [0, saltwindMaximumTourIndex], [0, saltwindMaximumTourProgress], flag)
  const time = tuple(params, 'time', clock)
  const weather = params.get('weather'), site = params.get('site') ?? ''
  if (params.get('view') !== '1' || !tour || !Number.isInteger(tour[0]) || !Number.isInteger(tour[1]) || !at || !eye || !pose || !orbit || !time || !weather
    || !['live', 'morning', 'daylight', 'rain', 'dusk', 'night'].includes(weather) || !/^[a-z-]{0,40}$/.test(site)) return
  const [x, y, z] = at
  const [yaw, velocity, grounded, swimming, cycle, speed] = pose
  return { point: { x, y, z, velocity, grounded: Boolean(grounded), swimming: Boolean(swimming) }, eye, yaw, cycle, speed, orbit: orbit[0], pitch: orbit[1], arm: orbit[2], overview: Boolean(orbit[3]), time: time[0], site, weather, tour: { stop: tour[0], leg: tour[1], progress: tour[2], playing: Boolean(tour[3]) } }
}

export function bindPlaytestCopy(makeLink: () => string | undefined) {
  const button = document.querySelector<HTMLButtonElement>('#copy-playtest')!
  const status = document.querySelector<HTMLElement>('#copy-status')!
  const manual = document.querySelector<HTMLInputElement>('#playtest-url')!
  button.addEventListener('click', () => {
    const link = makeLink()
    if (!link) return
    manual.value = link
    manual.hidden = true
    function fallback() {
      manual.hidden = false
      manual.focus()
      manual.select()
      status.textContent = 'Select and copy this link.'
    }
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(link).then(() => {
        status.textContent = 'Playtest link copied.'
      }, fallback)
    }
    else fallback()
  })
}
