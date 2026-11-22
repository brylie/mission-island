import type { ClientMessage, ServerMessage } from './protocol.ts'

const reconnectDelayMs = 1200

export function createIslandConnection(joinToken: () => string, receive: (message: ServerMessage) => void, disconnected: () => void) {
  let socket: WebSocket | undefined

  function send(message: ClientMessage) {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
  }

  function connect() {
    const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const connection = socket = new WebSocket(`${scheme}//${location.host}/play`)
    connection.addEventListener('open', () => send({ type: 'join', token: joinToken() }))
    connection.addEventListener('message', (event: MessageEvent<string>) => receive(JSON.parse(event.data) as ServerMessage))
    connection.addEventListener('close', () => {
      disconnected()
      setTimeout(connect, reconnectDelayMs)
    })
  }

  return {
    get started() { return Boolean(socket) },
    connect,
    send,
    close() { socket?.close() },
  }
}
