import { WebSocket, type RawData } from 'ws'
import type { ServerMessage } from '../src/protocol.ts'
import { readCrewCommand } from './commands.ts'
import type { createGame } from './game.ts'

function readMessage(data: RawData): Record<string, unknown> | undefined {
  try {
    const buffer = Array.isArray(data) ? Buffer.concat(data) : Buffer.isBuffer(data) ? data : Buffer.from(new Uint8Array(data))
    const parsed: unknown = JSON.parse(buffer.toString('utf8'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : undefined
  } catch {
    return undefined
  }
}

type Simulation = Pick<ReturnType<typeof createGame>, 'join' | 'tick'>
type JoinedCrew = Extract<ReturnType<Simulation['join']>, { type: 'joined' }>

export function createSocketSessions(game: Simulation) {
  const joinedSockets = new Set<WebSocket>()

  function connect(socket: WebSocket) {
    let crew: JoinedCrew | undefined
    const joinTimeout = setTimeout(() => socket.close(), 3_000)
    const reply = (message: ServerMessage) => socket.send(JSON.stringify(message))
    socket.on('error', () => socket.terminate())
    socket.on('message', (data, binary) => {
      if (binary) return
      const message = readMessage(data)
      if (!message) return
      if (crew) {
        const command = readCrewCommand(message)
        if (command) crew.dispatch(command)
        return
      }

      const token = message.token
      if (message.type !== 'join' || typeof token !== 'string' || !/^[a-f0-9]{32}$/.test(token)) return
      const result = game.join(token, (notice) => {
        if (socket.readyState === WebSocket.OPEN) reply(notice)
      })
      if (result.type !== 'joined') {
        reply({ type: result.type })
        socket.close()
        return
      }
      crew = result
      joinedSockets.add(socket)
      clearTimeout(joinTimeout)
      reply({ type: 'welcome', id: crew.id })
    })
    socket.on('close', () => {
      clearTimeout(joinTimeout)
      joinedSockets.delete(socket)
      crew?.disconnect()
    })
  }

  function tick() {
    const snapshot = JSON.stringify(game.tick())
    for (const socket of joinedSockets) {
      if (socket.readyState === WebSocket.OPEN && socket.bufferedAmount < 65_536) socket.send(snapshot)
    }
  }

  return { connect, tick }
}
