import assert from 'node:assert/strict'
import { test } from 'node:test'
import { rockBlockFacets } from '../src/granite-blocks.ts'
import { highwoodGraniteRocks } from '../src/highwood-outcrops.ts'
import { stepPlayerOnTerrain } from '../src/simulation/movement.ts'
import { walkingHeight } from '../src/terrain.ts'
import { jumpSpeed } from '../src/world.ts'

// A walker meets Highwood's granite through the real movement step: the drawn woolsack
// stops them at its side, and they can climb a tor by jumping from block to block.

const tick = 1 / 30
const approachM = 4
const arrivedM = 0.25
const walkTicks = 150
// How far short of the drawn rock a walker may stop: their probe radius plus a little gap.
const stopShortM = 0.6
const levelM = 0.01
const crossGrain = Math.PI / 2

function walker(point) {
  const player = { ...point, y: walkingHeight(point), heading: 0, grounded: true, onBed: false, swimming: false }
  return { player, verticalSpeed: 0 }
}

function walk(motion, goal, jumping) {
  for (let step = 0; step < walkTicks; step++) {
    const { player } = motion
    const dx = goal.x - player.x, dz = goal.z - player.z, length = Math.hypot(dx, dz)
    if (length < arrivedM) return
    if (jumping && player.grounded) {
      motion.verticalSpeed = jumpSpeed
      player.grounded = false
    }
    stepPlayerOnTerrain(motion, [], { x: dx / length, z: dz / length, spray: false, careful: false, sprint: false }, false, tick, () => -Infinity)
  }
}

// The drawn rock's nearest point to the walker, in plan, among the block's points above its base.
function drawnGap(rock, index, point) {
  const slab = rock.slabs[index]
  let nearest = Infinity
  for (const { corners } of rockBlockFacets(rock, index)) {
    for (const [x, y, z] of corners) if (y >= rock.ground + slab.base) nearest = Math.min(nearest, Math.hypot(x - point.x, z - point.z))
  }
  return nearest
}

// A two-block tor on a crest, low enough at its side to jump onto.
const tor = highwoodGraniteRocks().find((rock) => {
  if (rock.kind !== 'outcrop' || rock.slabs.length < 2 || rock.slabs[1].form !== 'block') return false
  const [foot] = rock.slabs, side = foot.heading + crossGrain
  const start = { x: rock.x + Math.cos(side) * approachM, z: rock.z + Math.sin(side) * approachM }
  return rock.ground + foot.height - walkingHeight(start) < 1
})

test('a walker stops at a woolsack\'s drawn side and climbs a tor block by block', () => {
  assert.ok(tor, 'a low two-block tor stands somewhere on Highwood')
  const [foot, upper] = tor.slabs, side = foot.heading + crossGrain
  const start = { x: tor.x + Math.cos(side) * approachM, z: tor.z + Math.sin(side) * approachM }
  const centre = { x: tor.x + foot.dx, z: tor.z + foot.dz }

  const blocked = walker(start)
  walk(blocked, centre, false)
  const gap = drawnGap(tor, 0, blocked.player)
  assert.ok(gap > 0 && gap < stopShortM, `stopped ${gap.toFixed(2)} m from the drawn rock`)

  const climber = walker(start)
  walk(climber, centre, true)
  walk(climber, { x: tor.x + upper.dx, z: tor.z + upper.dz }, true)
  // Let the last jump land.
  walk(climber, climber.player, false)
  for (let step = 0; step < walkTicks && !climber.player.grounded; step++) stepPlayerOnTerrain(climber, [], { x: 0, z: 0, spray: false, careful: false, sprint: false }, false, tick, () => -Infinity)
  // On top of the upper block, or of a higher one it climbed on to.
  const tops = tor.slabs.map((slab) => tor.ground + slab.base + slab.height)
  const standing = climber.player.y
  assert.ok(tops.some((top) => Math.abs(standing - top) < levelM) && standing >= tops[1] - levelM, `stands at ${standing.toFixed(2)}, not on a block from the second up`)
})
