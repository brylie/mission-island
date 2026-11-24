import assert from 'node:assert/strict'
import { test } from 'node:test'
import { graniteBlockFacets } from '../src/granite-blocks.ts'
import { highwoodGraniteRocks, slabCorners } from '../src/highwood-outcrops.ts'
import { seededRandom } from '../src/seeded-random.ts'
import { highwoodSolidTop } from '../src/highwood-solids.ts'
import { groundHeight } from '../src/terrain.ts'
import { clearOfRoutes, inSightline } from '../src/worlds/starter/highwood-clearings.ts'
import { highwoodOutcropPlacement as placement } from '../src/worlds/starter/layout/highwood-outcrops.ts'
import { highwoodPlaces } from '../src/worlds/starter/layout/island-generation.ts'
import { starterRoads } from '../src/worlds/starter/layout/roads.ts'

// Placement is live, so a rebake moves rocks; these bands catch a rule that empties or floods the hills.
const outcropBand = [20, 150]
const walkerPaddingM = 0.35
// How far toward a slab's corner, from its centre, walking must already be blocked.
const cornerShare = 0.85
const slopeSpanM = placement.slopeSpanM
const slopeAt = ({ x, z }) => Math.hypot(
  groundHeight({ x: x + slopeSpanM, z }) - groundHeight({ x: x - slopeSpanM, z }),
  groundHeight({ x, z: z + slopeSpanM }) - groundHeight({ x, z: z - slopeSpanM }),
) / (slopeSpanM + slopeSpanM)
const where = (rock) => `${rock.kind} at ${rock.x.toFixed(0)}, ${rock.z.toFixed(0)}`

test('Highwood\'s granite carries outcrops, with clitter resting below them', () => {
  const rocks = highwoodGraniteRocks()
  const outcrops = rocks.filter((rock) => rock.kind === 'outcrop'), clitter = rocks.filter((rock) => rock.kind === 'clitter')
  assert.ok(outcrops.length >= outcropBand[0] && outcrops.length <= outcropBand[1], `${outcrops.length} outcrops`)
  assert.ok(clitter.length > 0, 'clitter lies below the outcrops')
  // Worked out once, so the host and every screen use the same list.
  assert.equal(highwoodGraniteRocks(), rocks)
  for (const boulder of clitter) {
    assert.ok(slopeAt(boulder) <= placement.clitter.reposeSlope, `${where(boulder)} rests on a slope it would slide off`)
    assert.ok(boulder.source && outcrops.includes(boulder.source) && boulder.source.ground > boulder.ground, `${where(boulder)} lies below the outcrop it fell from`)
  }
})

test('granite rocks keep clear of routes, sight lines and Cairn\'s crown', () => {
  const crown = highwoodPlaces.cairnCrown
  const pad = starterRoads.find((road) => road.id === 'summit-spur').points.at(-1)
  for (const rock of highwoodGraniteRocks()) {
    // Routes, and every graded road: fire road, summit spur, Pine Draw road and the Cairn ridge road.
    assert.ok(clearOfRoutes(rock, placement.routeClearanceM + rock.reach), `${where(rock)} crowds a route or road`)
    assert.ok(!inSightline(rock, rock.reach), `${where(rock)} stands in a sight line`)
    assert.ok(Math.hypot(rock.x - crown.x, rock.z - crown.z) >= placement.keepClear.crownM + rock.reach, `${where(rock)} crowds the crown`)
    assert.ok(Math.hypot(rock.x - pad.x, rock.z - pad.z) >= placement.keepClear.padM + rock.reach, `${where(rock)} crowds the summit pad`)
  }
})

