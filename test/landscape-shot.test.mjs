import assert from 'node:assert/strict'
import { test } from 'node:test'
import { URL, URLSearchParams } from 'node:url'
import { landscapeShotLink, parseLandscapeShot } from '../src/workbench/landscape-shot.ts'

const shot = {
  version: 1,
  name: 'Pinewoods · dawn & mist',
  camera: { alpha: 0.43, beta: 1.59, radius: 14, fov: .64, target: [-39.7, 4.05, 19.2] },
  time: 11.25,
  options: { clockStart: 192, x: -39.7, z: 19.2, focusHeight: 4.05, hour: 6.4, rain: 0, sunShafts: true, shaftIntensity: 125 },
  grid: false,
  wireframe: true,
}

test('a landscape shot link round-trips its name, framing, timeline and settings', () => {
  const url = new URL(landscapeShotLink('http://localhost:5173/workbench.html?view=harbor-sunset#crew', shot))
  assert.equal(url.search, '')
  assert.equal(url.hash.split('?')[0], '#landscape')
  assert.deepEqual(parseLandscapeShot(new URLSearchParams(url.hash.split('?')[1]).get('shot')), shot)
})

test('landscape shot links reject malformed versions and out-of-bounds cameras', () => {
  for (const payload of [
    'not JSON',
    JSON.stringify({ ...shot, version: 2 }),
    JSON.stringify({ ...shot, options: { clockStart: -1 } }),
    JSON.stringify({ ...shot, camera: { ...shot.camera, fov: 4 } }),
    JSON.stringify({ ...shot, camera: { ...shot.camera, radius: 0 } }),
    JSON.stringify({ ...shot, camera: { ...shot.camera, target: [1, 2] } }),
    JSON.stringify({ ...shot, camera: { ...shot.camera, target: [1, null, 3] } }),
  ]) assert.equal(parseLandscapeShot(payload), undefined)
})
