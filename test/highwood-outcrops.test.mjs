import assert from 'node:assert/strict'
import { test } from 'node:test'
import { highwoodGraniteRocks, slabCorners } from '../src/highwood-outcrops.ts'
import { highwoodSolidTop } from '../src/highwood-solids.ts'
import { groundHeight } from '../src/terrain.ts'
import { clearOfRoutes, inSightline } from '../src/worlds/starter/highwood-clearings.ts'
import { highwoodOutcropPlacement as placement } from '../src/worlds/starter/layout/highwood-outcrops.ts'
import { highwoodPlaces } from '../src/worlds/starter/layout/island-generation.ts'

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
  for (const rock of highwoodGraniteRocks()) {
    // Routes, and every graded road: fire road, summit spur, Pine Draw road and the Cairn ridge road.
    assert.ok(clearOfRoutes(rock, placement.routeClearanceM + rock.reach), `${where(rock)} crowds a route or road`)
    assert.ok(!inSightline(rock, rock.reach), `${where(rock)} stands in a sight line`)
    assert.ok(Math.hypot(rock.x - crown.x, rock.z - crown.z) >= placement.keepFromCrownM + rock.reach, `${where(rock)} crowds the crown`)
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
