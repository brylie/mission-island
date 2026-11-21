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
// Steady until the crew breaks a promise. Wronged until they put it right, then wary until they rebuild.
export type Standing = 'steady' | 'wronged' | 'wary'

export interface ConversationContext {
  state: Snapshot
  tier: TrustTier
  standing: Standing
  kept: readonly string[]
  // Breaches the crew has fully rebuilt from, so a resident can say they rely on the crew again.
  forgiven: number
}

export interface ConversationTrait {
  // A greeting and a piece of advice. Pure, so a crewmate who joins late or a restarted host hears the same.
  lines(context: ConversationContext): [string, string]
}

export type FavorKind =
  | { goods: keyof Goods; quantity: number }
  | { cargo: 'crate'; drop: Point; radius: number; place: string }
  // Work done in the world and checked by the crew, then finished by reporting back.
  | { check: true }
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
  // A favor finished by reporting back. The crew checks the work in the world, and the resident takes
  // the crew's word for the result. Saying it is sound after seeing a fault breaks the promise.
  report?: { question: string; sound: string; fault: string; found: { sound: string; fault: string } }
}

export type Whereabouts = 'home' | 'work' | 'walking'

export interface RemarkContext extends ConversationContext {
  resident: ResidentDefinition
  stop: Whereabouts
  hour: number
  rain: number
  // The name of the crewmate talking.
  listener: string
}

// Small talk: a line a resident might say when it fits the moment. A remark with no conditions fits always.
export interface Remark {
  text: string
  weight?: number
  hours?: readonly [from: number, to: number]
  rain?: boolean
  stop?: readonly Whereabouts[]
  tier?: readonly TrustTier[]
  standing?: readonly Standing[]
  when?(context: RemarkContext): boolean
}

export interface ResidentDefinition {
  id: string
  identity: { name: string; role: string }
  appearance: { look: CrewAppearance; dye?: string }
  schedule: ScheduleTrait
  conversation: ConversationTrait
  // Offered one at a time, in order.
  favors: readonly FavorDefinition[]
  // The resident's own small talk, mixed with the island's shared remarks.
  remarks?: readonly Remark[]
  // Talking distance in metres.
  reach?: number
}
