import type { Player, Snapshot } from '../protocol.ts'
import { seededRandom } from '../seeded-random.ts'
import type { Remark, RemarkContext, ResidentDefinition } from './definition.ts'
import { conversationContext } from './favors.ts'
import { residentAt } from './schedule.ts'

const dawnHour = 5
const nightHour = 21
const noonHour = 12
const eveningHour = 17
const noticeableRain = 0.1

// Small talk that fits the moment. Each remark names the conditions it suits: the hour, the weather,
// where the resident is, the crew's standing, or anything else in the shared snapshot. A conversation
// picks one remark that fits, then fills its tokens from small pools, so the same moment can be put
// several ways and a familiar resident still has something new to say.

type Random = () => number
const pick = <T>(items: readonly T[], random: Random) => items[Math.floor(random() * items.length) % items.length]

function partOfDay(hour: number) {
  return hour < dawnHour || hour >= nightHour ? 'night' : hour < noonHour ? 'morning' : hour < eveningHour ? 'afternoon' : 'evening'
}

// Tokens a remark can use. Each fills from a pool chosen for the moment.
const tokens: Record<string, (context: RemarkContext, random: Random) => string> = {
  listener: ({ listener }) => listener,
  hello: ({ hour }, random) => pick({
    night: ['Evening', 'Hello there', 'Oh, hello'],
    morning: ['Morning', 'Good morning', 'Morning to you'],
    afternoon: ['Afternoon', 'Hello', 'Good afternoon'],
    evening: ['Evening', 'Good evening', 'Hello'],
  }[partOfDay(hour)], random),
  sky: ({ rain, hour }, random) => pick(rain > noticeableRain
    ? ['this rain', 'the wet', 'this drizzle']
    : partOfDay(hour) === 'night' ? ['the stars tonight', 'this clear night'] : ['the sunshine', 'this weather', 'the clear sky'], random),
  today: ({ hour }) => ({ night: 'tonight', morning: 'this morning', afternoon: 'this afternoon', evening: 'this evening' })[partOfDay(hour)],
}

export function expandRemark(text: string, context: RemarkContext, random: Random) {
  return text.replace(/\{(\w+)\}/g, (match, name: string) => tokens[name]?.(context, random) ?? match)
}

function within(hour: number, [from, to]: readonly [number, number]) {
  return from <= to ? hour >= from && hour < to : hour >= from || hour < to
}

export function fits(remark: Remark, context: RemarkContext) {
  return (!remark.hours || within(context.hour, remark.hours))
    && (remark.rain === undefined || remark.rain === (context.rain > noticeableRain))
    && (!remark.stop || remark.stop.includes(context.stop))
    && (!remark.tier || remark.tier.includes(context.tier))
    && (!remark.standing || remark.standing.includes(context.standing))
    && (!remark.when || remark.when(context))
}

export function remarkContext(resident: ResidentDefinition, state: Snapshot, player: Pick<Player, 'name' | 'id'>): RemarkContext {
  return { ...conversationContext(resident, state), resident, stop: residentAt(resident.schedule, state).stop, hour: state.weather.hour, rain: state.weather.rain, listener: player.name || `Crew ${player.id + 1}` }
}

// One remark for this conversation. The seed makes the choice repeatable for tests and the Workbench;
// `avoid` skips the line the resident said last time, so talking twice gives something new when possible.
export function chooseRemark(resident: ResidentDefinition, shared: readonly Remark[], context: RemarkContext, seed: number, avoid?: string) {
  const random = seededRandom(seed)
  random()
  const candidates = [...resident.remarks ?? [], ...shared].filter((remark) => fits(remark, context))
  const fresh = candidates.filter(({ text }) => text !== avoid)
  const pool = fresh.length ? fresh : candidates
  const total = pool.reduce((sum, { weight = 1 }) => sum + weight, 0)
  let roll = random() * total
  const remark = pool.find(({ weight = 1 }) => (roll -= weight) < 0) ?? pool[0]
  return remark && { template: remark.text, text: expandRemark(remark.text, context, random) }
}
