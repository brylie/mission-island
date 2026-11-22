import assert from 'node:assert/strict'
import test from 'node:test'
import { createIslandConnection } from '../src/island-connection.ts'

const { Event, EventTarget, MessageEvent } = globalThis

test('the connection rejoins with the current token and delivers notices in order', (t) => {
  const sockets = []
  const messages = []
  const scheduled = []
  const globals = {
    location: { protocol: 'https:', host: 'island.example' },
    WebSocket: class extends EventTarget {
      static OPEN = 1
      readyState = 0
      sent = []

      constructor(url) {
        super()
        this.url = url
        sockets.push(this)
      }

      send(json) { this.sent.push(JSON.parse(json)) }
      close() { this.dispatchEvent(new Event('close')) }
    },
    setTimeout(callback, delay) { scheduled.push({ callback, delay }) },
  }
  for (const [key, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key)
    Object.defineProperty(globalThis, key, { configurable: true, value })
    t.after(() => original ? Object.defineProperty(globalThis, key, original) : Reflect.deleteProperty(globalThis, key))
  }

  let token = 'old-token'
  const connection = createIslandConnection(() => token, (notice) => {
    messages.push(notice.type)
    if (notice.type === 'duplicate') token = 'new-token'
  }, () => messages.push('disconnected'))

  assert.equal(connection.started, false)
  connection.connect()
  assert.equal(connection.started, true)
  const [first] = sockets
  assert.equal(first.url, 'wss://island.example/play')
  connection.send({ type: 'respawn' })
  assert.deepEqual(first.sent, [])
  first.readyState = globals.WebSocket.OPEN
  first.dispatchEvent(new Event('open'))
  assert.deepEqual(first.sent, [{ type: 'join', token: 'old-token' }])
  first.dispatchEvent(new MessageEvent('message', { data: '{"type":"duplicate"}' }))
  connection.close()
  assert.deepEqual(messages, ['duplicate', 'disconnected'])
  assert.equal(scheduled[0].delay, 1200)
  scheduled[0].callback()
  const [, second] = sockets
  second.readyState = globals.WebSocket.OPEN
  second.dispatchEvent(new Event('open'))
  assert.deepEqual(second.sent, [{ type: 'join', token: 'new-token' }])
})
