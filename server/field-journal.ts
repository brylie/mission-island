import { fieldInteractions } from '../src/field-interactions.ts'
import type { Snapshot } from '../src/protocol.ts'
import type { CrewMember, CrewNotice } from './crew.ts'

export function createFieldJournal(state: Snapshot, notifyCrew: (message: CrewNotice) => void) {
  function inspect(member: CrewMember, subject: number | undefined) {
    const option = fieldInteractions(state, member.player).find(choice => choice.subject === subject)
    if (!option) {
      member.notify?.({ type: 'field-unavailable' })
      return
    }
    const { record: id } = option
    const previous = state.journal.records.find(entry => entry.id === id)
    const seen = { time: state.islandTime, rain: state.weather.rain }
    if (previous) previous.seen ??= seen
    else state.journal.records.push({ id, seen })
    const message = { type: 'field-record', id, time: seen.time, credited: !previous } as const
    if (message.credited) notifyCrew(message)
    else member.notify?.(message)
  }

  function hearMara() {
    state.journal.heardMara = true
  }

  return { inspect, hearMara }
}
