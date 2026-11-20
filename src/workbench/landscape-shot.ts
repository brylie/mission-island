import type { Values } from './catalog'
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

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function between(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

export function readLandscapeShot(value: unknown): LandscapeShot | undefined {
  if (!record(value) || value.version !== 1 || typeof value.name !== 'string' || !record(value.camera) ||
      !record(value.options) || !between(value.time, 0, Number.MAX_SAFE_INTEGER) ||
      typeof value.grid !== 'boolean' || typeof value.wireframe !== 'boolean') return
  const name = value.name.trim()
  const { alpha, beta, radius, target, fov } = value.camera
  if (!name || name.length > 60 || !between(alpha, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER) ||
      !between(beta, 0.035, Math.PI - 0.06) || !between(radius, 0.55, 450) ||
      (fov !== undefined && !between(fov, .1, 2)) ||
      !Array.isArray(target) || target.length !== 3 ||
      !target.every((coordinate: unknown): coordinate is number => between(coordinate, -10_000, 10_000))) return

  const options: Values = Object.fromEntries(Object.entries(value.options).filter((entry): entry is [string, Values[string]] => {
    const [, setting] = entry
    return typeof setting === 'boolean' || typeof setting === 'string' || (typeof setting === 'number' && Number.isFinite(setting))
  }))
  if (options.clockStart !== undefined && !between(options.clockStart, 0, 1e9)) return
  return {
    version: 1, name, camera: { alpha, beta, radius, target, ...(fov !== undefined && { fov }) }, time: value.time, options,
    grid: value.grid, wireframe: value.wireframe,
  }
}

export function parseLandscapeShot(serialized: string): LandscapeShot | undefined {
  if (serialized.length > 4096) return
  try {
    return readLandscapeShot(JSON.parse(serialized))
  } catch {
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
