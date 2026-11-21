import type { LiveTrial, ScenarioSummary } from './live-checkpoints.ts'
import type { FreightTicket } from './ore-contracts'
import type { AviationState, FlightResult } from './aviation'
import type { DriftwoodFrame } from './simulation/driftwood-school'
import type { BiomeFrame } from './biome-model'
import type { Point, Pose, starterPay } from './world'
import type { CrewAppearance } from './crew-appearance'
import type { ClothingId } from './clothing-catalog'
import type { ChargeKind } from './charged-actions'
import type { InventoryItem } from './inventory'
import type { Goods, PlotStage } from './farm'
import type { Truck } from './truck-pose'
import type { JobBoardState, JobId } from './jobs'
import type { GardenGate, GateRepair, GateStep } from './gate-repair'
import type { FavorReceipt, ResidentRecords } from './residents/trust'
import type { InteractionChoice } from './interaction-options'
import type { FarmOrderId, FarmWork } from './farm-orders'
import type { MaterialPockets, MaterialsWork, RepairMaterial } from './materials-work'
import type { FieldJournal, FieldSubject } from './field-journal'
export type FishingResult = 'caught' | 'no-bite' | 'dry-cast' | 'boat-moving' | 'escaped' | 'line-snapped'

export interface Weather {
  hour: number
  rain: number
}

export interface Input {
  x: number
  z: number
  spray: boolean
  aim?: number
  careful: boolean
  sprint: boolean
  brake?: boolean
  raiseRightHand?: boolean
  flightTurn?: number
  flightPitch?: number
}

export interface Player extends Pose {
  deliveryXp?: number
  drivenCrates?: number[]
  freightTicket?: FreightTicket
  id: number
  name: string
  discoveries: string[]
  y: number
  grounded: boolean
  onBed: boolean
  truckSurface?: 'bed' | 'hood' | 'roof'
  reaching: boolean
  rightHandRaised: boolean
  appearance?: CrewAppearance
  appearanceBase?: number
  connected: boolean
  sleeping: boolean
  swimming: boolean
  seat: 'driver' | 'passenger' | 'port' | 'starboard' | null
  inventory: InventoryItem[]
  equipped: InventoryItem | null
  goods: Goods
  materials?: MaterialPockets
  seeds: number
  starterSeedClaimed?: boolean
  charge: { kind: ChargeKind; power: number } | null
  casting: { bobber: Point; elapsed: number; power: number; fight?: { progress: number; tension: number; pulling: boolean } } | null
  throwing: boolean
  rowing: boolean
  ownsAngler: boolean
  ownedClothes?: ClothingId[]
}

export interface Skiff extends Pose {
  speed: number
}

export interface Item extends Pose {
  id: number
  kind: 'crate' | 'extinguisher' | 'toolbox'
  holder: number | null
  onBed: boolean
  y: number
  rotation: { x: number; y: number; z: number; w: number } | null
  delivered: boolean
  spraying: boolean
}

export type Mission = 'delivery' | 'fire' | 'complete'

export interface CultivationCue {
  sequence: number
  kind: 'hoe' | 'water' | 'harvest'
  plot: number
  actor: number
}

export interface Snapshot {
  playtest?: LiveTrial
  driftwood: DriftwoodFrame
  juniper: BiomeFrame
  type: 'state'
  crewCoins: number
  lastStarterPay?: keyof typeof starterPay
  players: Player[]
  truck: Truck
  skiff: Skiff
  items: Item[]
  mission: Mission
  fire: number
  lookoutFireClearedAt?: number
  farm: PlotStage[]
  farmWork: FarmWork
  cultivation?: CultivationCue[]
  weather: Weather
  islandTime: number
  jobs: JobBoardState
  gate: GardenGate
  gateRepair: GateRepair
  residents: ResidentRecords
  lastFavorPay?: FavorReceipt
  materialsWork: MaterialsWork
  aviation: AviationState
  journal: FieldJournal
}

export type ServerMessage =
  | Snapshot
  | { type: 'welcome'; id: number; scenarios?: readonly ScenarioSummary[] }
  | { type: 'fishing-result'; result: FishingResult }
  | { type: 'market-sale'; coins: number }
  | { type: 'farm-pay'; id: FarmOrderId; coins: number }
  | { type: 'barrow-returned' }
  | { type: 'job-pay'; coins: number; job: keyof typeof starterPay }
  | { type: 'order-pay'; coins: number; id: JobId }
  | { type: 'order-unavailable' | 'starter-seed' | 'crew-note' | 'open-wardrobe' | 'open-clothing-counter' }
  | { type: 'resident-chat'; resident: string }
  | { type: 'field-record'; id: FieldSubject; time: number; credited: boolean }
  | { type: 'field-unavailable' }
  | { type: 'favor-accepted'; resident: string; favor: string; playerId: number }
  | { type: 'favor-pay'; resident: string; favor: string; coins: number; trust: number }
  | { type: 'gate-step'; step: GateStep }
  | { type: 'materials-step'; step: 'gathered' | 'inspected' | 'timber-checked' | 'qualified'; material: RepairMaterial }
  | { type: 'materials-step'; step: 'delivered'; material: RepairMaterial; remaining: number }
  | { type: 'angler-purchase'; result: ClothingPurchaseResult }
  | { type: 'clothing-purchase'; item: ClothingId; result: ClothingPurchaseResult }
  | { type: 'flight-result'; result: FlightResult; pilotId: number; aerial?: string[]; recorded?: number }
  | { type: 'aerial-sighting'; id: string }
  | { type: 'full' | 'duplicate' }

export type ClothingPurchaseResult = 'bought' | 'already-owned' | 'insufficient-funds' | 'away'

export type ClientMessage =
  | { type: 'join'; token: string }
  | { type: 'input'; input: Input }
  | { type: 'appearance'; appearance: CrewAppearance }
  | { type: 'crew-name'; name: string }
  | { type: 'primary'; phase: 'start' | 'release' | 'cancel'; aim?: number }
  | { type: 'equip'; item: InventoryItem }
  | { type: 'take-job'; id: JobId }
  | { type: 'buy-angler' | 'buy-seed' }
  | { type: 'buy-clothing'; item: ClothingId }
  | { type: 'interact'; choice?: InteractionChoice }
  | { type: 'seat' | 'jump' | 'respawn' }
