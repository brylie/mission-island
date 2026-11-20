import { URL } from 'node:url'
import assert from 'node:assert/strict'
import test from 'node:test'
import { landscapeLink, landscapeWindow, saltwindLink, readLandscapeView, readSaltwindView } from '../src/playtest-link.ts'

const host = 'http://demo:example@192.168.1.10:5173/dev/index.html?save=family#private'
const bench = { focus: [39, 17.65], camera: { target: [39, 1, 17.65], alpha: -1.3, beta: 1.1, radius: 6, fov: .8 },
  hour: 0, rain: 0, time: 0, grid: false, wireframe: true }
const slip = { point: { x: -311, z: -225, y: 3, velocity: 0, grounded: true, swimming: false }, eye: [-311, 7, -211],
  yaw: 3.1, orbit: 3, pitch: .2, arm: 12, time: 128, cycle: .5, speed: 0, site: 'rescue', weather: 'dusk', overview: false,
  tour: { stop: 0, leg: 0, progress: 0, playing: false } }

for (const [name, state, write, read, path] of [
  ['Seabrook bench', bench, landscapeLink, readLandscapeView, 'workbench.html'],
  ['Brinewick Rescue Slip', slip, saltwindLink, readSaltwindView, 'second-island.html'],
]) {
  test(name + ' round trips in an independent LAN URL', () => {
    const url = new URL(write(host, state))
    assert.equal(url.origin, new URL(host).origin)
    assert.equal(url.pathname, '/dev/' + path)
    assert.equal(url.hash, state === bench ? '#landscape' : '')
    assert.equal(url.username, '')
    assert.equal(url.password, '')
    assert.ok(!url.href.includes('family'))
    assert.deepEqual(read(url.searchParams), state)
  })
  test(name + ' ignores partial, unknown-version and invalid camera links', () => {
    const params = new URL(write(host, state)).searchParams
    params.set('view', '9')
    assert.equal(read(params), undefined)
    params.set('view', '1')
    for (const invalid of ['', '0,,8,0', '0,0,Infinity,0', '0,1,-1,0']) {
      params.set('orbit', invalid)
      assert.equal(read(params), undefined)
    }
  })
}

test('landscape bookmarks restore the full island clock inside a bounded scrub window', () => {
  for (const clock of [0, 84, 90, 96, 233.125, 1234567.25]) {
    const url = new URL(landscapeLink(host, { ...bench, time: clock }))
    const { time, start } = landscapeWindow(readLandscapeView(url.searchParams).time)
    assert.ok(time >= 0 && time <= 96)
    assert.equal(time % 48, clock % 48)
    assert.equal(start + time, clock)
  }
})

test('market runoff history can be shared in a fixed landscape camera', () => {
  const state = { ...bench, marketRainAge: 3.2 }
  const params = new URL(landscapeLink(host, state)).searchParams
  assert.deepEqual(readLandscapeView(params), state)
  params.set('runoff', '-1')
  assert.equal(readLandscapeView(params), undefined)
})
