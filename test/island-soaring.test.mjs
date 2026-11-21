import assert from 'node:assert/strict'
import test from 'node:test'
import { aerialSurveys } from '../src/aviation.ts'
import { liftAt } from '../src/simulation/ridge-flight.ts'
import { soaringDetail } from '../src/soaring-guide.ts'
import { groundHeight } from '../src/terrain.ts'
import { liftSites, thermalStrength } from '../src/worlds/starter/lift.ts'
import { soar } from './support/soaring-autopilot.mjs'

// One way to reach each place from the Windstone rack, climbing in natural lift on the way.
const routes = {
  ridge: ['windstone-shoulder'],
  pool: [],
  fernfall: ['windstone-shoulder'],
  juniper: ['windstone-shoulder', 'fernfall-ledges', 'juniper-slope'],
  shellglass: ['windstone-shoulder', 'fernfall-ledges', 'lookout-clearing', 'seabrook-roofs'],
  splitstone: ['windstone-shoulder', 'fernfall-ledges', 'lookout-clearing', 'seabrook-roofs'],
}
const ridgeOnly = id => routes[id].every(lift => liftSites.find(site => site.id === lift).kind === 'ridge')

test('every place found on foot has an aerial survey and a soaring route from the rack', () => {
  assert.deepEqual(Object.keys(routes).sort(), aerialSurveys.map(({ id }) => id).sort())
  for (const { id, site } of aerialSurveys) {
    for (const hour of [9.5, 13, 16.5]) {
      const { spottedAt } = soar(routes[id], site, { conditions: { hour, rain: 0 } })
      assert.ok(spottedAt !== undefined, `${id} is reachable at ${hour}:00`)
    }
  }
})

test('thermals rise only in daylight and weaken in rain, while ridge lift needs only the wind', () => {
  assert.equal(thermalStrength(3, 0), 0)
  assert.equal(thermalStrength(21, 0), 0)
  assert.ok(thermalStrength(13, 0) > .95)
  assert.ok(thermalStrength(13, 1) < .25)
  for (const site of liftSites) {
    const inside = { x: site.x, z: site.z, y: groundHeight(site) + 6 }
    const night = liftAt(inside, { hour: 23, rain: 0 })
    assert.equal(night > 0, site.kind === 'ridge', `${site.id} at night`)
    assert.ok(liftAt(inside, { hour: 13, rain: 0 }) > 2, `${site.id} at midday`)
    assert.equal(liftAt({ ...inside, y: groundHeight(site) + site.ceiling + 1 }, { hour: 13, rain: 0 }), 0, `${site.id} above its ceiling`)
  }
  for (const { id, site } of aerialSurveys) {
    const { spottedAt } = soar(routes[id], site, { conditions: { hour: 23, rain: 0 } })
    if (ridgeOnly(id)) assert.ok(spottedAt !== undefined, `${id} is reachable on ridge lift at night`)
  }
})

test('the soaring readout gives height, the nearest working lift and the next survey', () => {
  const state = { weather: { hour: 13, rain: 0 }, aviation: { aerial: ['pool'], flight: { spotted: ['ridge'] } } }
  const pilot = { x: 39, z: 120, heading: Math.PI, y: groundHeight({ x: 39, z: 120 }) + 9 }
  const text = soaringDetail(state, pilot)
  assert.match(text, /^Height 9 m\./)
  assert.match(text, /Windstone shoulder/)
  assert.match(text, /Survey Fernfall/)
  assert.match(text, new RegExp(`2/${aerialSurveys.length} aerial surveys`))
  const night = soaringDetail({ ...state, weather: { hour: 23, rain: 0 } }, { ...pilot, x: 20, z: 0, y: 9 })
  assert.doesNotMatch(night, /Seabrook rooftops|Island Farm fields/)
})
