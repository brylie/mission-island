import assert from 'node:assert/strict'
import { test } from 'node:test'
import { culvertModel } from '../src/assets/geometry/culverts.ts'
import { planCulverts } from '../src/assets/culvert-plan.ts'
import { roadClearance, roadCulverts, roadEarthworks, roadSurfaceSource } from '../src/terrain.ts'

const roads = { clearance: roadClearance, carriageway: (point) => roadSurfaceSource.fieldsAt(point).carriageway, earthworks: roadEarthworks }

test('every culvert with an outlet has an outlet structure below the road, apart from its inlet', () => {
  const culverts = roadCulverts()
  const ends = planCulverts(culverts, roads)
  const missing = []
  culverts.forEach((culvert, index) => {
    if (!culvert.outlet) return
    const outlet = ends.find((end) => end.culvert === index && end.kind === 'outlet')
    // A shared outlet: another culvert's outlet structure stands where this one's would.
    const shared = ends.some((end) => end.kind === 'outlet' && end.culvert !== index && Math.hypot(end.at.x - culvert.outlet.x, end.at.z - culvert.outlet.z) < culvertModel.shareM + culvertModel.searchM)
    if (!outlet && !shared) missing.push(`${culvert.road} at ${culvert.along.toFixed(0)} m`)
    if (outlet) assert.ok(Math.hypot(outlet.at.x - culvert.inlet.x, outlet.at.z - culvert.inlet.z) > culvertModel.shareM, `${culvert.road} at ${culvert.along.toFixed(0)} m: outlet on its inlet`)
  })
  assert.deepEqual(missing, [])
  // Every end stands off the carriageway.
  assert.deepEqual(ends.filter((end) => roads.carriageway(end.at) <= 0).map((end) => end.kind), [])
})
