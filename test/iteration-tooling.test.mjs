import assert from 'node:assert/strict'
import test from 'node:test'
import { URL, URLSearchParams } from 'node:url'
import { capturePresets } from '../src/assets/recipes/capture-presets.ts'
import { orbitFromEye, planCaptures, readCaptureOptions } from '../src/capture-plan.ts'
import { debugOverlays } from '../src/debug-overlays/catalog.ts'
import { fireWatchSees } from '../src/debug-overlays/live-layers.ts'
import { createOverlayRegistry, fieldLayer, mixHex } from '../src/debug-overlays/registry.ts'
import { devViewParams, readDevView } from '../src/dev-view.ts'
import { readLandscapeView } from '../src/playtest-link.ts'
import { groundHeight } from '../src/terrain.ts'
import { spreadCandidates } from '../src/wildfire.ts'
import { starterFireSites } from '../src/worlds/starter/layout/fire-sites.ts'
import { readSimOptions } from '../server/sim/options.ts'
import { runSimulation } from '../server/sim/runner.ts'
import { simulateSeed } from '../server/sim/sweep.ts'
import { summarizeSweep } from '../server/sim/summary.ts'

const base = 'http://127.0.0.1:5999/'

test('capture options default to every preset in all three modes and reject unknown input', () => {
  const options = readCaptureOptions({})
  assert.deepEqual(options.presets, Object.keys(capturePresets))
  assert.deepEqual(options.modes, ['color', 'greyscale', 'silhouette'])
  assert.deepEqual(readCaptureOptions({ preset: 'ridge-to-harbor', mode: 'silhouette' }).modes, ['silhouette'])
  assert.throws(() => readCaptureOptions({ preset: 'nowhere' }), /Unknown preset "nowhere"/)
  assert.throws(() => readCaptureOptions({ mode: 'sepia' }), /Unknown mode/)
  assert.throws(() => readCaptureOptions({ hour: '25' }), /--hour/)
  assert.throws(() => readCaptureOptions({ seed: '1.5' }), /--seed must be a whole number/)
  assert.throws(() => readCaptureOptions({ weather: 'hail' }), /--weather/)
  assert.throws(() => readCaptureOptions({ overlay: 'moisture' }), /Unknown overlay "moisture"/)
  assert.throws(() => readCaptureOptions({ compare: 'main' }), /two runs/)
  assert.deepEqual(readCaptureOptions({ compare: 'main,HEAD' }).compare, ['main', 'HEAD'])
})

test('every landscape preset opens a valid Workbench view with the eye where the preset puts it', () => {
  const shots = planCaptures(base, readCaptureOptions({ mode: 'greyscale' })).filter(({ meta }) => meta.angle === undefined && meta.weather)
  assert.ok(shots.length >= 5)
  for (const shot of shots) {
    const url = new URL(shot.url)
    const view = readLandscapeView(url.searchParams)
    assert.ok(view, `${shot.name} must parse as a landscape view`)
    const dev = readDevView(url.searchParams)
    assert.equal(dev.mode, 'greyscale')
    assert.equal(dev.capture, true)
    assert.equal(dev.perf, true)
    const preset = capturePresets[shot.preset]
    const { target, alpha, beta, radius } = view.camera
    const eye = [target[0] + radius * Math.cos(alpha) * Math.sin(beta), target[1] + radius * Math.cos(beta), target[2] + radius * Math.sin(alpha) * Math.sin(beta)]
    assert.ok(Math.abs(eye[0] - preset.eye.x) < 1e-3 && Math.abs(eye[2] - preset.eye.z) < 1e-3, shot.name)
    assert.ok(Math.abs(eye[1] - groundHeight(preset.eye) - preset.eye.height) < 1e-3, shot.name)
  }
})

