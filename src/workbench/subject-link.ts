import { studioCamera } from '../assets/recipes/workbench-stage.ts'
import type { LandscapeShot } from './landscape-shot'
import { parseLandscapeShot } from './landscape-shot.ts'
import type { LightingPreset } from './lighting'

const maxSubjectRadius = 10_000

export function subjectLink(base: string, id: string, field: boolean, shot: LandscapeShot, lighting: LightingPreset) {
  const url = new URL('workbench.html', base)
  // The framing anchor only matters within one session; a reopened link frames from the subject it opens.
  const { alpha, beta, radius, fov, target } = shot.camera
  const params = new URLSearchParams({ setup: JSON.stringify({ ...shot, camera: { alpha, beta, radius, fov, target } }), light: lighting })
  if (field) params.set('stage', 'island')
  url.username = url.password = ''
  url.hash = id + '?' + params.toString()
  return url.href
}
export function readSubjectLink(hash: string) {
  const params = new URLSearchParams(hash.split('?')[1])
  const data = params.get('setup')
  if (!data) return
  const shot = parseLandscapeShot(data, maxSubjectRadius, studioCamera.zoom.closeMin)
  if (!shot) return
  const light = params.get('light')
  const lighting = light === 'overcast' || light === 'golden' || light === 'grazing' || light === 'dusk' ? light : 'daylight'
  return { shot, lighting } as const
}
