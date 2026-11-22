import { starterFireSites } from '../src/worlds/starter/layout/fire-sites.ts'
import { wildfireSizes, type IslandEvents } from '../src/wildfire.ts'
import { itemStarts } from '../src/world.ts'
import { makeItems } from './items.ts'
import { saveVersions } from './save-version.ts'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

const isSite = (value: unknown) => starterFireSites.some((site) => site.id === value)
const isSize = (value: unknown) => typeof value === 'string' && Object.hasOwn(wildfireSizes, value)
const isCount = (value: unknown) => isNumber(value) && Number.isSafeInteger(value) && value >= 0
const isShare = (value: unknown) => isNumber(value) && value >= 0 && value <= 1

// Version 7 added the fire stations' extinguishers after the toolbox and the island event schedule.
export function migrateFireWatch(value: unknown): unknown {
  if (!isRecord(value) || value.version !== saveVersions.residentStanding || !isRecord(value.world) || !Array.isArray(value.world.items)) return value
  const saved = value.world.items as unknown[]
  const items = [...saved, ...makeItems().slice(saved.length)]
  const seed = isNumber(value.islandTime) ? Math.floor(value.islandTime) : 0
  const events: IslandEvents = { seed, nextFireAt: null, fire: null, firesOut: 0 }
  return { ...value, version: saveVersions.fireWatch, world: { ...value.world, items, events } }
}

function isHotspot(value: unknown) {
  if (!isRecord(value) || ![value.x, value.z].every(isNumber) || typeof value.caught !== 'boolean') return false
  const { heat, peak } = value
  return isShare(heat) && isShare(peak) && (heat as number) <= (peak as number)
}

function isFire(value: unknown, islandTime: number) {
  if (!isRecord(value) || !isCount(value.id) || !isSite(value.site) || !isSize(value.size) || typeof value.located !== 'boolean'
    || !isNumber(value.startedAt) || value.startedAt < 0 || value.startedAt > islandTime || !Array.isArray(value.hotspots)
    || (value.spreadElapsed !== undefined && (!isNumber(value.spreadElapsed) || value.spreadElapsed < 0))) return false
  return value.hotspots.length === wildfireSizes[value.size as keyof typeof wildfireSizes].hotspots && value.hotspots.every(isHotspot)
}

function isBurned(value: unknown, site: unknown) {
  const count = starterFireSites.find(({ id }) => id === site)?.hotspots.length ?? 0
  return Array.isArray(value) && new Set(value).size === value.length && value.every((index) => isCount(index) && index < count)
}

function isFireRecord(value: unknown, islandTime: number) {
  return isRecord(value) && isCount(value.id) && isSite(value.site) && isSize(value.size)
    && isNumber(value.endedAt) && value.endedAt >= 0 && value.endedAt <= islandTime
    && ['extinguished', 'burned-out', 'rained-out'].includes(value.outcome as string)
    && (value.burned === undefined || isBurned(value.burned, value.site))
}

export function isSavedEvents(value: unknown, islandTime: number) {
  if (!isRecord(value) || !isCount(value.seed) || !isCount(value.firesOut)) return false
  const { nextFireAt, fire, lastFire, firesOut } = value
  return (nextFireAt === null || (isNumber(nextFireAt) && nextFireAt >= 0))
    && (fire === null || (isFire(fire, islandTime) && isRecord(fire) && fire.id === (firesOut as number) + 1))
    && (lastFire === undefined || isFireRecord(lastFire, islandTime))
}

export function isSavedExtinguisher(item: Record<string, unknown>, id: number) {
  return itemStarts[id].kind !== 'extinguisher' || item.charge === undefined || isShare(item.charge)
}
