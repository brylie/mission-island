import type { Remark, RemarkContext } from '../../residents/definition.ts'
import { secondIslandGoal } from '../../jobs.ts'
import { dawnHour, dawnsBetween } from '../../weather.ts'

const clearDayStartsHour = 7
const clearDayEndsHour = 18
const morningLightEndsHour = 10
const lateAfternoonStartsHour = 16
const lamplightStartsHour = 20
const lamplightEndsHour = 5
const stargazingStartsHour = 22
const stargazingEndsHour = 4
const immediateConcernWeight = 3
const featuredProgressWeight = 2
const fireRecoveryDawns = 3
const nearFerryReadinessOrders = secondIslandGoal - 1
const notableAerialSurveyCount = 3

const others = (context: RemarkContext, id: string) => context.resident.id !== id
const kept = ({ state }: RemarkContext, resident: string, favor: string) => Boolean(state.residents[resident]?.kept.includes(favor))
const brokenWith = ({ state, resident }: RemarkContext, id: string) => resident.id !== id && state.residents[id]?.breach?.amended === false

// Small talk any Starter Island resident might make. Each line reacts to something both players can see:
// the sky, the hour, the crew's work and what the neighbors have been saying. Word gets around a small island.
export const islandRemarks: readonly Remark[] = [
  // Weather and the hour.
  { text: '{hello}, {listener}. Wet enough for you?', rain: true },
  { text: 'At least {sky} is good for Island Farm.', rain: true },
  { text: 'Mind the puddles by the market. The drains back up in a shower.', rain: true },
  { text: '{hello}! Can’t complain about {sky}.', rain: false, hours: [clearDayStartsHour, clearDayEndsHour] },
  { text: 'Lovely light {today}. The water’s like glass.', rain: false, hours: [dawnHour, morningLightEndsHour] },
  { text: 'The days go quickly on this island, don’t they?', hours: [lateAfternoonStartsHour, lamplightStartsHour] },
  { text: 'You’re out late, {listener}. The lamps are on along the road.', hours: [lamplightStartsHour, lamplightEndsHour] },
  { text: 'Can’t sleep either? Look at {sky}.', hours: [stargazingStartsHour, stargazingEndsHour], rain: false },
  { text: '{hello}. I’m on my way, can’t stop long.', stop: ['walking'] },
  { text: 'Walk with me a bit, if you’re going my way.', stop: ['walking'], tier: ['familiar', 'trusted'] },

  // The crew's work.
  { text: 'Is that smoke over the lookout? I hope someone’s on it.', when: ({ state }) => state.mission === 'fire', weight: immediateConcernWeight },
  { text: 'Those crates for Seabrook won’t carry themselves.', when: ({ state }) => state.mission === 'delivery', weight: featuredProgressWeight },
  { text: 'The lookout still smells of ash, but the green is coming back.', when: ({ state }) => state.lookoutFireClearedAt !== undefined && dawnsBetween(state.lookoutFireClearedAt, state.islandTime) < fireRecoveryDawns },
  { text: 'People say the harbor crew gets things done.', when: ({ state }) => state.jobs.completed >= 1 },
  { text: 'Word is the crew’s nearly ready for the second island. We’ll miss you.', when: ({ state }) => state.jobs.completed >= nearFerryReadinessOrders, weight: featuredProgressWeight },
  { text: 'Busy day for the flatbed, I see.', when: ({ state }) => state.jobs.active !== null },
  { text: 'Was that you gliding off Windstone Ridge? Braver than me.', when: ({ state }) => state.aviation.qualified },
  { text: 'Someone said you can see the whole island from up on the ridge, wings and all.', when: ({ state }) => (state.aviation.aerial?.length ?? 0) >= notableAerialSurveyCount },
  { text: 'The carrots at Island Farm look ready to pull.', when: ({ state }) => state.farm.includes('ripe') },

  // Gossip about the neighbors' favors.
  { text: 'Mara says you brought her carrots. That was kind.', when: (c) => others(c, 'mara') && kept(c, 'mara', 'mara-supper') },
  { text: 'Ines’s fish display was the talk of the square.', when: (c) => others(c, 'ines') && kept(c, 'ines', 'ines-display') },
  { text: 'Bram can’t stop going on about that staged load. High praise, from Bram.', when: (c) => others(c, 'bram') && kept(c, 'bram', 'bram-staging') },
  { text: 'Wren’s gate swings like new. Everyone noticed.', when: (c) => others(c, 'wren') && kept(c, 'wren', 'wren-gate') && c.state.gateRepair.swelling === undefined },
  { text: 'Wren seemed upset earlier. Something about that gate.', when: (c) => brokenWith(c, 'wren'), weight: immediateConcernWeight },

  // How well the resident knows the crew.
  { text: 'You’re always welcome here, {listener}.', tier: ['trusted'], standing: ['steady'] },
  { text: 'I keep meaning to ask where you two are from.', tier: ['stranger'] },
]