test('capture flags override a preset hour, weather and seed', () => {
  const [shot] = planCaptures(base, readCaptureOptions({ preset: 'tower-dawn-north', mode: 'color', hour: '19', weather: 'rain', seed: '42' }))
  const view = readLandscapeView(new URL(shot.url).searchParams)
  assert.equal(view.hour, 19)
  assert.equal(view.rain, shot.meta.rain)
  assert.equal(view.time, 42)
  assert.equal(shot.meta.weather, 'rain')
})

test('a specimen grid renders each seed at eight evenly spaced angles', () => {
  const shots = planCaptures(base, readCaptureOptions({ preset: 'specimen-tussock', mode: 'color', grid: true, seed: '10' }))
  assert.equal(shots.length, capturePresets['specimen-tussock'].seeds * 8)
  assert.deepEqual([...new Set(shots.map(({ meta }) => meta.seed))], [10, 11, 12, 13])
  const setup = JSON.parse(new URLSearchParams(new URL(shots[9].url).hash.split('?')[1]).get('setup'))
  assert.equal(setup.options.seed, 11)
  assert.ok(Math.abs(setup.camera.alpha - Math.PI / 4) < 1e-9)
})

test('orbitFromEye looks from the eye toward the look point', () => {
  const orbit = orbitFromEye({ x: 0, z: -10, height: 2 }, { x: 0, z: 0, height: 2 }, 1)
  assert.ok(Math.abs(Math.sin(orbit.alpha) + 1) < 1e-9)
})

test('the dev view reads only with dev=1 and rejects malformed requests', () => {
  assert.equal(readDevView(new URLSearchParams('devcam=1,2,3,0,1,10,0.8')), undefined)
  const params = devViewParams({ camera: { target: [1, 2, 3], alpha: 0.5, beta: 1, radius: 10, fov: 0.8 }, sky: { hour: 6, rain: 0.2 }, overlays: ['slope', 'animals'], perf: true, capture: false, mode: 'silhouette' })
  assert.deepEqual(readDevView(params), { camera: { target: [1, 2, 3], alpha: 0.5, beta: 1, radius: 10, fov: 0.8 }, sky: { hour: 6, rain: 0.2 }, overlays: ['slope', 'animals'], perf: true, capture: false, mode: 'silhouette' })
  assert.throws(() => readDevView(new URLSearchParams('dev=1&devcam=1,2,3')), /Expected 7/)
  assert.throws(() => readDevView(new URLSearchParams('dev=1&devsky=30,0')), /must be from 0 to 24/)
  assert.throws(() => readDevView(new URLSearchParams('dev=1&overlay=slope,bogus')), /Unknown overlay: bogus/)
  assert.throws(() => readDevView(new URLSearchParams('dev=1&mode=sepia')), /Render mode/)
})

test('the overlay registry has unique layers that sample with and without a live host', () => {
  assert.throws(() => createOverlayRegistry([debugOverlays.layers[0], debugOverlays.layers[0]]), /unique/)
  assert.deepEqual(debugOverlays.read('slope, wildfire,slope,nope'), { ids: ['slope', 'wildfire'], unknown: ['nope'] })
  const site = starterFireSites[0]
  const fire = { id: 1, site: site.id, size: 'patch', startedAt: 0, located: false, hotspots: site.hotspots.slice(0, 3).map(([dx, dz], i) => ({ x: site.x + dx, z: site.z + dz, heat: i ? 0 : 0.6, peak: 0.8, caught: !i })) }
  const state = { islandTime: 100, events: { seed: 1, nextFireAt: null, fire, firesOut: 0 }, juniper: { hares: [{ x: 1, z: 2, heading: 0, behavior: 'grazing' }], foxes: [{ x: -1, z: 0, heading: 1, behavior: 'patrolling' }], clover: [] } }
  for (const layer of debugOverlays.layers) {
    const sample = layer.create()
    for (const primitive of [...sample({ islandTime: 100 }), ...sample({ islandTime: 100, state })]) {
      assert.match(primitive.color, /^#[0-9a-f]{6}$/i, layer.id)
      assert.ok(primitive.kind === 'line' ? primitive.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.z)) : Number.isFinite(primitive.x), layer.id)
    }
  }
  assert.ok(debugOverlays.get('wildfire').create()({ islandTime: 100, state }).some((p) => p.kind === 'ring' && p.color === '#7048e8'), 'the next hotspot is marked')
  assert.ok(debugOverlays.get('animals').create()({ islandTime: 0, state }).length > 0)
})

