import type { LiveTrial } from './live-checkpoints.ts'
import type { FreightTicket } from './ore-contracts'
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
import type { FavorReceipt, GardenGate, GateAction, GateRepair, GateStep } from './gate-repair'
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
  cultivation?: CultivationCue[]
  weather: Weather
  islandTime: number
  jobs: JobBoardState
  gate: GardenGate
  gateRepair: GateRepair
  residentTrust: { wren: number }
  lastFavorPay?: FavorReceipt
}

export type ServerMessage =
  | Snapshot
  | { type: 'welcome'; id: number }
  | { type: 'fishing-result'; result: FishingResult }
  | { type: 'market-sale'; coins: number }
  | { type: 'job-pay'; coins: number; job: keyof typeof starterPay }
  | { type: 'order-pay'; coins: number; id: JobId }
  | { type: 'order-unavailable' | 'starter-seed' | 'crew-note' | 'fisher-chat' | 'wren-chat' | 'open-wardrobe' | 'open-clothing-counter' }
  | { type: 'favor-pay'; resident: 'wren'; coins: number; trust: number }
  | { type: 'gate-step'; step: GateStep }
  | { type: 'angler-purchase'; result: ClothingPurchaseResult }
  | { type: 'clothing-purchase'; item: ClothingId; result: ClothingPurchaseResult }
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
  | { type: 'interact'; intent?: GateAction }
  | { type: 'seat' | 'jump' | 'respawn' }
