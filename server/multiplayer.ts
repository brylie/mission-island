import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Duplex } from 'node:stream'
import type { Plugin, ViteDevServer } from 'vite'
import { WebSocketServer } from 'ws'
import type { WebSocket } from 'ws'
import type { FreightAction } from '../src/ore-contracts.ts'
import { checkpointSettings, type TrialRun } from '../src/live-checkpoints.ts'
import { createGame, tickSeconds } from './game.ts'
import { islandSaveFile } from './save.ts'
import { createSocketSessions } from './socket-sessions.ts'

function isCommand(value: unknown): value is FreightAction {
  if (!value || typeof value !== 'object') return false
  const command = value as Partial<FreightAction>
  return ['accept', 'load', 'deliver'].some(action => action === command.action) &&
    typeof command.choice === 'string' && command.choice.length <= 40 &&
    Number.isSafeInteger(command.revision) && Number.isFinite(command.x) && Number.isFinite(command.z)
}

function freightHandler(freight: ReturnType<typeof createGame>['freight']) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Content-Type', 'application/json')
    const token = /^Bearer ([a-f0-9]{32})$/.exec(request.headers.authorization ?? '')?.[1] ?? ''
    const send = (code: number, error?: string) =>
      response.writeHead(code).end(JSON.stringify({ ...freight.status(token), error }))
    if (request.method === 'GET') { send(200); return }
    if (request.method !== 'POST') { response.setHeader('Allow', 'GET, POST'); send(405); return }
    if (!token) { send(401, 'Join Starter Island to register as a driver.'); return }
    try {
      let body = ''
      for await (const chunk of request) {
        body += chunk
        if (body.length > 1024) { send(413); return }
      }
      const command: unknown = JSON.parse(body)
      if (!isCommand(command)) { send(400); return }
      const error = freight.act(token, command)
      send(error ? 409 : 200, error)
    } catch { send(400) }
  }
}

function initialTrial(): TrialRun {
  const settings = checkpointSettings(process.env.MISSION_ISLAND_CHECKPOINT ?? 'wren-fit', process.env.MISSION_ISLAND_CREW_SIZE ?? '2')
  if (!settings) throw new Error('Unknown MISSION_ISLAND_CHECKPOINT or MISSION_ISLAND_CREW_SIZE. See the live playtest presets in CONTRIBUTING.md.')
  return { ...settings, revision: 1 }
}

function attachGame(server: NonNullable<ViteDevServer['httpServer']>, middlewares: ViteDevServer['middlewares'], root: string, port: number, trialMode: boolean) {
  const archive = trialMode ? undefined : islandSaveFile(root, port, process.env.MISSION_ISLAND_SAVE)
  let saveFailed = false
  function checkpoint() {
    if (!archive) return
    try {
      archive.write(game.snapshotForSave())
      saveFailed = false
    } catch (error) {
      if (!saveFailed) console.error('Could not save Mission Island:', error)
      saveFailed = true
    }
  }
  let playtest = trialMode ? initialTrial() : undefined
  let game = createGame({ save: archive?.load(), checkpoint, playtest })
  // Saltwind's survey can read the same bank without reserving a Starter Island crew slot.
  middlewares.use('/api/crew-bank', (request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' }).end()
      return
    }
    response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ crewCoins: game.crewCoins }))
  })
  middlewares.use('/api/slatecliff-freight', (request, response) => { void freightHandler(game.freight)(request, response) })
  let sessions = createSocketSessions(game)
  const sockets = new WebSocketServer({ noServer: true, maxPayload: 256 })
  const live = new Set<WebSocket>()
  if (trialMode) middlewares.use('/api/live-checkpoint', (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    const stop = (code: number, text: string) => { res.writeHead(code).end(text) }
    if (req.method !== 'POST') return stop(405, 'Use POST.')
    const seats = sessions.seats()
    if (!seats.some(seat => req.headers.authorization === 'Bearer ' + seat.token)) return stop(403, 'Join the crew first.')
    const args = new URL(req.url ?? '/', 'http://localhost').searchParams
    const settings = checkpointSettings(args.get('checkpoint'), args.get('seats'))
    if (!settings) return stop(400, 'Unknown checkpoint or crew size.')
    if (String(playtest!.revision) !== args.get('revision')) return stop(409, 'Another player already restarted the checkpoint.')
    if (settings.seats === 1 && seats.length > 1) return stop(409, 'Both seats are occupied. Leave one game before starting solo.')
    playtest = { ...settings, revision: playtest!.revision + 1 }
    game = createGame({ playtest })
    // Reserve the connected players’ roles in their existing order while both browsers reconnect.
    for (const seat of seats) {
      const reserved = game.join(seat.token, () => {})
      if (reserved.type === 'joined') reserved.disconnect()
    }
    sessions = createSocketSessions(game)
    for (const socket of sockets.clients) socket.terminate()
    stop(200, 'Checkpoint restarted for the crew.')
  })
  const timer = setInterval(() => sessions.tick(), tickSeconds * 1000)
  const saving = archive && setInterval(checkpoint, 2000)
  const heartbeat = setInterval(() => {
    for (const socket of sockets.clients) {
      if (!live.delete(socket)) socket.terminate()
      else socket.ping()
    }
  }, 10_000)
  sockets.on('connection', (socket) => {
    live.add(socket)
    socket.on('pong', () => live.add(socket))
    socket.on('close', () => live.delete(socket))
    sessions.connect(socket)
  })
  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (request.url !== '/play') return
    const origin = request.headers.origin
    if (origin !== undefined && origin !== `http://${request.headers.host}` &&
      origin !== `https://${request.headers.host}`) {
      socket.destroy()
      return
    }
    sockets.handleUpgrade(request, socket, head, (ws) => sockets.emit('connection', ws))
  })
  server.on('close', () => {
    clearInterval(timer)
    clearInterval(heartbeat)
    clearInterval(saving)
    checkpoint()
    for (const socket of sockets.clients) socket.terminate()
    sockets.close()
  })
}

function serveLanInvites(server: Pick<ViteDevServer, 'middlewares' | 'resolvedUrls'>) {
  server.middlewares.use('/api/lan-invite', (_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    response.end(JSON.stringify(server.resolvedUrls?.network ?? []))
  })
}

export function multiplayer(): Plugin {
  return {
    name: 'mission-island-multiplayer',
    configureServer(server) {
      serveLanInvites(server)
      if (server.httpServer) attachGame(server.httpServer, server.middlewares, server.config.root, server.config.server.port ?? 5173, server.config.mode === 'playtest')
    },
    configurePreviewServer(server) {
      serveLanInvites(server)
      attachGame(server.httpServer, server.middlewares, server.config.root, server.config.preview.port ?? 5173, server.config.mode === 'playtest')
    },
  }
}
