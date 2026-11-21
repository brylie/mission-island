import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { EventEmitter } from 'node:events'
import { createGame } from '../../server/game.ts'
import { createSocketSessions } from '../../server/socket-sessions.ts'
import { groundHeight } from '../../src/terrain.ts'
import { crewHomes, spawns } from '../../src/world.ts'

export const tokens = ['a'.repeat(32), 'b'.repeat(32), 'c'.repeat(32)]

export class GameClient extends EventEmitter {
  readyState = 1
  bufferedAmount = 0
  messages = []
  send(raw) {
    const message = JSON.parse(raw)
    if (message.type === 'state') this.state = message
    else this.messages.push(message)
  }

  request(type, extra = {}) { this.emit('message', Buffer.from(JSON.stringify({ type, ...extra }))) }
  close() {
    this.readyState = 3
    this.emit('close')
  }

  terminate() { this.close() }
  get player() {
    const id = this.messages.find(({ type }) => type === 'welcome')?.id
    return this.state.players.find((player) => player.id === id)
  }
}

export function player(id, point = spawns[id], overrides = {}) {
  return {
    ...point,
    id,
    heading: 0,
    y: groundHeight(point),
    grounded: true,
    onBed: false,
    reaching: false,
    rightHandRaised: false,
    connected: true,
    sleeping: false,
    seat: null,
    inventory: [],
    equipped: null,
    goods: { fish: 0, carrots: 0 },
    seeds: 0,
    charge: null,
    casting: null,
    throwing: false,
    rowing: false,
    ownsAngler: false,
    ...overrides,
  }
}

export function setup(t, { saved, players = [], arrange = () => {}, random = () => 0 } = {}) {
  let time = 10000
  const checkpoint = t.mock.fn(() => game.snapshotForSave())
  const save = saved ?? createGame().snapshotForSave()
  if (!saved) save.crew = players.map((entry, index) => ({ token: tokens[index], player: entry, reserved: true }))
  arrange(save)
  const game = createGame({ save, clock: () => time, random, checkpoint })
  const sessions = createSocketSessions(game)
  const sockets = []
  t.after(() => sockets.forEach((socket) => socket.close()))
  function advance(ticks = 1) {
    for (let i = 0; i < ticks; i++) {
      time += 1000 / 30
      sessions.tick()
    }
  }
  function link() {
    const socket = new GameClient()
    sockets.push(socket)
    sessions.connect(socket)
    return socket
  }
  function join(token) {
    const socket = link()
    socket.request('join', { token })
    advance()
    return socket
  }
  function input(socket, request = {}) {
    socket.request('input', { input: { x: 0, z: 0, ...request } })
  }
  function hold(socket, ticks, request = {}) {
    for (let i = 0; i < ticks; i++) {
      if (i % 6 === 0) input(socket, request)
      advance()
    }
  }
  function click(socket, aim) {
    input(socket)
    socket.request('primary', { phase: 'start' })
    socket.request('primary', { phase: 'release', aim })
    advance()
  }
  function elapse(milliseconds) {
    time += milliseconds
    advance()
  }
  function advanceUntil(condition, limit = 2900) {
    for (let i = 0; i < limit && !condition(); i++) advance()
    assert.ok(condition(), 'The expected game state was not reached before the tick limit')
  }
  return { game, advance, advanceUntil, elapse, link, join, input, hold, click, checkpoint }
}

export function door(id) {
  const { x, z, d } = crewHomes[id].building
  return { x, z: z - d / 2 - 0.75 }
}