test('a field layer turns any scalar sampler into ramp-coloured cells', () => {
  const layer = fieldLayer({ id: 'moisture', label: 'Moisture', description: '', bounds: { west: 0, east: 4, south: 0, north: 2 }, cellM: 2, sample: ({ x }) => x > 3 ? undefined : x, ramp: [[0, '#000000'], [2, '#ffffff']] })
  const cells = layer.create()({ islandTime: 0 })
  assert.equal(cells.length, 4)
  assert.deepEqual(cells.map(({ color }) => color), ['#000000', '#000000', '#ffffff', '#ffffff'])
  assert.equal(mixHex('#000000', '#ffffff', 0.5), '#808080')
})

test('spread candidates score downwind hotspots without touching the event seed', () => {
  const site = starterFireSites[0]
  const fire = { id: 1, site: site.id, size: 'blaze', startedAt: 0, located: true, hotspots: site.hotspots.map(([dx, dz], i) => ({ x: site.x + dx, z: site.z + dz, heat: i ? 0 : 1, peak: 1, caught: !i })) }
  const east = spreadCandidates(fire, { x: 1, z: 0 })
  const best = east.reduce((a, b) => b.score > a.score ? b : a)
  assert.ok(best.spot.x > site.x, 'an east wind favours an eastern hotspot')
  assert.ok(typeof fireWatchSees(site) === 'boolean')
})

test('sim options validate scenarios, seed ranges and crews', () => {
  const options = readSimOptions({ scenario: 'fire-watch', seeds: '1..100', days: '2', crew: 'scripted' })
  assert.equal(options.seeds.length, 100)
  assert.equal(options.seeds[99], 100)
  assert.deepEqual(readSimOptions({ scenario: 'fire-watch', seeds: '3,1,2' }).seeds, [3, 1, 2])
  assert.throws(() => readSimOptions({ scenario: 'nowhere' }), /Choose --scenario/)
  assert.throws(() => readSimOptions({ scenario: 'fire-watch', seeds: '1,1' }), /once/)
  assert.throws(() => readSimOptions({ scenario: 'fire-watch', seeds: '-1' }), /Seeds must be/)
  assert.throws(() => readSimOptions({ scenario: 'fire-watch', days: '0' }), /--days/)
  assert.throws(() => readSimOptions({ scenario: 'fire-watch', crew: 'robots' }), /--crew/)
})

const shortRun = { scenario: 'fire-watch', days: 0.03, crew: 'scripted' }

test('the same seed gives the same events and summary, and a replay reproduces them', () => {
  const first = simulateSeed({ ...shortRun, seed: 7 })
  const second = simulateSeed({ ...shortRun, seed: 7 })
  assert.deepEqual(second.lines, first.lines)
  assert.deepEqual(summarizeSweep([second.summary], second.ticks), summarizeSweep([first.summary], first.ticks))
  assert.ok(first.lines.some((line) => JSON.parse(line).type === 'fire-started'))
  assert.ok(first.inputs.length > 0, 'a scripted crew records its inputs')
  const replay = simulateSeed({ ...shortRun, seed: 7 }, first.inputs)
  assert.deepEqual(replay.lines, first.lines)
})

test('every sim event carries its seed, tick and island hour', () => {
  const events = []
  runSimulation({ ...shortRun, crew: 'idle', seed: 3 }, (event) => void events.push(event))
  assert.ok(events.length > 0)
  for (const event of events) {
    assert.equal(event.seed, 3)
    assert.ok(Number.isInteger(event.tick) && Number.isFinite(event.hour) && typeof event.type === 'string')
  }
})
