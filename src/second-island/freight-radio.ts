import { readStorage } from '../browser-storage'
import { isFreightTicket, type FreightCommand, type DriverStatus } from '../ore-contracts'
import { maxHaulSteps, type HaulStep } from '../simulation/ore-truck'

const radioTimeoutMs = 6000
const driveSendIntervalMs = 200

async function exchange(revision: number, command?: FreightCommand) {
  const token = readStorage('sessionStorage', 'mission-island-crew') ?? readStorage('localStorage', 'mission-island-crew')
  const response = await fetch('/api/slatecliff-freight', {
    method: command ? 'POST' : 'GET',
    headers: token ? { Authorization: 'Bearer ' + token } : {},
    body: command && JSON.stringify({ ...command, revision }),
    signal: AbortSignal.timeout(radioTimeoutMs),
  })
  const data: unknown = await response.json()
  if (!data || typeof data !== 'object' || !('xp' in data) || typeof data.xp !== 'number'
    || !('boarded' in data) || typeof data.boarded !== 'boolean' || !('ticket' in data) || !isFreightTicket(data.ticket)) throw new Error('Dispatch radio offline.')
  const status: DriverStatus = { boarded: data.boarded, xp: data.xp, ticket: data.ticket }
  if (!response.ok && data.ticket.revision !== revision) throw new Error('Dispatch changed. Board again to resume.')
  const error = response.ok ? undefined : 'error' in data && typeof data.error === 'string' ? data.error : 'Dispatch unavailable.'
  return { status, error }
}

export function createFreightRadio(disconnected: (message: string) => void) {
  let revision = 0, nextSend = 0
  const pending: HaulStep[] = []
  let sending: Promise<boolean> | undefined
  async function request(command?: FreightCommand) {
    const reply = await exchange(revision, command)
    revision = reply.status.ticket.revision
    return reply
  }
  function flush() {
    if (sending) return sending
    if (!pending.length) return Promise.resolve(true)
    const steps = pending.splice(0)
    sending = request({ action: 'drive', steps }).then(({ error }) => {
      if (error) throw new Error(error)
      return true
    }).catch(() => {
      pending.length = 0
      disconnected('Lost contact with the truck. Reconnecting to dispatch…')
      return false
    }).finally(() => { sending = undefined })
    return sending
  }
  return {
    get full() { return pending.length >= maxHaulSteps },
    record(step: HaulStep) { pending.push(step) },
    update() {
      if (pending.length && !sending && performance.now() >= nextSend) {
        nextSend = performance.now() + driveSendIntervalMs
        void flush()
      }
    },
    async send(command?: Exclude<FreightCommand, { action: 'drive' }>) {
      // Flush all predicted movement, including the final braking step, before signing a ticket.
      while (sending || pending.length) if (!await flush()) throw new Error('Dispatch radio offline.')
      return request(command)
    },
  }
}