test('granite slabs stand out of the ground and block walking', () => {
  for (const rock of highwoodGraniteRocks()) {
    const [foot] = rock.slabs
    // Clitter may lodge part-buried in the slope; an outcrop's foot slab shows at every corner.
    if (rock.kind === 'outcrop') for (const corner of slabCorners(rock, foot)) assert.ok(groundHeight(corner) < rock.ground + foot.height, `${where(rock)} has a buried corner`)
    assert.ok(highwoodSolidTop(rock, walkerPaddingM) >= rock.ground + foot.height, `${where(rock)} is solid to walkers`)
    // The long ends are solid too, short of the corners the mesh cuts off.
    for (const corner of slabCorners(rock, foot)) {
      const inside = { x: rock.x + (corner.x - rock.x) * cornerShare, z: rock.z + (corner.z - rock.z) * cornerShare }
      assert.ok(highwoodSolidTop(inside, walkerPaddingM) > -Infinity, `${where(rock)}'s end can be walked through`)
    }
  }
})

// A weathered block is many small facets turned every way, not a box: no flat plane
// holds much of its surface, and almost none of it stands as an upright wall.
const minimumDirections = 24
const largestPlaneShare = 0.15
const uprightShare = 0.08
const uprightNormalY = 0.005
const directionStep = 0.02
const capNormalY = 0.95

test('granite rocks are weathered woolsacks, not bevelled boxes', () => {
  for (const rock of highwoodGraniteRocks()) {
    const random = seededRandom(Math.floor(rock.tone * 1e6))
    rock.slabs.forEach((slab, index) => {
      const facets = graniteBlockFacets(rock, slab, index === 0, random)
      const areas = facets.map(({ normal }) => Math.hypot(...normal) / 2)
      const total = areas.reduce((sum, area) => sum + area, 0)
      const planes = new Map()
      let upright = 0
      facets.forEach(({ normal }, k) => {
        const length = Math.hypot(...normal)
        const key = normal.map((value) => Math.round(value / length / directionStep)).join(',')
        planes.set(key, (planes.get(key) ?? 0) + areas[k])
        if (Math.abs(normal[1] / length) < uprightNormalY) upright += areas[k]
        // Outward: a side facet faces away from the block's axis, a cap away from its middle.
        const [a, b, c] = facets[k].corners
        const centroid = [0, 1, 2].map((d) => (a[d] + b[d] + c[d]) / 3)
        const away = Math.abs(normal[1] / length) > capNormalY
          ? normal[1] * (centroid[1] - (rock.ground + slab.base + slab.height / 2))
          : normal[0] * (centroid[0] - rock.x - slab.dx) + normal[2] * (centroid[2] - rock.z - slab.dz)
        assert.ok(away > 0, `${where(rock)} has a facet turned inward`)
      })
      assert.ok(planes.size >= minimumDirections, `${where(rock)} block ${index} faces only ${planes.size} ways`)
      assert.ok(Math.max(...planes.values()) / total < largestPlaneShare, `${where(rock)} block ${index} has a flat face`)
      assert.ok(upright / total < uprightShare, `${where(rock)} block ${index} has upright walls`)
    })
  }
})

test('tors stack off-centre and never taper like pyramids', () => {
  const stacks = highwoodGraniteRocks().filter((rock) => rock.kind === 'outcrop' && rock.slabs.length > 1)
  assert.ok(stacks.some((rock) => rock.slabs.some((slab) => slab.form === 'boulder')), 'some tors carry a perched boulder')
  // In a pyramid every block is centred and smaller than the one below.
  const pyramids = stacks.filter((rock) => rock.slabs.every((slab, k) => k === 0 || (slab.width < rock.slabs[k - 1].width && slab.length < rock.slabs[k - 1].length && Math.hypot(slab.dx - rock.slabs[k - 1].dx, slab.dz - rock.slabs[k - 1].dz) < 0.1 * rock.slabs[k - 1].length)))
  assert.equal(pyramids.length, 0, `${pyramids.length} tors stack as pyramids`)
  assert.ok(stacks.some((rock) => rock.slabs.some((slab, k) => k > 0 && slab.form === 'block' && slab.length > rock.slabs[k - 1].length)), 'some upper blocks are longer than the one below')
})
