import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { farmPlots } from '../src/farm.ts'
import type { Player, Snapshot } from '../src/protocol'
import { crateStarts, extinguisherStarts, spawns } from '../src/world.ts'

export type IslandSave = {
  version: 1
  islandTime: number
  growth: number[]
  world: Pick<Snapshot, 'truck' | 'skiff' | 'items' | 'mission' | 'fire' | 'farm'>
  crew: { token: string; player: Player; reserved: boolean }[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isPose(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && [value.x, value.z, value.heading].every(isNumber)
}

function isSave(value: unknown): value is IslandSave {
  if (!isRecord(value) || value.version !== 1 || !isNumber(value.islandTime) || value.islandTime < 0 ||
    !Array.isArray(value.growth) || value.growth.length !== farmPlots.length || !value.growth.every(isNumber) ||
    !Array.isArray(value.crew) || !isRecord(value.world)) return false
  const { world } = value
  if (!isPose(world.truck) || !isPose(world.skiff) || !isNumber(world.fire) ||
    !['delivery', 'fire', 'complete'].some((mission) => mission === world.mission) ||
    !Array.isArray(world.farm) || world.farm.length !== farmPlots.length ||
    !world.farm.every((stage: unknown) => ['grass', 'tilled', 'planted', 'watered', 'ripe'].some((name) => name === stage)) ||
    !Array.isArray(world.items) || world.items.length !== crateStarts.length + extinguisherStarts.length ||
    !world.items.every((item: unknown, id) => isPose(item) && item.id === id && isNumber(item.y) &&
      item.kind === (id < crateStarts.length ? 'crate' : 'extinguisher'))) return false
  return value.crew.every((entry: unknown) => {
    if (!isRecord(entry) || typeof entry.token !== 'string' || !/^[a-f0-9]{32}$/.test(entry.token) ||
      typeof entry.reserved !== 'boolean' || !isPose(entry.player)) return false
    const player = entry.player
    return isNumber(player.id) && Number.isInteger(player.id) && player.id >= 0 && player.id < spawns.length &&
      [player.y, player.coins, player.seeds].every(isNumber) && Array.isArray(player.inventory) &&
      isRecord(player.goods) && [player.goods.fish, player.goods.carrots].every(isNumber)
  })
}

export function islandSaveFile(root: string, port: number, slot = `island-${port}`) {
  if (slot === 'off') return undefined
  if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(slot)) {
    throw new Error('MISSION_ISLAND_SAVE must be a name containing lowercase ASCII letters, digits, or hyphens.')
  }
  const directory = join(root, '.mission-island', 'saves')
  const path = join(directory, `${slot}.json`)
  return {
    load(): IslandSave | undefined {
      try {
        const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
        if (!isSave(parsed)) throw new Error('Unsupported or malformed save')
        return parsed
      } catch (error) {
        if (isRecord(error) && error.code === 'ENOENT') return undefined
        throw new Error(`Could not load island save ${path}`, { cause: error })
      }
    },
    write(state: IslandSave) {
      mkdirSync(directory, { recursive: true, mode: 0o700 })
      const temporary = `${path}.${process.pid}.tmp`
      writeFileSync(temporary, JSON.stringify(state) + '\n', { mode: 0o600 })
      renameSync(temporary, path)
    },
  }
}
