import assert from 'node:assert/strict'
import { test } from 'node:test'
import { gullsPerLift, thermalGullAt } from '../src/gull-thermals.ts'
import { liftAt } from '../src/simulation/ridge-flight.ts'
import { groundHeight } from '../src/terrain.ts'
import { liftSites } from '../src/worlds/starter/lift.ts'

const birds = liftSites.flatMap((site, siteIndex) => Array.from({ length: gullsPerLift }, (_, index) => ({ site, siteIndex, index })))
const count = (weather, time = 0) => birds.filter(({ site, siteIndex, index }) => thermalGullAt(time, siteIndex, site, index, weather)).length

test('a circling gull always marks air that would lift a wing, and glides smoothly through its turns', () => {
  for (const weather of [{ hour: 10, rain: 0 }, { hour: 13, rain: 0 }, { hour: 16, rain: 0 }]) {
    for (const { site, siteIndex, index } of birds) {
      let previous
      for (let time = 0; time < 200; time += .05) {
        const gull = thermalGullAt(time, siteIndex, site, index, weather)
        if (!gull) {
          previous = undefined
          continue
        }
        assert.ok(liftAt({ ...gull, heading: gull.heading }, weather) > 0, `${site.name} gull ${index} at ${time}s`)
        assert.ok(gull.y - groundHeight(site) >= 4.9)
        if (previous) {
          const dx = gull.x - previous.x, dz = gull.z - previous.z
          const travel = Math.hypot(dx, dz)
          assert.ok(travel < .4)
          assert.ok((Math.sin(gull.heading) * dx + Math.cos(gull.heading) * dz) / travel > .9)
          assert.ok(Math.abs(gull.y - previous.y) < .1)
        }
        previous = gull
      }
    }
  }
})

test('gulls leave the lift in heavy rain and at night, and thin out over weak morning and showery thermals', () => {
  assert.equal(count({ hour: 13, rain: 0 }), birds.length)
  assert.equal(count({ hour: 13, rain: .8 }), 0)
  assert.equal(count({ hour: 20, rain: 0 }), 0)
  assert.equal(count({ hour: 6.5, rain: 0 }), 0)
  const ridges = liftSites.filter(({ kind }) => kind === 'ridge').length * gullsPerLift
  const thermals = birds.length - ridges
  // One gull rides each early or showery thermal. The ridges keep both because the wind still blows.
  assert.equal(count({ hour: 7.2, rain: 0 }), ridges + thermals / 2)
  assert.equal(count({ hour: 13, rain: .55 }), ridges + thermals / 2)
})

test('a gull joins or leaves a thermal only near the top of its climb', () => {
  // A whole island day compressed to 40 minutes of flight, so thermals switch on and off.
  const weatherAt = time => ({ hour: 7 + time / 240, rain: 0 })
  for (const { site, siteIndex, index } of birds) {
    let previous
    for (let time = 0; time < 2400; time += .5) {
      const gull = thermalGullAt(time, siteIndex, site, index, weatherAt(time), weatherAt)
      const shown = gull ?? previous
      if (Boolean(gull) !== Boolean(previous) && shown) assert.ok(shown.y - groundHeight(site) > 10, `${site.name} ${time}`)
      previous = gull
    }
  }
})
