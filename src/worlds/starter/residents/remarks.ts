import type { Remark } from '../../../residents/definition.ts'

const eveningWalkStartHour = 17
const eveningWalkEndHour = 20
const earlyMarketStartHour = 7
const noonHour = 12
const afternoonMarketEndHour = 18
const tallyDoneHour = 16
const lateSupperHour = 21
const brokenPromiseRemarkWeight = 2

// Each resident's own small talk, mixed with the island's shared remarks when they talk.
export const maraRemarks: readonly Remark[] = [
  { text: 'The mackerel are running close in {today}.', stop: ['work'], rain: false },
  { text: 'Fish bite better in the rain. Don’t ask me why.', stop: ['work'], rain: true },
  { text: 'Watch the gulls. They find the shoals before I do.', stop: ['work'] },
  { text: 'My knees tell me when the weather’s turning.', stop: ['home', 'walking'] },
  { text: 'I keep a spare hook in every coat. You learn.', tier: ['familiar', 'trusted'] },
  { text: 'Off home for a pot of tea, {listener}.', stop: ['walking'], hours: [eveningWalkStartHour, eveningWalkEndHour] },
]

export const inesRemarks: readonly Remark[] = [
  { text: 'Fresh produce sells first thing. By noon it’s all gossip and crumbs.', stop: ['work'], hours: [earlyMarketStartHour, noonHour] },
  { text: 'A slow afternoon at the stall. I don’t mind it.', stop: ['work'], hours: [noonHour, afternoonMarketEndHour] },
  { text: 'Nobody buys lettuce in the rain. Soup vegetables, though!', stop: ['work'], rain: true },
  { text: 'I count the takings twice. Old habit from the mainland.', tier: ['familiar', 'trusted'] },
  { text: 'The square’s quiet once the stall closes. I like it that way.', stop: ['home'] },
]

export const bramRemarks: readonly Remark[] = [
  { text: 'Every crate that leaves this yard goes on my tally. Every one.', stop: ['work'] },
  { text: 'Keep the road clear and the yard runs itself.', stop: ['work'] },
  { text: 'Rain makes the crates slippery. Lift with your knees.', stop: ['work'], rain: true },
  { text: 'Before the ferry stopped, this yard was full every morning.', tier: ['familiar', 'trusted'] },
  { text: 'I’ve done the tally for the day. Time for my own supper.', stop: ['home', 'walking'], hours: [tallyDoneHour, lateSupperHour] },
]

export const wrenRemarks: readonly Remark[] = [
  { text: 'There’s always something to mend on an island. Salt gets into everything.', stop: ['work'] },
  { text: 'Hinges, latches, the odd kettle. Bring me anything that squeaks.', stop: ['work'] },
  { text: 'Wet weather swells the timber. Every gate on the island sticks after a week of it.', rain: true },
  { text: 'I’ll be watching how this next job goes, {listener}.', standing: ['wronged', 'wary'], weight: brokenPromiseRemarkWeight },
  { text: 'I take people at their word. I’d like to keep doing that.', standing: ['wronged'], weight: brokenPromiseRemarkWeight },
  { text: 'The garden’s going to seed. I’ll get to it.', stop: ['home'] },
]
