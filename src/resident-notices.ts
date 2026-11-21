import type { ServerMessage } from './protocol.ts'
import { starterResident } from './worlds/starter/residents.ts'

type Notice<T> = Extract<ServerMessage, { type: T }>

function names(resident: string, favor: string) {
  const definition = starterResident(resident)
  return { name: definition?.identity.name ?? resident, title: definition?.favors.find(({ id }) => id === favor)?.title ?? favor }
}

// Both crewmates read the same receipt, whoever handed in the favor.
function favorPayText({ resident, favor, trust }: Notice<'favor-pay'>) {
  const { name, title } = names(resident, favor)
  return `${title} · Crew bank · ${name} trust +${trust}`
}

function favorAcceptedText({ resident, favor, playerId }: Notice<'favor-accepted'>, localId: number) {
  const { name, title } = names(resident, favor)
  return `${playerId === localId ? 'You' : 'Your crewmate'} agreed to help ${name} · ${title} · See the crew guide`
}

export function favorFeedback(notice: Notice<'favor-pay' | 'favor-accepted'>, localId: number) {
  return notice.type === 'favor-pay' ? { key: `+${notice.coins} coins`, label: favorPayText(notice) }
    : { key: '', label: favorAcceptedText(notice, localId) }
}
