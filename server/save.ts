import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { farmPlots } from '../src/farm.ts'
import { isJobId, jobs } from '../src/jobs.ts'
import type { JobBoardState } from '../src/jobs.ts'
import type { Player, Snapshot } from '../src/protocol'
import { crateStarts, extinguisherStarts, spawns, starterPay } from '../src/world.ts'
import type { Pose } from '../src/world.ts'

export type IslandSave = {
  version: 2
  crewCoins: number
  lastStarterPay?: Snapshot['lastStarterPay']
  islandTime: number
  growth: number[]
  world: Pick<Snapshot, 'skiff' | 'items' | 'mission' | 'fire' | 'farm'> & { truck: Pose; jobs?: JobBoardState }
  crew: { token: string; player: Player; reserved: boolean }[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isCoinBalance(value: unknown): value is number {
  return isNumber(value) && Number.isSafeInteger(value) && value >= 0
}

function validReceipt(value: unknown) {
  return value === undefined || (typeof value === 'string' && Object.hasOwn(starterPay, value))
}

// Version 1 kept unspent coins and the last starter receipt on each profile.
function migrateWallets(value: unknown): unknown {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.crew)) return value
  let crewCoins = 0
  const receipts = new Set<string>()
  const crew = []
  for (const entry of value.crew) {
    if (!isRecord(entry) || !isRecord(entry.player)) return value
    const { coins, lastStarterPay, ...player } = entry.player
    if (!isCoinBalance(coins) || !validReceipt(lastStarterPay)) return value
    crewCoins += coins
    if (typeof lastStarterPay === 'string') receipts.add(lastStarterPay)
    crew.push({ ...entry, player })
  }
  const lastStarterPay = ['fire', 'delivery', 'crate'].find(job => receipts.has(job))
  return { version: 2, islandTime: value.islandTime, growth: value.growth, world: value.world, crewCoins, lastStarterPay, crew }
}

function isPose(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && [value.x, value.z, value.heading].every(isNumber)
}

function isCrewToken(value: unknown) {
  return typeof value === 'string' && /^[a-f0-9]{32}$/.test(value)
}

function isJobBoard(value: unknown, mission: unknown) {
  if (!isRecord(value) || !isNumber(value.completed) || !Number.isSafeInteger(value.completed) || value.completed < 0) return false
  const { active } = value
  return active === null || (mission === 'complete' && isRecord(active) && isJobId(active.id) &&
    isNumber(active.progress) && Number.isInteger(active.progress) && active.progress >= 0 && active.progress < jobs[active.id].quantity)
}

function isSavedCrewMember(entry: unknown): entry is IslandSave['crew'][number] {
  if (!isRecord(entry) || !isCrewToken(entry.token) ||
    typeof entry.reserved !== 'boolean' || !isPose(entry.player)) return false
  const player = entry.player
  return isNumber(player.id) && Number.isInteger(player.id) && player.id >= 0 && player.id < spawns.length &&
    [player.y, player.seeds].every(isNumber) && Array.isArray(player.inventory) &&
    (player.starterSeedClaimed === undefined || typeof player.starterSeedClaimed === 'boolean') &&
    (player.ownedClothes === undefined || (Array.isArray(player.ownedClothes) && player.ownedClothes.every(item => typeof item === 'string'))) &&
    isRecord(player.goods) && [player.goods.fish, player.goods.carrots].every(isNumber)
}

function isSave(value: unknown): value is IslandSave {
  if (!isRecord(value) || value.version !== 2 || !isCoinBalance(value.crewCoins) ||
    !validReceipt(value.lastStarterPay) || !isNumber(value.islandTime) || value.islandTime < 0 ||
    !Array.isArray(value.growth) || value.growth.length !== farmPlots.length || !value.growth.every(isNumber) ||
    !Array.isArray(value.crew) || !value.crew.every(isSavedCrewMember) || !isRecord(value.world)) return false
  const { world } = value
  const reservedIds = new Set(value.crew.filter(({ reserved }) => reserved).map(({ player }) => player.id))
  if (world.jobs !== undefined && !isJobBoard(world.jobs, world.mission)) return false
  return isPose(world.truck) && isPose(world.skiff) && isNumber(world.fire) &&
    ['delivery', 'fire', 'complete'].some((mission) => mission === world.mission) &&
    Array.isArray(world.farm) && world.farm.length === farmPlots.length &&
    world.farm.every((stage: unknown) => ['grass', 'tilled', 'planted', 'watered', 'ripe'].some((name) => name === stage)) &&
    Array.isArray(world.items) && world.items.length === crateStarts.length + extinguisherStarts.length &&
    world.items.every((item: unknown, id) => isPose(item) && item.id === id && isNumber(item.y) &&
      (item.holder === null || (isNumber(item.holder) && reservedIds.has(item.holder))) &&
      item.kind === (id < crateStarts.length ? 'crate' : 'extinguisher'))
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
        const parsed = migrateWallets(JSON.parse(readFileSync(path, 'utf8')))
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
