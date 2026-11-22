import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { isFreightTicket } from '../src/ore-contracts.ts'
import { aerialSurveys, type AviationProgress } from '../src/aviation.ts'
import { farmOrders, type FarmProgress } from '../src/farm-orders.ts'
import { farmPlots } from '../src/farm.ts'
import { isJobId, jobs } from '../src/jobs.ts'
import type { Journal } from '../src/journal/journal.ts'
import type { JobBoardState } from '../src/jobs.ts'
import type { Player, Snapshot } from '../src/protocol'
import { gateStages, initialGateRepair } from '../src/gate-repair.ts'
import { materialRefillSeconds, repairMaterials, repairQuantity } from '../src/materials-work.ts'
import { repairSupplyFavor } from '../src/worlds/starter/residents/wren.ts'
import { isFavorReceipt, isResidentRecords, migrateResidents, migrateTrust } from './resident-save.ts'
import { initialFerryRepair, isFerryRepair } from '../src/ferry-repair.ts'
import { makeItems } from './items.ts'
import { readJournal } from './journal-save.ts'
import { crateStarts, itemStarts, spawns, starterPay } from '../src/world.ts'
import type { Pose } from '../src/world.ts'
import { currentSaveVersion, saveVersions } from './save-version.ts'
import { drivingCareers, learnerVehicleIds, seatOffset, type LearnerVehicleId } from '../src/learner-vehicles.ts'

const privateDirectoryMode = 0o700
const privateSaveFileMode = 0o600

export type IslandSave = {
  version: typeof currentSaveVersion
  crewCoins: number
  lastStarterPay?: Snapshot['lastStarterPay']
  islandTime: number
  growth: number[]
  world: Pick<Snapshot, 'skiff' | 'items' | 'mission' | 'fire' | 'farm' | 'lookoutFireClearedAt' | 'gate' | 'gateRepair' | 'residents' | 'lastFavorPay' | 'ferryRepair'>
    & { truck: Pose, vehicles?: Partial<Record<LearnerVehicleId, Pose>>, practice?: Partial<Snapshot['practice']>, jobs?: JobBoardState, aviation?: AviationProgress, journal?: Journal, produce?: FarmProgress, materialsWork?: Snapshot['materialsWork'] }
  crew: { token: string, player: Player, reserved: boolean }[]
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
  const lastStarterPay = ['fire', 'delivery', 'crate'].find((job) => receipts.has(job))
  return { version: saveVersions.sharedCrewBank, islandTime: value.islandTime, growth: value.growth, world: value.world, crewCoins, lastStarterPay, crew }
}

// Version 3 added Wren's gate favor: the loaned toolbox, the gate, the repair stage and resident trust.
function migrateGate(value: unknown): unknown {
  if (!isRecord(value) || value.version !== saveVersions.sharedCrewBank || !isRecord(value.world) || !Array.isArray(value.world.items)) return value
  const toolbox = itemStarts.findIndex(({ kind }) => kind === 'toolbox')
  const saved = value.world.items as unknown[]
  const items = saved.length === toolbox ? [...saved, makeItems()[toolbox]] : saved
  return { ...value, version: saveVersions.gateRepair, world: { ...initialGateRepair(), residentTrust: { wren: 0 }, ...value.world, items } }
}

// Version 5 added the ferry terminal repair: its stage, each stage's contributions and any timber on the way.
function migrateFerry(value: unknown): unknown {
  if (!isRecord(value) || value.version !== saveVersions.residentFavor || !isRecord(value.world)) return value
  return { ...value, version: saveVersions.ferryRepair, world: { ...initialFerryRepair(), ...value.world } }
}

function migrateSave(value: unknown) {
  return migrateTrust(migrateFerry(migrateResidents(migrateGate(migrateWallets(value)))))
}

function isGateRepair(world: Record<string, unknown>, islandTime: number) {
  const { gate, gateRepair, residents, lastFavorPay } = world
  const time = (value: unknown) => value === undefined || (isNumber(value) && value >= 0 && value <= islandTime)
  if (!isRecord(gate) || typeof gate.open !== 'boolean' || typeof gate.closePending !== 'boolean') return false
  if (!isResidentRecords(residents, islandTime)) return false
  if (lastFavorPay !== undefined && !isFavorReceipt(lastFavorPay)) return false
  return isRecord(gateRepair) && gateStages.some((stage) => stage === gateRepair.stage)
    && (gateRepair.pinHolder === null || (isNumber(gateRepair.pinHolder) && Number.isInteger(gateRepair.pinHolder)))
    && time(gateRepair.acceptedAt) && time(gateRepair.mendedAt) && (gateRepair.stage !== 'mended' || gateRepair.mendedAt !== undefined)
    && (gateRepair.swelling === undefined || ((gateRepair.swelling === 'swollen' || gateRepair.swelling === 'planed') && gateRepair.stage === 'mended'))
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
  return active === null || (mission === 'complete' && isRecord(active) && isJobId(active.id)
    && isNumber(active.progress) && Number.isInteger(active.progress) && active.progress >= 0 && active.progress < jobs[active.id].quantity)
}

