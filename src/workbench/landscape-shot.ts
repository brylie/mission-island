import { studioCamera } from '../assets/recipes/workbench-stage.ts'
import type { Values } from './subject'
import type { CameraState } from './stage'

export interface LandscapeShot {
  version: 1
  name: string
  camera: CameraState
  time: number
  options: Values
  grid: boolean
  wireframe: boolean
}

const maxNameLength = 60
const minFov = 0.1
const maxFov = 2
const targetCoordinates = 3
const maxTargetCoordinate = 10_000
const maxClockStart = 1e9
const maxShotLength = 4096

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function between(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

export function readLandscapeShot(value: unknown) {
  return readShot(value, studioCamera.zoom.range)
}

function readShot(value: unknown, maxRadius: number, minRadius: number = studioCamera.zoom.minRadius): LandscapeShot | undefined {
  if (!record(value) || value.version !== 1 || typeof value.name !== 'string' || !record(value.camera)
    || !record(value.options) || !between(value.time, 0, Number.MAX_SAFE_INTEGER)
    || typeof value.grid !== 'boolean' || typeof value.wireframe !== 'boolean') return
  const name = value.name.trim()
  const { alpha, beta, radius, target, fov } = value.camera
  if (!name || name.length > maxNameLength || !between(alpha, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
    || !between(beta, studioCamera.orbit.minBeta, Math.PI - studioCamera.orbit.nadirInset) || !between(radius, minRadius, maxRadius)
    || (fov !== undefined && !between(fov, minFov, maxFov))
    || !Array.isArray(target) || target.length !== targetCoordinates
    || !target.every((coordinate: unknown): coordinate is number => between(coordinate, -maxTargetCoordinate, maxTargetCoordinate))) return

  const options: Values = Object.fromEntries(Object.entries(value.options).filter((entry): entry is [string, Values[string]] => {
    const [, setting] = entry
    return typeof setting === 'boolean' || typeof setting === 'string' || (typeof setting === 'number' && Number.isFinite(setting))
  }))
  if (options.clockStart !== undefined && !between(options.clockStart, 0, maxClockStart)) return
  return {
    version: 1,
    name,
    camera: { alpha, beta, radius, target, ...(fov !== undefined && { fov }) },
    time: value.time,
    options,
    grid: value.grid,
    wireframe: value.wireframe,
  }
}

export function parseLandscapeShot(serialized: string, maxRadius: number = studioCamera.zoom.range, minRadius: number = studioCamera.zoom.minRadius): LandscapeShot | undefined {
  if (serialized.length > maxShotLength) return
  try {
    return readShot(JSON.parse(serialized), maxRadius, minRadius)
  }
  catch {
    return undefined
  }
}

export function landscapeShotLink(location: string, shot: LandscapeShot) {
  const url = new URL(location)
  // A shot is client-side state. Keep it in the fragment so it stays out of requests.
  url.searchParams.delete('view')
  url.hash = 'landscape?' + new URLSearchParams({ shot: JSON.stringify(shot) }).toString()
  return url.href
}
