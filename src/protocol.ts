import type { Point, Pose } from './world'
import type { CrewAppearance } from './crew-appearance'
import type { ChargeKind } from './charged-actions'
import type { InventoryItem } from './inventory'
import type { Goods, PlotStage } from './farm'
import type { Truck } from './truck-pose'
import type { JobBoardState, JobId } from './jobs'
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
  coins: number
  ownsAngler: boolean
}

export interface Skiff extends Pose {
  speed: number
}

export interface Item extends Pose {
  id: number
  kind: 'crate' | 'extinguisher'
  holder: number | null
  onBed: boolean
  y: number
  rotation: { x: number; y: number; z: number; w: number } | null
  delivered: boolean
  spraying: boolean
}

export type Mission = 'delivery' | 'fire' | 'complete'

export interface Snapshot {
  type: 'state'
  players: Player[]
  truck: Truck
  skiff: Skiff
  items: Item[]
  mission: Mission
  fire: number
  farm: PlotStage[]
  weather: Weather
  islandTime: number
  jobs: JobBoardState
}

export type ServerMessage =
  | Snapshot
  | { type: 'welcome'; id: number }
  | { type: 'fishing-result'; result: FishingResult }
  | { type: 'market-sale'; coins: number }
  | { type: 'job-pay'; coins: number; job: 'crate' | 'delivery' | 'fire' }
  | { type: 'order-pay'; coins: number; id: JobId }
  | { type: 'order-unavailable' | 'starter-seed' }
  | { type: 'full' | 'duplicate' }

export type ClientMessage =
  | { type: 'join'; token: string }
  | { type: 'input'; input: Input }
  | { type: 'appearance'; appearance: CrewAppearance }
  | { type: 'crew-name'; name: string }
  | { type: 'primary'; phase: 'start' | 'release' | 'cancel'; aim?: number }
  | { type: 'equip'; item: InventoryItem }
  | { type: 'take-job'; id: JobId }
  | { type: 'buy-angler' | 'buy-seed' }
  | { type: 'interact' | 'seat' | 'jump' | 'respawn' }