// Learner fleet records are optional, so saves from before the fleet still load.
function isLearnerFleet(world: Record<string, unknown>) {
  const { vehicles, practice } = world
  return (vehicles === undefined || (isRecord(vehicles) && Object.entries(vehicles).every(([id, pose]) => learnerVehicleIds.some((known) => known === id) && isPose(pose))))
    && (practice === undefined || (isRecord(practice) && Object.entries(practice).every(([id, stop]) =>
      learnerVehicleIds.some((known) => known === id) && isNumber(stop) && Number.isSafeInteger(stop) && stop >= 0)))
}

function isDrivingXp(value: unknown) {
  return value === undefined || (isRecord(value) && Object.entries(value).every(([career, xp]) => Object.hasOwn(drivingCareers, career) && isCoinBalance(xp)))
}

// A learner vehicle only goes with a seat that vehicle has.
function isLearnerSeat(vehicle: unknown, seat: unknown) {
  if (vehicle === undefined) return true
  const id = learnerVehicleIds.find((known) => known === vehicle)
  return id !== undefined && (seat === 'driver' || seat === 'passenger') && seatOffset(id, seat) !== undefined
}

function validDrivingRecord(player: Record<string, unknown>) {
  return (player.deliveryXp === undefined || isCoinBalance(player.deliveryXp))
    && isDrivingXp(player.drivingXp)
    && isLearnerSeat(player.vehicle, player.seat)
    && (player.freightTicket === undefined || isFreightTicket(player.freightTicket))
    && (player.drivenCrates === undefined || (Array.isArray(player.drivenCrates) && player.drivenCrates.length === crateStarts.length
      && player.drivenCrates.every((metres) => isNumber(metres) && metres >= 0)))
}

function isSavedIncident(world: Record<string, unknown>, islandTime: number) {
  const clearedAt = world.lookoutFireClearedAt
  return isNumber(world.fire)
    && ['delivery', 'fire', 'complete'].some((mission) => mission === world.mission)
    && (clearedAt === undefined || (isNumber(clearedAt) && clearedAt >= 0 && clearedAt <= islandTime))
}

function isSavedAviation(value: unknown) {
  const { aerial } = isRecord(value) ? value : {}
  return isRecord(value) && typeof value.qualified === 'boolean' && typeof value.surveyed === 'boolean'
    && (!value.surveyed || value.qualified) && (aerial === undefined || (Array.isArray(aerial)
      && new Set(aerial).size === aerial.length && aerial.every((id) => aerialSurveys.some((survey) => survey.id === id))
      && (aerial.length === 0 || value.qualified)))
}

function isSavedFarmWork(value: unknown) {
  if (!isRecord(value) || !isCoinBalance(value.delivered) || !isCoinBalance(value.load)) return false
  const { stage, delivered, load } = value
  if (stage === 'starter') return delivered < farmOrders.starter.quantity && load === 0
  if (stage === 'harvest') return delivered < farmOrders.harvest.quantity && delivered + load <= farmOrders.harvest.quantity
  return (stage === 'offer' || stage === 'qualified' || stage === 'complete') && delivered === 0 && load === 0
}

function hasValidProgress(world: Record<string, unknown>) {
  return (world.jobs === undefined || isJobBoard(world.jobs, world.mission))
    && (world.aviation === undefined || isSavedAviation(world.aviation))
    && (world.produce === undefined || isSavedFarmWork(world.produce))
    && isLearnerFleet(world)
}

