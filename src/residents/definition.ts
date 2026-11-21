import type { CrewAppearance } from '../crew-appearance.ts'
import type { Goods } from '../farm.ts'
import type { Player, Snapshot } from '../protocol.ts'
import type { Point } from '../world.ts'

// A resident is assembled from traits, the way a vehicle is: identity and appearance for the
// scene, a schedule the shared clock drives, a conversation built from the shared snapshot, and
// the favors they can ask of the crew. Shared systems read the traits; the host owns each
// resident's record of trust and favors; the world layer places them. Adding a villager or a
// visitor means one definition file and one registry entry.
export interface Stop extends Point { heading: number }
export interface Leg { point: Point; indoors?: boolean }

// The part of the shared snapshot a resident's day can depend on. Wren's route changes once the gate is mended.
export type ResidentWorld = Pick<Snapshot, 'islandTime' | 'gateRepair'>

export interface ScheduleTrait {
  home: Stop
  work: Stop
  // Island hours when the resident sets out for work and for home.
  departs: number
  returns: number
  // Metres walked per island hour.
  pace: number
  // From home to work. The walk home follows it backwards.
  route(state: ResidentWorld): readonly Leg[]
}

export type TrustTier = 'stranger' | 'familiar' | 'trusted'

interface ConversationContext {
  state: Snapshot
  tier: TrustTier
  kept: readonly string[]
}

export interface ConversationTrait {
  // A greeting and a piece of advice. Pure, so a crewmate who joins late or a restarted host hears the same.
  lines(context: ConversationContext): [string, string]
}

export type FavorKind =
  | { goods: keyof Goods; quantity: number }
  | { cargo: 'crate'; drop: Point; radius: number; place: string }
  | { custom: true }

export interface FavorGuide { title: string; detail: string; next: string }

export interface FavorDefinition {
  id: string
  title: string
  coins: number
  trust: number
  kind: FavorKind
  // The resident asks only while this holds. Defaults to always.
  available?(state: Snapshot): boolean
  // What the resident says when asking, and while waiting.
  offer: string
  reminder: string
  // The crew guide entry while the favor is under way.
  detail: string
  next: string
  // A custom favor can write its own guide and keep it listed outside the active window.
  guide?(state: Snapshot, player: Player): FavorGuide
  listed?(state: Snapshot): boolean
}

export interface ResidentDefinition {
  id: string
  identity: { name: string; role: string }
  appearance: { look: CrewAppearance; dye?: string }
  schedule: ScheduleTrait
  conversation: ConversationTrait
  // Offered one at a time, in order.
  favors: readonly FavorDefinition[]
  // Talking distance in metres.
  reach?: number
}
