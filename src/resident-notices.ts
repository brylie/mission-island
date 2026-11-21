import type { ServerMessage } from './protocol.ts'
import { starterResident } from './worlds/starter/residents.ts'

type Notice<T> = Extract<ServerMessage, { type: T }>

function names(resident: string, favor: string) {
  const definition = starterResident(resident)
  return { name: definition?.identity.name ?? resident, title: definition?.favors.find(({ id }) => id === favor)?.title ?? favor }
}

const signed = (trust: number) => trust < 0 ? `−${-trust}` : `+${trust}`

// Both crewmates read the same receipt, whoever handed in the favor. Amends pay but earn no trust,
// and the favor that rebuilds a resident's reliance says so.
function favorPayText({ resident, favor, trust, restored }: Notice<'favor-pay'>) {
  const { name, title } = names(resident, favor)
  const after = restored ? ` · ${name} relies on the crew again` : trust === 0 ? ` · Put right. ${name} will still check your work` : ''
  return `${title} · Crew bank · ${name} trust ${signed(trust)}${after}`
}

function favorAcceptedText({ resident, favor, playerId }: Notice<'favor-accepted'>, localId: number) {
  const { name, title } = names(resident, favor)
  return `${playerId === localId ? 'You' : 'Your crewmate'} agreed to help ${name} · ${title} · See the crew guide`
}

// A report reaches both players, so a partner who was away learns what was said to the resident.
function favorReportText({ resident, playerId, result, trust }: Notice<'favor-report'>, localId: number) {
  const { name } = names(resident, '')
  const who = playerId === localId ? 'You' : 'Your crewmate'
  return result === 'honest' ? `${who} told ${name} the work still needs fixing · No penalty`
    : `${who} told ${name} it was fixed, but it wasn’t · ${name} trust ${signed(trust)}`
}

export function favorFeedback(notice: Notice<'favor-pay' | 'favor-accepted' | 'favor-report'>, localId: number) {
  if (notice.type === 'favor-pay') return { key: `+${notice.coins} coins`, label: favorPayText(notice) }
  if (notice.type === 'favor-report') return { key: '', label: favorReportText(notice, localId) }
  return { key: '', label: favorAcceptedText(notice, localId) }
}
