import { cleanCrewName, readAppearance } from '../src/crew-appearance.ts'
import { isClothingId } from '../src/clothing-catalog.ts'
import { interactionActions } from '../src/interaction-options.ts'
import { starterTools } from '../src/inventory.ts'
import { isJobId, type JobId } from '../src/jobs.ts'
import type { ClientMessage, Input } from '../src/protocol.ts'
import { stopped } from './crew.ts'

export type CrewCommand =
  | Exclude<ClientMessage, { type: 'join' | 'take-job' }>
  | { type: 'take-job'; id: JobId | undefined }

function readHeading(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.atan2(Math.sin(value), Math.cos(value)) : undefined
}

function readInput(raw: unknown): Input {
  if (!raw || typeof raw !== 'object') return stopped
  const { x, z, spray, aim, careful, sprint, brake, raiseRightHand } = raw as Record<string, unknown>
  const axis = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
    ? Math.max(-1, Math.min(1, value)) : 0
  return {
    x: axis(x),
    z: axis(z),
    spray: spray === true,
    aim: readHeading(aim),
    careful: careful === true,
    sprint: sprint === true,
    brake: brake === true,
    raiseRightHand: raiseRightHand === true,
  }
}

// A malformed choice is dropped rather than read as a bare press, which would run the default interaction.
function readChoice(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null
  const { action, subject } = raw as Record<string, unknown>
  const known = interactionActions.find((name) => name === action)
  if (!known) return null
  if (subject === undefined) return { action: known }
  return Number.isSafeInteger(subject) && (subject as number) >= 0 ? { action: known, subject: subject as number } : null
}

export function readCrewCommand(message: Record<string, unknown>): CrewCommand | undefined {
  switch (message.type) {
    case 'input':
      return { type: 'input', input: readInput(message.input) }
    case 'primary': {
      const { phase } = message
      if (phase === 'start' || phase === 'release' || phase === 'cancel') {
        return { type: 'primary', phase, aim: readHeading(message.aim) }
      }
      return
    }
    case 'equip': {
      const item = starterTools.find((tool) => tool === message.item)
      if (item) return { type: 'equip', item }
      return
    }
    case 'appearance':
      return { type: 'appearance', appearance: readAppearance(message.appearance) }
    case 'crew-name':
      return { type: 'crew-name', name: cleanCrewName(message.name) }
    case 'take-job':
      return { type: 'take-job', id: isJobId(message.id) ? message.id : undefined }
    case 'buy-clothing':
      if (isClothingId(message.item)) return { type: message.type, item: message.item }
      return
    case 'interact': {
      if (message.choice === undefined) return { type: 'interact' }
      const choice = readChoice(message.choice)
      return choice ? { type: 'interact', choice } : undefined
    }
    case 'buy-angler':
    case 'buy-seed':
    case 'seat':
    case 'jump':
    case 'respawn':
      return { type: message.type }
  }
}
