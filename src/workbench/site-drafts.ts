import { starterFeatures } from '../starter-sites.ts'
import type { SiteFeature } from '../site-props'
import { readStorage, writeStorage } from '../browser-storage.ts'
import type { Values } from './subject'

const key = 'mission-island-workbench-furnishings-v1'
export function defaultPlacement(feature: SiteFeature) {
  return { east: 0, north: 0, heading: (feature.heading ?? 0) * 180 / Math.PI, scale: feature.scale ?? 1, color: feature.color }
}
export function editedFeature(feature: SiteFeature, values: Values): SiteFeature {
  return { ...feature, x: feature.x + Number(values.east), z: feature.z + Number(values.north),
    heading: Number(values.heading) * Math.PI / 180, scale: Number(values.scale), color: String(values.color) }
}
function within(n: unknown, min: number, max: number) {
  return typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max
}
function valid(value: unknown): value is ReturnType<typeof defaultPlacement> {
  if (!value || typeof value !== 'object') return false
  const v = value as Values
  return within(v.east, -6, 6) && within(v.north, -6, 6) && within(v.heading, -180, 180)
    && within(v.scale, .25, 3) && typeof v.color === 'string' && /^#[a-f0-9]{6}$/i.test(v.color)
}
export function readSiteDrafts(): Record<string, ReturnType<typeof defaultPlacement>> {
  try {
    const data: unknown = JSON.parse(readStorage('localStorage', key) ?? '{}')
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
    const drafts: Record<string, ReturnType<typeof defaultPlacement>> = {}
    for (const f of starterFeatures) {
      const placement = (data as Record<string, unknown>)[f.site]
      if (valid(placement)) drafts[f.site] = placement
    }
    return drafts
  } catch { return {} }
}
export function saveSiteDraft(site: string, values: Values) {
  if (!valid(values) || !starterFeatures.some(feature => feature.site === site)) return false
  return writeStorage('localStorage', key, JSON.stringify({ ...readSiteDrafts(), [site]: values }))
}
export function draftFeatures() {
  const drafts = readSiteDrafts()
  return starterFeatures.map(f => drafts[f.site] ? editedFeature(f, drafts[f.site]) : f)
}