function isSavedMaterials(world: Record<string, unknown>, islandTime: number) {
  const work = world.materialsWork
  const residents = world.residents as Snapshot['residents']
  const gate = world.gateRepair as Snapshot['gateRepair']
  const kept = residents.wren?.kept.includes(repairSupplyFavor.id) ?? false
  const active = residents.wren?.active === repairSupplyFavor.id
  if (work === undefined) return !active && !kept
  if (!isRecord(work) || (work.checkout !== 'qualified' && !repairMaterials.some((material) => material === work.checkout))) return false
  const { readyAt, request } = work
  if (!isRecord(readyAt) || !repairMaterials.every((material) => {
    const time = readyAt[material]
    return isNumber(time) && time >= 0 && time <= islandTime + materialRefillSeconds
  })) return false
  if (gate.stage !== 'mended' && work.checkout !== 'timber') return false
  if (request === null) return !active && !kept
  if (!isRecord(request) || work.checkout !== 'qualified' || !repairMaterials.some((material) => material === request.material)
    || !isCoinBalance(request.delivered) || request.delivered > repairQuantity) return false
  return request.delivered === repairQuantity ? kept && !active : active && !kept
}

function isSavedMaterialPocket(value: unknown) {
  return value === undefined || (isRecord(value) && repairMaterials.every((material) => {
    const count = value[material]
    return isCoinBalance(count) && count <= repairQuantity
  }))
}

function isSavedCrewMember(entry: unknown): entry is IslandSave['crew'][number] {
  if (!isRecord(entry) || !isCrewToken(entry.token)
    || typeof entry.reserved !== 'boolean' || !isPose(entry.player)) return false
  const player = entry.player
  return isNumber(player.id) && Number.isInteger(player.id) && player.id >= 0 && player.id < spawns.length
    && validDrivingRecord(player)
    && isSavedMaterialPocket(player.materials)
    && [player.y, player.seeds].every(isNumber) && Array.isArray(player.inventory)
    && (player.starterSeedClaimed === undefined || typeof player.starterSeedClaimed === 'boolean')
    && (player.ownedClothes === undefined || (Array.isArray(player.ownedClothes) && player.ownedClothes.every((item) => typeof item === 'string')))
    && isRecord(player.goods) && [player.goods.fish, player.goods.carrots].every(isNumber)
}

// Shared repair work: Wren's materials checkout and the ferry terminal.
function isSavedProjects(world: Record<string, unknown>, islandTime: number) {
  return isSavedMaterials(world, islandTime) && isFerryRepair(world.ferryRepair, islandTime)
}

type SaveFields = Omit<IslandSave, 'world'> & { world: Omit<IslandSave['world'], 'journal'> & { journal?: unknown } }

function isSave(value: unknown): value is SaveFields {
  if (!isRecord(value) || value.version !== currentSaveVersion || !isCoinBalance(value.crewCoins)
    || !validReceipt(value.lastStarterPay) || !isNumber(value.islandTime) || value.islandTime < 0
    || !Array.isArray(value.growth) || value.growth.length !== farmPlots.length || !value.growth.every(isNumber)
    || !Array.isArray(value.crew) || !value.crew.every(isSavedCrewMember) || !isRecord(value.world)) return false
  const { world } = value
  const reservedIds = new Set(value.crew.filter(({ reserved }) => reserved).map(({ player }) => player.id))
  if (!hasValidProgress(world)) return false
  return isPose(world.truck) && isPose(world.skiff) && isSavedIncident(world, value.islandTime) && isGateRepair(world, value.islandTime)
    && isSavedProjects(world, value.islandTime)
    && Array.isArray(world.farm) && world.farm.length === farmPlots.length
    && world.farm.every((stage: unknown) => ['grass', 'tilled', 'planted', 'watered', 'ripe'].some((name) => name === stage))
    && Array.isArray(world.items) && world.items.length === itemStarts.length
    && world.items.every((item: unknown, id) => isPose(item) && item.id === id && isNumber(item.y)
      && (item.holder === null || (isNumber(item.holder) && reservedIds.has(item.holder)))
      && item.kind === itemStarts[id].kind)
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
        const { journal: stored, ...world } = parsed.world
        const journal = stored === undefined ? undefined : readJournal(stored, parsed.islandTime)
        if (stored !== undefined && !journal) throw new Error('Unsupported or malformed save')
        return { ...parsed, world: { ...world, ...(journal && { journal }) } }
      }
      catch (error) {
        if (isRecord(error) && error.code === 'ENOENT') return undefined
        throw new Error(`Could not load island save ${path}`, { cause: error })
      }
    },
    write(state: IslandSave) {
      mkdirSync(directory, { recursive: true, mode: privateDirectoryMode })
      const temporary = `${path}.${process.pid}.tmp`
      writeFileSync(temporary, JSON.stringify(state) + '\n', { mode: privateSaveFileMode })
      renameSync(temporary, path)
    },
  }
}
