import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { isFreightTicket } from '../src/ore-contracts.ts'
import { aerialSurveys, type AviationProgress } from '../src/aviation.ts'
import { farmPlots } from '../src/farm.ts'
import { isJobId, jobs } from '../src/jobs.ts'
import { journalEntry } from '../src/journal/catalog.ts'
import { placeName, type Journal } from '../src/journal/journal.ts'
import type { JobBoardState } from '../src/jobs.ts'
import type { Player, Snapshot } from '../src/protocol'
import { gateFavor, gateStages, initialGateRepair } from '../src/gate-repair.ts'
import { materialRefillSeconds, repairMaterials, repairQuantity } from '../src/materials-work.ts'
import { initialResidents } from '../src/residents/trust.ts'
import { starterResident, starterResidents } from '../src/worlds/starter/residents.ts'
import { repairSupplyFavor } from '../src/worlds/starter/residents/wren.ts'
import { makeItems } from './items.ts'
import { crateStarts, itemStarts, spawns, starterPay } from '../src/world.ts'
import type { Pose } from '../src/world.ts'

export type IslandSave = {
  version: 4
  crewCoins: number
  lastStarterPay?: Snapshot['lastStarterPay']
  islandTime: number
  growth: number[]
  world: Pick<Snapshot, 'skiff' | 'items' | 'mission' | 'fire' | 'farm' | 'lookoutFireClearedAt' | 'gate' | 'gateRepair' | 'residents' | 'lastFavorPay'> &
    { truck: Pose; jobs?: JobBoardState; aviation?: AviationProgress; journal?: Journal; materialsWork?: Snapshot['materialsWork'] }
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

// Version 3 added Wren's gate favor: the loaned toolbox, the gate, the repair stage and resident trust.
function migrateGate(value: unknown): unknown {
  if (!isRecord(value) || value.version !== 2 || !isRecord(value.world) || !Array.isArray(value.world.items)) return value
  const toolbox = itemStarts.findIndex(({ kind }) => kind === 'toolbox')
  const saved = value.world.items as unknown[]
  const items = saved.length === toolbox ? [...saved, makeItems()[toolbox]] : saved
  return { ...value, version: 3, world: { ...initialGateRepair(), residentTrust: { wren: 0 }, ...value.world, items } }
}

// Version 4 keeps one record per resident in place of Wren's trust, and names the favor on the last receipt.
function migrateResidents(value: unknown): unknown {
  if (!isRecord(value) || value.version !== 3 || !isRecord(value.world)) return value
  const { residentTrust, lastFavorPay, ...world } = value.world
  const stage = isRecord(world.gateRepair) ? world.gateRepair.stage : undefined
  const residents = initialResidents(starterResidents)
  residents.wren = {
    trust: isRecord(residentTrust) ? residentTrust.wren as number : 0,
    kept: stage === 'mended' ? [gateFavor] : [],
    active: stage === 'accepted' || stage === 'inspected' || stage === 'fitted' ? gateFavor : null,
  }
  const receipt = isRecord(lastFavorPay) ? { ...lastFavorPay, favor: gateFavor } : undefined
  return { ...value, version: 4, world: { ...world, residents, ...receipt && { lastFavorPay: receipt } } }
}

function migrateSave(value: unknown) {
  return migrateResidents(migrateGate(migrateWallets(value)))
}

// Known residents only, each with whole trust, distinct kept favors of their own, and at most one other under way.
// A resident missing from the save is added as a stranger.
function isResidentRecords(value: unknown) {
  if (!isRecord(value)) return false
  return Object.entries(value).every(([id, record]) => {
    const resident = starterResident(id)
    const owns = (favor: unknown) => resident?.favors.some((entry) => entry.id === favor)
    return resident && isRecord(record) && isCoinBalance(record.trust) && Array.isArray(record.kept) &&
      new Set(record.kept).size === record.kept.length && record.kept.every(owns) &&
      (record.active === null || (owns(record.active) && !record.kept.includes(record.active)))
  })
}

function isFavorReceipt(value: unknown) {
  return isRecord(value) && isCoinBalance(value.coins) && typeof value.resident === 'string' &&
    Boolean(starterResident(value.resident)?.favors.some((favor) => favor.id === value.favor))
}

function isGateRepair(world: Record<string, unknown>, islandTime: number) {
  const { gate, gateRepair, residents, lastFavorPay } = world
  const time = (value: unknown) => value === undefined || (isNumber(value) && value >= 0 && value <= islandTime)
  if (!isRecord(gate) || typeof gate.open !== 'boolean' || typeof gate.closePending !== 'boolean') return false
  if (!isResidentRecords(residents)) return false
  if (lastFavorPay !== undefined && !isFavorReceipt(lastFavorPay)) return false
  return isRecord(gateRepair) && gateStages.some((stage) => stage === gateRepair.stage) &&
    (gateRepair.pinHolder === null || (isNumber(gateRepair.pinHolder) && Number.isInteger(gateRepair.pinHolder))) &&
    time(gateRepair.acceptedAt) && time(gateRepair.mendedAt) && (gateRepair.stage !== 'mended' || gateRepair.mendedAt !== undefined)
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

function validDrivingRecord(player: Record<string, unknown>) {
  return (player.deliveryXp === undefined || isCoinBalance(player.deliveryXp)) &&
    (player.freightTicket === undefined || isFreightTicket(player.freightTicket)) &&
    (player.drivenCrates === undefined || (Array.isArray(player.drivenCrates) && player.drivenCrates.length === crateStarts.length &&
      player.drivenCrates.every(metres => isNumber(metres) && metres >= 0)))
}

function isSavedIncident(world: Record<string, unknown>, islandTime: number) {
  const clearedAt = world.lookoutFireClearedAt
  return isNumber(world.fire) &&
    ['delivery', 'fire', 'complete'].some(mission => mission === world.mission) &&
    (clearedAt === undefined || (isNumber(clearedAt) && clearedAt >= 0 && clearedAt <= islandTime))
}

function isSavedAviation(value: unknown) {
  const { aerial } = isRecord(value) ? value : {}
  return isRecord(value) && typeof value.qualified === 'boolean' && typeof value.surveyed === 'boolean' &&
    (!value.surveyed || value.qualified) && (aerial === undefined || (Array.isArray(aerial) &&
      new Set(aerial).size === aerial.length && aerial.every(id => aerialSurveys.some(survey => survey.id === id)) &&
      (aerial.length === 0 || value.qualified)))
}

// Older saves have no journal. A saved one lists only known entries, each noted by a crew seat at a time the island has reached.
function isSavedJournal(value: unknown, islandTime: number) {
  return isRecord(value) && Object.entries(value).every(([id, note]) => Boolean(journalEntry(id)) && isRecord(note) &&
    isNumber(note.t) && Number.isInteger(note.t) && note.t >= 0 && note.t <= islandTime &&
    isNumber(note.by) && Number.isInteger(note.by) && note.by >= 0 && note.by < spawns.length &&
    (note.at === undefined || (typeof note.at === 'string' && Boolean(placeName(note.at)))))
}

function hasValidProgress(world: Record<string, unknown>, islandTime: number) {
  return (world.jobs === undefined || isJobBoard(world.jobs, world.mission)) &&
    (world.aviation === undefined || isSavedAviation(world.aviation)) &&
    (world.journal === undefined || isSavedJournal(world.journal, islandTime))
}

function isSavedMaterials(world: Record<string, unknown>, islandTime: number) {
  const work = world.materialsWork
  const residents = world.residents as Snapshot['residents']
  const gate = world.gateRepair as Snapshot['gateRepair']
  const kept = residents.wren?.kept.includes(repairSupplyFavor.id) ?? false
  const active = residents.wren?.active === repairSupplyFavor.id
  if (work === undefined) return !active && !kept
  if (!isRecord(work) || (work.checkout !== 'qualified' && !repairMaterials.some(material => material === work.checkout))) return false
  const { readyAt, request } = work
  if (!isRecord(readyAt) || !repairMaterials.every((material) => {
    const time = readyAt[material]
    return isNumber(time) && time >= 0 && time <= islandTime + materialRefillSeconds
  })) return false
  if (gate.stage !== 'mended' && work.checkout !== 'timber') return false
  if (request === null) return !active && !kept
  if (!isRecord(request) || work.checkout !== 'qualified' || !repairMaterials.some(material => material === request.material) ||
    !isCoinBalance(request.delivered) || request.delivered > repairQuantity) return false
  return request.delivered === repairQuantity ? kept && !active : active && !kept
}

function isSavedMaterialPocket(value: unknown) {
  return value === undefined || (isRecord(value) && repairMaterials.every((material) => {
    const count = value[material]
    return isCoinBalance(count) && count <= repairQuantity
  }))
}

function isSavedCrewMember(entry: unknown): entry is IslandSave['crew'][number] {
  if (!isRecord(entry) || !isCrewToken(entry.token) ||
    typeof entry.reserved !== 'boolean' || !isPose(entry.player)) return false
  const player = entry.player
  return isNumber(player.id) && Number.isInteger(player.id) && player.id >= 0 && player.id < spawns.length &&
    validDrivingRecord(player) &&
    isSavedMaterialPocket(player.materials) &&
    [player.y, player.seeds].every(isNumber) && Array.isArray(player.inventory) &&
    (player.starterSeedClaimed === undefined || typeof player.starterSeedClaimed === 'boolean') &&
    (player.ownedClothes === undefined || (Array.isArray(player.ownedClothes) && player.ownedClothes.every(item => typeof item === 'string'))) &&
    isRecord(player.goods) && [player.goods.fish, player.goods.carrots].every(isNumber)
}

function isSave(value: unknown): value is IslandSave {
  if (!isRecord(value) || value.version !== 4 || !isCoinBalance(value.crewCoins) ||
    !validReceipt(value.lastStarterPay) || !isNumber(value.islandTime) || value.islandTime < 0 ||
    !Array.isArray(value.growth) || value.growth.length !== farmPlots.length || !value.growth.every(isNumber) ||
    !Array.isArray(value.crew) || !value.crew.every(isSavedCrewMember) || !isRecord(value.world)) return false
  const { world } = value
  const reservedIds = new Set(value.crew.filter(({ reserved }) => reserved).map(({ player }) => player.id))
  if (!hasValidProgress(world, value.islandTime)) return false
  return isPose(world.truck) && isPose(world.skiff) && isSavedIncident(world, value.islandTime) && isGateRepair(world, value.islandTime) &&
    isSavedMaterials(world, value.islandTime) &&
    Array.isArray(world.farm) && world.farm.length === farmPlots.length &&
    world.farm.every((stage: unknown) => ['grass', 'tilled', 'planted', 'watered', 'ripe'].some((name) => name === stage)) &&
    Array.isArray(world.items) && world.items.length === itemStarts.length &&
    world.items.every((item: unknown, id) => isPose(item) && item.id === id && isNumber(item.y) &&
      (item.holder === null || (isNumber(item.holder) && reservedIds.has(item.holder))) &&
      item.kind === itemStarts[id].kind)
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
        const parsed = migrateSave(JSON.parse(readFileSync(path, 'utf8')))
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
